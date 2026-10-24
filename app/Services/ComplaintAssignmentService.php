<?php

namespace App\Services;

use App\Enums\ComplaintStatus;
use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\Team;
use App\Models\User;

class ComplaintAssignmentService
{
    public function __construct(
        protected TeamDispatchService $dispatchService
    ) {}

    /**
     * Admin: Wajib otomatis Round Robin antar Tim melalui TeamDispatchService.
     */
    public function assignAsAdmin(Complaint $complaint, ?string $notes, User $actor): ComplaintAssignment
    {
        $result = $this->dispatchService->assign($complaint, 'complaint', [
            'reason' => $notes ?? 'Penugasan otomatis round-robin',
            'actor_id' => $actor->id,
        ]);

        if (! $result['assigned']) {
            throw new \DomainException($result['message'] ?? 'Tidak ada tim siap untuk menerima tiket pengaduan.');
        }

        return ComplaintAssignment::where('complaint_id', $complaint->id)
            ->latest('assigned_at')
            ->firstOrFail();
    }

    /**
     * Superadmin: Fleksibel - manual pilih Tim ATAU Round Robin antar Tim melalui TeamDispatchService.
     */
    public function assignAsSuperadmin(
        Complaint $complaint,
        ?string $teamName,
        ?int $technicianId,
        ?string $notes,
        User $actor
    ): ComplaintAssignment {
        if (! empty($teamName) || ! empty($technicianId)) {
            $team = null;
            if (! empty($teamName)) {
                $team = Team::where('name', $teamName)->orWhere('id', $teamName)->first();
            } elseif (! empty($technicianId)) {
                $tech = User::role('Teknisi')->find($technicianId);
                if ($tech) {
                    $team = $tech->currentTeam ?? Team::where('name', $tech->team)->first();
                }
            }

            if (! $team) {
                throw new \DomainException('Tim yang dipilih tidak valid atau tidak ditemukan.');
            }

            $this->dispatchService->assignManual(
                $complaint,
                'complaint',
                $team,
                $notes ?? 'Penugasan manual Superadmin',
                $actor->id
            );

            return ComplaintAssignment::where('complaint_id', $complaint->id)
                ->latest('assigned_at')
                ->firstOrFail();
        }

        return $this->assignAsAdmin($complaint, $notes, $actor);
    }

    /**
     * Daftar Tim Teknisi yang tersedia untuk form penugasan (Superadmin modal).
     */
    public function getAvailableTeams(?string $area = null): array
    {
        $teams = Team::where('is_active', true)->orderBy('order_index')->get();

        $result = [];
        foreach ($teams as $team) {
            $members = $team->activeUsers;

            $activeCount = Complaint::where('assigned_team_id', $team->id)
                ->whereIn('status', [ComplaintStatus::ASSIGNED->value, ComplaintStatus::IN_PROGRESS->value])
                ->count();

            $result[] = [
                'id' => $team->id,
                'name' => $team->name,
                'order_index' => $team->order_index ?? 0,
                'member_count' => $members->count(),
                'active_tickets_count' => $activeCount,
                'technicians' => $members->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'phone' => $m->phone,
                ])->values()->all(),
                'is_available' => $members->isNotEmpty(),
            ];
        }

        return $result;
    }
}
