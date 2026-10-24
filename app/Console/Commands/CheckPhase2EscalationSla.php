<?php

namespace App\Console\Commands;

use App\Enums\TaskAssignmentStatus;
use App\Models\Task;
use App\Services\SlaResolutionService;
use Illuminate\Console\Command;

class CheckPhase2EscalationSla extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:check-phase2-escalation';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for SLA breaches where Phase 2 is delayed beyond 24 hours of Phase 1';

    /**
     * Execute the console command.
     */
    public function handle(SlaResolutionService $slaService)
    {
        $cutoff = now()->subHours(24);

        $tasks = Task::whereNotNull('phase_1_submitted_at')
            ->where('phase_1_submitted_at', '<=', $cutoff)
            ->whereHas('assignments', function ($query) {
                // Phase 2 is considered incomplete if the assignment is not PHASE_2_COMPLETE and not APPROVED.
                // We also exclude ESCALATED so we don't escalate twice (though SlaResolutionService handles idempotency).
                $query->whereNotIn('status', [
                    TaskAssignmentStatus::PHASE_2_COMPLETE,
                    TaskAssignmentStatus::APPROVED,
                    TaskAssignmentStatus::ESCALATED,
                ]);
            })
            ->get();

        $count = 0;
        foreach ($tasks as $task) {
            $breach = $slaService->reportBreach(
                'delayed_phase2_escalation',
                $task,
                'Phase 2 has not been completed within 24 hours of Phase 1.'
            );

            if ($breach) {
                $count++;
            }
        }

        $this->info("Detected {$count} new Phase 2 delayed SLA breaches.");
    }
}
