<?php

namespace App\Notifications;

use App\Models\TaskAssignment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class TechnicianApprovedNotification extends Notification implements ShouldBroadcast
{
    use Queueable;

    protected TaskAssignment $assignment;

    public function __construct(TaskAssignment $assignment)
    {
        $this->assignment = $assignment;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_approved',
            'assignment_id' => $this->assignment->id,
            'task_id' => $this->assignment->task_id,
            'message' => "Your assignment for Task {$this->assignment->task->task_number} has been approved.",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'task_approved',
            'assignment_id' => $this->assignment->id,
            'task_id' => $this->assignment->task_id,
            'message' => "Your assignment for Task {$this->assignment->task->task_number} has been approved.",
        ]);
    }
}
