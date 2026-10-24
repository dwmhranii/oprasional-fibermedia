<?php

namespace App\Console\Commands;

use App\Modules\Dispatch\Services\DispatchService;
use Illuminate\Console\Command;

class DispatchUnassignedTicketsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'dispatch:assign-pending';

    /**
     * The console command aliases.
     */
    protected $aliases = ['dispatch:unassigned'];

    /**
     * The console command description.
     */
    protected $description = 'Dispatch unassigned/pending PSB and complaint tickets to available teams (runs every 2 minutes)';

    /**
     * Execute the console command.
     */
    public function handle(DispatchService $dispatchService): int
    {
        $this->info('Checking for unassigned/pending tickets...');

        $results = $dispatchService->dispatchUnassigned();

        $this->info("Dispatched {$results['psb']} PSB tasks and {$results['complaint']} complaints.");

        return Command::SUCCESS;
    }
}
