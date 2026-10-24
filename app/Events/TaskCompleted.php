<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $taskId;

    public $taskNumber;

    public $status;

    public $completedAt;

    public $teknisiId;

    public function __construct(Task $task)
    {
        $this->taskId = $task->id;
        $this->taskNumber = $task->task_number;
        $this->status = $task->status;
        $this->completedAt = $task->completed_at ? clone $task->completed_at : null;
        $this->teknisiId = $task->teknisi_id;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admins'),
        ];
    }
}
