<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubmissionValidatedNotification extends Notification
{
    use Queueable;

    protected Submission $submission;

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
        $statusVal = is_object($this->submission->status) ? $this->submission->status->value : $this->submission->status;
        $reason = $this->submission->rejection_reason ?? $this->submission->validation_notes;
        $message = "Your Submission {$this->submission->submission_number} status updated to {$statusVal}.";
        if ($statusVal === 'rejected' && $reason) {
            $message .= " Reason: {$reason}";
        }

        return [
            'type' => 'submission_validated',
            'submission_id' => $this->submission->id,
            'submission_number' => $this->submission->submission_number,
            'status' => $statusVal,
            'rejection_reason' => $this->submission->rejection_reason,
            'validation_notes' => $this->submission->validation_notes,
            'message' => $message,
        ];
    }
}
