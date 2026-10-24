<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubmissionCreatedNotification extends Notification
{
    use Queueable;

    protected Submission $submission;

    /**
     * Create a new notification instance.
     */
    public function __construct(Submission $submission)
    {
        $this->submission = $submission;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $userName = $this->submission->user?->name ?? 'Sales';

        return [
            'type' => 'submission_created',
            'submission_id' => $this->submission->id,
            'submission_number' => $this->submission->submission_number,
            'message' => "New Submission {$this->submission->submission_number} has been created by {$userName}.",
        ];
    }
}
