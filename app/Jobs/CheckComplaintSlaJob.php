<?php

namespace App\Jobs;

use App\Enums\ComplaintStatus;
use App\Models\Complaint;
use App\Services\ComplaintSlaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CheckComplaintSlaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(ComplaintSlaService $slaService): void
    {
        Complaint::whereNotIn('status', [
            ComplaintStatus::CLOSED->value,
            ComplaintStatus::CANCELLED->value,
        ])
            ->whereNull('sla_paused_at') // Jangan periksa yang sedang dijeda
            ->where('is_sla_breached', false)
            ->whereNotNull('sla_resolve_due_at')
            ->chunkById(100, function ($complaints) use ($slaService) {
                foreach ($complaints as $complaint) {
                    $slaService->checkAndReport($complaint);
                }
            });
    }
}
