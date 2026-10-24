<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    /**
     * GET /api/superadmin/teams
     * Daftar semua team (Team A, B, C, D, dst) beserta anggota di dalamnya.
     */
    public function index(Request $request): JsonResponse
    {
        $teams = Team::orderBy('order_index', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($team) {
                $members = User::where('team', $team->name)
                    ->with('roles')
                    ->get(['id', 'name', 'email', 'phone', 'status', 'team', 'coverage_areas']);

                return [
                    'id' => $team->id,
                    'name' => $team->name,
                    'order_index' => $team->order_index,
                    'is_active' => (bool) $team->is_active,
                    'members_count' => $members->count(),
                    'members' => $members,
                    'created_at' => $team->created_at,
                    'updated_at' => $team->updated_at,
                ];
            });

        // Daftar user yang belum memiliki team (unassigned)
        $unassignedUsers = User::whereNull('team')
            ->orWhere('team', '')
            ->with('roles')
            ->get(['id', 'name', 'email', 'phone', 'status', 'team']);

        return response()->json([
            'data' => $teams,
            'unassigned_users' => $unassignedUsers,
        ]);
    }

    /**
     * POST /api/superadmin/teams
     * Tambah team baru (misal Team E).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:teams,name',
            'order_index' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $maxOrder = Team::max('order_index') ?? 0;

        $team = Team::create([
            'name' => $validated['name'],
            'order_index' => $validated['order_index'] ?? ($maxOrder + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        activity()->causedBy($request->user())->log("Team {$team->name} created by {$request->user()->name}");

        return response()->json([
            'message' => "Team '{$team->name}' berhasil dibuat.",
            'data' => $team,
        ], 201);
    }

    /**
     * GET /api/superadmin/teams/{team}
     */
    public function show(Team $team): JsonResponse
    {
        $members = User::where('team', $team->name)
            ->with('roles')
            ->get(['id', 'name', 'email', 'phone', 'status', 'team', 'coverage_areas']);

        return response()->json([
            'data' => [
                'id' => $team->id,
                'name' => $team->name,
                'order_index' => $team->order_index,
                'is_active' => (bool) $team->is_active,
                'members_count' => $members->count(),
                'members' => $members,
                'created_at' => $team->created_at,
                'updated_at' => $team->updated_at,
            ],
        ]);
    }

    /**
     * PUT /api/superadmin/teams/{team}
     * Edit nama / urutan team.
     */
    public function update(Request $request, Team $team): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('teams')->ignore($team->id)],
            'order_index' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $oldName = $team->name;
        $newName = $validated['name'];

        $team->update([
            'name' => $newName,
            'order_index' => $validated['order_index'] ?? $team->order_index,
            'is_active' => $validated['is_active'] ?? $team->is_active,
        ]);

        // Jika nama team berubah, update string team pada user-user terkait
        if ($oldName !== $newName) {
            User::where('team', $oldName)->update(['team' => $newName]);
        }

        activity()->causedBy($request->user())->log("Team {$oldName} updated to {$newName} by {$request->user()->name}");

        return response()->json([
            'message' => 'Team berhasil diperbarui.',
            'data' => $team,
        ]);
    }

    /**
     * PATCH /api/superadmin/teams/{team}/toggle
     * Toggle status aktif / non-aktif team.
     */
    public function toggle(Request $request, Team $team): JsonResponse
    {
        $team->update(['is_active' => ! $team->is_active]);

        $statusStr = $team->is_active ? 'diaktifkan' : 'dinonaktifkan';
        activity()->causedBy($request->user())->log("Team {$team->name} status changed to {$statusStr} by {$request->user()->name}");

        return response()->json([
            'message' => "Team '{$team->name}' berhasil {$statusStr}.",
            'is_active' => $team->is_active,
        ]);
    }

    /**
     * DELETE /api/superadmin/teams/{team}
     * Hapus team dan lepaskan assignment team dari user terkait.
     */
    public function destroy(Request $request, Team $team): JsonResponse
    {
        $teamName = $team->name;

        // Reset user assignment yang tergabung di team ini
        User::where('team', $teamName)->update(['team' => null]);

        $team->delete();

        activity()->causedBy($request->user())->log("Team {$teamName} deleted by {$request->user()->name}");

        return response()->json([
            'message' => "Team '{$teamName}' berhasil dihapus.",
        ]);
    }

    /**
     * POST /api/superadmin/teams/{team}/assign-members
     * Menugaskan user-user ke team ini (bulk assign).
     */
    public function assignMembers(Request $request, Team $team): JsonResponse
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
            'mode' => 'nullable|in:replace,append', // default replace
        ]);

        $mode = $validated['mode'] ?? 'replace';

        if ($mode === 'replace') {
            // Hapus anggota sebelumnya yang tidak ada di daftar baru
            User::where('team', $team->name)
                ->whereNotIn('id', $validated['user_ids'])
                ->update(['team' => null]);
        }

        // Set anggota baru ke team ini
        User::whereIn('id', $validated['user_ids'])->update(['team' => $team->name]);

        $updatedMembers = User::where('team', $team->name)
            ->with('roles')
            ->get(['id', 'name', 'email', 'phone', 'status', 'team']);

        activity()->causedBy($request->user())->log("Members assigned to Team {$team->name} by {$request->user()->name}");

        return response()->json([
            'message' => "Anggota berhasil ditugaskan ke {$team->name}.",
            'members_count' => $updatedMembers->count(),
            'members' => $updatedMembers,
        ]);
    }
}
