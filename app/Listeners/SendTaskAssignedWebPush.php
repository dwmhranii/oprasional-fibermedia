<?php

namespace App\Listeners;

use App\Events\TaskAssigned;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Support\Facades\Log;

class SendTaskAssignedWebPush
{
    public function __construct(
        protected WebPushService $webPushService
    ) {}

    public function handle(TaskAssigned $event): void
    {
        try {
            $technician = User::find($event->teknisiId);
            if ($technician) {
                $this->webPushService->sendToUser(
                    $technician,
                    'Tugas Baru Ditugaskan!',
                    "Anda mendapat tugas baru: {$event->taskNumber}",
                    [
                        'url' => "/tasks/{$event->taskId}",
                        'task_id' => $event->taskId,
                        'task_number' => $event->taskNumber,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::error('SendTaskAssignedWebPush failed: '.$e->getMessage());
        }
    }
}
