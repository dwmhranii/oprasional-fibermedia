<?php

namespace App\Services;

use App\Enums\ComplaintStatus;
use App\Models\Complaint;
use App\Models\SlaSetting;
use Carbon\Carbon;

class ComplaintSlaService
{
    public function __construct(
        private SlaResolutionService $slaResolutionService,
        private SlaOperatingHoursService $operatingHoursService
    ) {}

    /**
     * Hitung dan set SLA response due (2 jam operasional) & SLA resolve due berdasarkan sla_settings.
     */
    public function setTimers(Complaint $complaint): void
    {
        $priorityStr = $complaint->priority instanceof \BackedEnum
            ? $complaint->priority->value
            : (string) $complaint->priority;

        $targetMinutes = SlaSetting::getMinutesForPriority($priorityStr);
        $complaint->sla_target_minutes = $targetMinutes;

        $startTime = $complaint->assigned_at ?? now();

        // Target respons pengaduan: 2 jam operasional (120 menit) sesuai PRD Final v1.2
        $responseDueAt = $this->operatingHoursService->addOperatingMinutes($startTime, 120);

        // Target penyelesaian: sesuai sla_target_minutes operasional
        $resolveDueAt = $this->operatingHoursService->addOperatingMinutes($startTime, $targetMinutes);

        $complaint->update([
            'sla_target_minutes' => $targetMinutes,
            'sla_response_due_at' => $responseDueAt,
            'response_deadline_at' => $complaint->response_deadline_at ?? $responseDueAt,
            'sla_resolve_due_at' => $resolveDueAt,
            'is_sla_breached' => false,
        ]);
    }

    /**
     * Reset SLA timers dari awal saat tiket dibuka kembali (reopen) sesuai PRD Final v1.2.
     */
    public function resetTimersForReopen(Complaint $complaint): void
    {
        $priorityStr = $complaint->priority instanceof \BackedEnum
            ? $complaint->priority->value
            : (string) $complaint->priority;

        $targetMinutes = SlaSetting::getMinutesForPriority($priorityStr);
        $reopenTime = now();

        $resolveDueAt = $this->operatingHoursService->addOperatingMinutes($reopenTime, $targetMinutes);
        $responseDueAt = $this->operatingHoursService->addOperatingMinutes($reopenTime, 120);

        $complaint->update([
            'sla_target_minutes' => $targetMinutes,
            'sla_response_due_at' => $responseDueAt,
            'response_deadline_at' => $responseDueAt,
            'sla_resolve_due_at' => $resolveDueAt,
            'sla_paused_at' => null,
            'sla_paused_seconds' => 0,
            'is_sla_breached' => false,
        ]);
    }

    /**
     * Periksa apakah SLA terlampaui (dipanggil berkala oleh scheduled job).
     */
    public function checkAndReport(Complaint $complaint): void
    {
        if ($complaint->is_sla_breached) {
            return;
        }

        if ($complaint->status instanceof ComplaintStatus && $complaint->status->isTerminal()) {
            return;
        }

        // Jika SLA sedang dijeda (pending_customer / pause), jam berhenti
        if ($complaint->sla_paused_at) {
            return;
        }

        $now = now();

        if ($complaint->sla_resolve_due_at && $now->greaterThanOrEqualTo($complaint->sla_resolve_due_at)) {
            $complaint->update(['is_sla_breached' => true]);

            $this->slaResolutionService->reportBreach(
                'complaint_resolve',
                $complaint,
                "SLA penyelesaian tiket {$complaint->ticket_number} terlampaui."
            );
        }
    }

    /**
     * Hitung rincian progress SLA terkini untuk UI (Aman / Peringatan 75% / Terlampaui 100% / Dijeda).
     */
    public function getProgress(Complaint $complaint): array
    {
        $start = $complaint->assigned_at ?? $complaint->created_at ?? now();
        $target = (int) ($complaint->sla_target_minutes ?: SlaSetting::getMinutesForPriority(
            $complaint->priority instanceof \BackedEnum ? $complaint->priority->value : (string) ($complaint->priority ?? 'medium')
        ));
        $pausedMinutes = (int) round(($complaint->sla_paused_seconds ?? 0) / 60);

        return $this->operatingHoursService->getSlaProgress(
            $start,
            $target,
            $complaint->sla_paused_at,
            $pausedMinutes,
            $complaint->resolved_at ?? $complaint->closed_at
        );
    }

    /**
     * Selesaikan SLA breach saat tiket ditutup atau diselesaikan.
     */
    public function resolveBreach(Complaint $complaint): void
    {
        $this->slaResolutionService->resolveBreach('complaint_resolve', $complaint);
        $this->slaResolutionService->resolveBreach('complaint_response', $complaint);
    }
}
