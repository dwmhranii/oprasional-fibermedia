<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $taskId;

    public $taskNumber;

    public $provisioningId;

    public $teknisiId;

    public $assignedAt;

    public function __construct(Task $task)
    {
        $this->taskId = $task->id;
        $this->taskNumber = $task->task_number;
        $this->provisioningId = $task->provisioning_id;
        $this->teknisiId = $task->teknisi_id;
        $this->assignedAt = $task->assigned_at ? clone $task->assigned_at : null;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('technician.'.$this->teknisiId),
        ];
    }
}
