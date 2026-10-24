<?php

namespace App\Jobs;

use App\Models\BrasDevice;
use App\Services\Mikrotik\BrasSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncBrasSessionsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ?int $brasDeviceId = null
    ) {}

    public function handle(BrasSyncService $syncService): void
    {
        if ($this->brasDeviceId) {
            $device = BrasDevice::find($this->brasDeviceId);
            if ($device) {
                $syncService->syncDevice($device);
            }
        } else {
            $syncService->syncAll();
        }
    }
}
