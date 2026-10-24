<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use App\Http\Resources\UserResource;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()->with(['roles', 'currentTeam']);

        if ($request->has('role')) {
            $query->role($request->input('role'));
        }

        if ($request->filled('team')) {
            $teamVal = $request->input('team');
            $query->where(function ($q) use ($teamVal) {
                $q->whereHas('currentTeam', function ($tq) use ($teamVal) {
                    $tq->where('teams.id', $teamVal)->orWhere('teams.name', $teamVal);
                })->orWhere('team', $teamVal);
            });
        }

        $query->filterAndSort($request, ['name', 'email', 'phone']);

        return UserResource::collection($query->paginate($request->input('per_page', 15)));
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Password::defaults()],
            'role' => 'required|exists:roles,name',
            'phone' => 'nullable|string|max:25',
            'team' => 'nullable|string|max:50',
            'coverage_areas' => 'nullable|array',
            'coverage_areas.*' => 'string',
            'max_active_complaints' => 'nullable|integer|min:1|max:50',
            'availability' => 'nullable|in:active,off_duty,on_leave',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'team' => $validated['team'] ?? null,
            'coverage_areas' => $validated['coverage_areas'] ?? null,
            'max_active_complaints' => $validated['max_active_complaints'] ?? 5,
            'availability' => $validated['availability'] ?? 'active',
        ]);

        $user->assignRole($validated['role']);

        activity()->causedBy($request->user())->log("User {$user->name} created by {$request->user()->name}");

        return (new UserResource($user->load(['roles', 'currentTeam'])))
            ->additional(['message' => 'User created successfully'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(User $user)
    {
        $this->authorize('view', $user);

        return new UserResource($user->load(['roles', 'currentTeam', 'permissions']));
    }

    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,'.$user->id,
            'password' => ['nullable', Password::defaults()],
            'role' => 'sometimes|exists:roles,name',
            'phone' => 'nullable|string|max:25',
            'team' => 'nullable|string|max:50',
            'coverage_areas' => 'nullable|array',
            'coverage_areas.*' => 'string',
            'max_active_complaints' => 'nullable|integer|min:1|max:50',
            'availability' => 'nullable|in:active,off_duty,on_leave',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if (array_key_exists('phone', $validated)) {
            $user->phone = $validated['phone'];
        }

        if (array_key_exists('team', $validated)) {
            $user->team = $validated['team'];
        }

        if (array_key_exists('coverage_areas', $validated)) {
            $user->coverage_areas = $validated['coverage_areas'];
        }

        if (array_key_exists('max_active_complaints', $validated)) {
            $user->max_active_complaints = $validated['max_active_complaints'];
        }

        if (array_key_exists('availability', $validated)) {
            $user->availability = $validated['availability'];
        }

        $user->save();

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        activity()->causedBy($request->user())->log("User {$user->name} updated by {$request->user()->name}");

        return (new UserResource($user->load(['roles', 'currentTeam'])))
            ->additional(['message' => 'User updated successfully'])
            ->response();
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 400);
        }

        $userName = $user->name;
        $user->delete();

        activity()->causedBy(auth()->user())->log("User {$userName} deleted by ".auth()->user()->name);

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'status' => 'required|in:active,inactive',
        ]);

        if ($validated['status'] === 'inactive') {
            if ($user->id === auth()->id()) {
                return response()->json(['message' => 'Cannot deactivate yourself'], 400);
            }

            if ($user->hasRole('Superadmin')) {
                $superadminCount = User::role('Superadmin')->where('status', 'active')->count();
                if ($superadminCount <= 1) {
                    return response()->json(['message' => 'Cannot deactivate the last active superadmin'], 400);
                }
            }

            // Revoke all tokens so they cannot access protected resources
            $user->tokens()->delete();
        }

        $user->status = $validated['status'];
        $user->save();

        activity()->causedBy($request->user())->log("User {$user->name} status changed to {$user->status} by {$request->user()->name}");

        return response()->json([
            'message' => 'User status updated successfully',
            'data' => $user->load('roles'),
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        // Generate a secure temporary password (16 chars, letters, numbers, symbols)
        $password = Str::password(16, true, true, true, false);

        $user->password = Hash::make($password);
        $user->save();

        activity()->causedBy($request->user())->log("Password reset performed for User {$user->name} by {$request->user()->name}");

        return response()->json([
            'message' => 'Password reset successfully',
            'password' => $password,
        ]);
    }

    public function roles(): JsonResponse
    {
        Gate::authorize('manage_roles');

        $roles = Role::with('permissions')->get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
                'user_count' => $role->users()->count(),
            ];
        });

        return response()->json([
            'data' => $roles,
        ]);
    }

    public function permissions(): JsonResponse
    {
        Gate::authorize('manage_roles');

        $permissions = Permission::select('id', 'name')->get();

        return response()->json([
            'data' => $permissions,
        ]);
    }

    public function activity(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);

        $query = Activity::where(function ($q) use ($user) {
            $q->where('causer_type', get_class($user))
                ->where('causer_id', $user->id)
                ->orWhere(function ($sq) use ($user) {
                    $sq->where('subject_type', get_class($user))
                        ->where('subject_id', $user->id);
                });
        });

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('log_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('sort_by')) {
            $sortBy = $request->input('sort_by');
            $sortOrder = strtolower($request->input('sort_order') ?? 'asc') === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->latest();
        }

        $activities = $query->paginate(15);

        return response()->json($activities);
    }
}
