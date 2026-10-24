<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    /**
     * GET /api/superadmin/teams
     * Daftar semua team (Team A, B, C, D, dst) beserta anggota di dalamnya via team_members.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $teams = Team::with(['activeUsers.roles'])
            ->orderBy('order_index', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return TeamResource::collection($teams);
    }

    /**
     * POST /api/superadmin/teams
     * Tambah team baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:teams,name',
            'description' => 'nullable|string|max:255',
            'order_index' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $maxOrder = Team::max('order_index') ?? 0;

        $team = Team::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'order_index' => $validated['order_index'] ?? ($maxOrder + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        activity()->causedBy($request->user())->log("Team {$team->name} created by {$request->user()->name}");

        return (new TeamResource($team->load('activeUsers.roles')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/superadmin/teams/{team}
     */
    public function show(Team $team): TeamResource
    {
        return new TeamResource($team->load('activeUsers.roles'));
    }

    /**
     * PUT /api/superadmin/teams/{team}
     * Edit nama / deskripsi / urutan team.
     */
    public function update(Request $request, Team $team): TeamResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('teams')->ignore($team->id)],
            'description' => 'nullable|string|max:255',
            'order_index' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $oldName = $team->name;
        $newName = $validated['name'];

        $team->update([
            'name' => $newName,
            'description' => $validated['description'] ?? $team->description,
            'order_index' => $validated['order_index'] ?? $team->order_index,
            'is_active' => $validated['is_active'] ?? $team->is_active,
        ]);

        // Jaga sinkronisasi kolom usang users.team sebagai fallback kompatibilitas
        if ($oldName !== $newName) {
            User::where('team', $oldName)->update(['team' => $newName]);
        }

        activity()->causedBy($request->user())->log("Team {$oldName} updated to {$newName} by {$request->user()->name}");

        return new TeamResource($team->load('activeUsers.roles'));
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
            'success' => true,
            'message' => "Team '{$team->name}' berhasil {$statusStr}.",
            'is_active' => $team->is_active,
            'data' => new TeamResource($team->load('activeUsers.roles')),
        ]);
    }

    /**
     * DELETE /api/superadmin/teams/{team}
     * Hapus team dan lepaskan assignment team dari user terkait.
     */
    public function destroy(Request $request, Team $team): JsonResponse
    {
        $teamName = $team->name;

        // Nonaktifkan semua keanggotaan aktif di team_members
        TeamMember::where('team_id', $team->id)
            ->whereNull('left_at')
            ->update(['left_at' => now()]);

        // Reset kolom legacy users.team
        User::where('team', $teamName)->update(['team' => null]);

        $team->delete();

        activity()->causedBy($request->user())->log("Team {$teamName} deleted by {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Team '{$teamName}' berhasil dihapus.",
        ]);
    }

    /**
     * POST /api/superadmin/teams/{team}/members
     * Menugaskan user-user ke team ini (bulk assign via team_members pivot).
     */
    public function assignMembers(Request $request, Team $team): JsonResponse
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
            'mode' => 'nullable|in:replace,append', // default replace
        ]);

        $mode = $validated['mode'] ?? 'replace';
        $targetUserIds = $validated['user_ids'];

        if ($mode === 'replace') {
            // Pengguna yang sebelumnya ada di tim ini namun tidak ada di list baru: set left_at
            TeamMember::where('team_id', $team->id)
                ->whereNull('left_at')
                ->whereNotIn('user_id', $targetUserIds)
                ->update(['left_at' => now()]);

            User::where('team', $team->name)
                ->whereNotIn('id', $targetUserIds)
                ->update(['team' => null]);
        }

        // Untuk setiap user di targetUserIds, lepaskan dari tim lain yang aktif lalu gabungkan ke tim ini
        foreach ($targetUserIds as $userId) {
            // Tutup keanggotaan tim aktif lain
            TeamMember::where('user_id', $userId)
                ->where('team_id', '!=', $team->id)
                ->whereNull('left_at')
                ->update(['left_at' => now()]);

            // Cek apakah sudah ada keanggotaan aktif di tim ini
            $exists = TeamMember::where('team_id', $team->id)
                ->where('user_id', $userId)
                ->whereNull('left_at')
                ->exists();

            if (! $exists) {
                TeamMember::create([
                    'team_id' => $team->id,
                    'user_id' => $userId,
                    'joined_at' => now(),
                    'left_at' => null,
                ]);
            }

            // Update kolom legacy users.team
            User::where('id', $userId)->update(['team' => $team->name]);
        }

        activity()->causedBy($request->user())->log("Members assigned to Team {$team->name} by {$request->user()->name}");

        $updatedTeam = $team->fresh(['activeUsers.roles']);

        return response()->json([
            'success' => true,
            'message' => "Anggota berhasil ditugaskan ke {$team->name}.",
            'data' => new TeamResource($updatedTeam),
        ]);
    }
}
