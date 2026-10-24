<?php

namespace App\Console\Commands;

use App\Models\Complaint;
use App\Models\Task;
use App\Modules\Dispatch\Services\DispatchService;
use Illuminate\Console\Command;

class CheckDispatchTimeoutsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'dispatch:check-no-response';

    /**
     * The console command aliases.
     */
    protected $aliases = ['dispatch:check-timeouts'];

    /**
     * The console command description.
     */
    protected $description = 'Check for assigned tickets that timed out without being accepted (auto-operates to next team or escalates to admin)';

    /**
     * Execute the console command.
     */
    public function handle(DispatchService $dispatchService): int
    {
        $this->info('Checking for ticket response timeouts...');

        // 1. Check tasks
        $expiredTasks = Task::where('status', 'assigned')
            ->whereNotNull('response_deadline_at')
            ->where('response_deadline_at', '<', now())
            ->whereNull('accepted_at')
            ->get();

        foreach ($expiredTasks as $task) {
            $this->warn("Task #{$task->id} timed out. Reassigning...");
            $dispatchService->reassignOnTimeout($task, 'psb');
        }

        // 2. Check complaints
        $expiredComplaints = Complaint::where('status', 'assigned')
            ->whereNotNull('response_deadline_at')
            ->where('response_deadline_at', '<', now())
            ->whereNull('accepted_at')
            ->get();

        foreach ($expiredComplaints as $complaint) {
            $this->warn("Complaint #{$complaint->id} timed out. Reassigning...");
            $dispatchService->reassignOnTimeout($complaint, 'complaint');
        }

        $this->info('Handled '.($expiredTasks->count() + $expiredComplaints->count()).' timed out tickets.');

        return Command::SUCCESS;
    }
}
