<?php

namespace App\Console\Commands;

use App\Enums\ComplaintStatus;
use App\Enums\TaskStatus;
use App\Models\Complaint;
use App\Models\Phase2Requirement;
use App\Models\Task;
use App\Modules\Field\Services\PhaseWorkflowService;
use Illuminate\Console\Command;

class LockPhase2RequirementsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'phase2:lock-requirements';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Kunci daftar teknisi wajib Fase 2 untuk tiket in-progress/phase-1-submitted yang belum terkunci';

    /**
     * Execute the console command.
     */
    public function handle(PhaseWorkflowService $workflowService): int
    {
        $this->info('Memeriksa tiket yang memerlukan penguncian daftar teknisi wajib Fase 2...');
        $lockedCount = 0;

        // 1. Periksa Tasks (PSB) yang berstatus in_progress atau phase_1_submitted tanpa phase2_requirements
        $tasks = Task::whereIn('status', [TaskStatus::IN_PROGRESS, TaskStatus::PHASE_1_SUBMITTED])
            ->whereNotNull('assigned_team_id')
            ->get();

        foreach ($tasks as $task) {
            $hasRequirements = Phase2Requirement::where('assignable_type', Task::class)
                ->where('assignable_id', $task->id)
                ->exists();

            if (! $hasRequirements) {
                $workflowService->lockPhase2Requirements($task);
                $lockedCount++;
                $this->line("Task #{$task->task_number} berhasil dikunci daftar teknisi Fase 2.");
            }
        }

        // 2. Periksa Complaints yang berstatus in_progress atau phase_1_completed tanpa phase2_requirements
        $complaints = Complaint::whereIn('status', [ComplaintStatus::IN_PROGRESS, ComplaintStatus::PHASE_1_COMPLETED])
            ->where(function ($q) {
                $q->whereNotNull('assigned_team_id')->orWhereNotNull('assigned_team');
            })
            ->get();

        foreach ($complaints as $complaint) {
            $hasRequirements = Phase2Requirement::where('assignable_type', Complaint::class)
                ->where('assignable_id', $complaint->id)
                ->exists();

            if (! $hasRequirements) {
                $workflowService->lockPhase2Requirements($complaint);
                $lockedCount++;
                $this->line("Complaint #{$complaint->ticket_number} berhasil dikunci daftar teknisi Fase 2.");
            }
        }

        $this->info("Penguncian selesai. Sebanyak {$lockedCount} tiket berhasil diproses.");

        return Command::SUCCESS;
    }
}
