<?php

namespace App\Services;

use App\Models\Complaint;

class ComplaintSlaService
{
    public function __construct(
        private SlaResolutionService $slaResolutionService
    ) {}

    /**
     * Hitung dan set SLA response due & SLA resolve due berdasarkan priority.
     */
    public function setTimers(Complaint $complaint): void
    {
        $responseMinutes = $complaint->priority->slaResponseMinutes();
        $resolveHours = $complaint->priority->slaResolveHours();

        $complaint->update([
            'sla_response_due_at' => now()->addMinutes($responseMinutes),
            'sla_resolve_due_at' => now()->addHours($resolveHours),
        ]);
    }

    /**
     * Periksa apakah SLA terlampaui (dipanggil berkala oleh scheduled job).
     */
    public function checkAndReport(Complaint $complaint): void
    {
        if ($complaint->is_sla_breached || $complaint->status->isTerminal()) {
            return;
        }

        // Jika SLA sedang dijeda (pending_customer), jangan hitung breach
        if ($complaint->sla_paused_at) {
            return;
        }

        // Hitung waktu efektif saat ini dengan mengurangi akumulasi jeda SLA
        $effectiveNow = now()->subSeconds($complaint->sla_paused_seconds);

        if ($complaint->sla_resolve_due_at && $effectiveNow->gt($complaint->sla_resolve_due_at)) {
            $complaint->update(['is_sla_breached' => true]);

            $this->slaResolutionService->reportBreach(
                'complaint_resolve',
                $complaint,
                "SLA resolusi tiket {$complaint->ticket_number} terlampaui."
            );
        }
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
