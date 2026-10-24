<?php

namespace App\Console\Commands;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Services\SlaResolutionService;
use Illuminate\Console\Command;

class CheckInstallationSla extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:check-installation';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for SLA breaches on delayed installations';

    /**
     * Execute the console command.
     */
    public function handle(SlaResolutionService $slaService)
    {
        $today = now()->startOfDay();

        $tasks = Task::where('status', '!=', TaskStatus::COMPLETED)
            ->whereNotNull('scheduled_date')
            ->where('scheduled_date', '<', $today)
            ->get();

        $count = 0;
        foreach ($tasks as $task) {
            $breach = $slaService->reportBreach(
                'delayed_installation',
                $task,
                "Task is delayed beyond scheduled date ({$task->scheduled_date->toDateString()})"
            );

            if ($breach) {
                $count++;
            }
        }

        $this->info("Detected {$count} new delayed installation SLA breaches.");
    }
}
