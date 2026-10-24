<?php

namespace App\Events;

use App\Models\TaskAssignment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskAssignmentApproved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $assignmentId;

    public $taskId;

    public $taskNumber;

    public $userId;

    public $approvedAt;

    public function __construct(TaskAssignment $assignment)
    {
        $this->assignmentId = $assignment->id;
        $this->taskId = $assignment->task_id;
        $this->taskNumber = $assignment->task->task_number;
        $this->userId = $assignment->user_id;
        $this->approvedAt = $assignment->approved_at ? clone $assignment->approved_at : now();
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admins'),
        ];
    }
}
