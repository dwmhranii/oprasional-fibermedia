<?php

namespace App\Console\Commands;

use App\Services\PackageSyncService;
use Illuminate\Console\Command;

class SyncPackagesFromRemote extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'packages:sync-remote';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize active packages from remote fibermediaplay.net database into local cache';

    /**
     * Execute the console command.
     */
    public function handle(PackageSyncService $syncService): int
    {
        $this->info('Memulai sinkronisasi paket dari database remote fibermediaplay.net...');

        $result = $syncService->sync();

        if ($result['success']) {
            $this->info('✓ '.$result['message']);

            return Command::SUCCESS;
        } else {
            $this->error('✕ '.$result['message']);

            return Command::FAILURE;
        }
    }
}
