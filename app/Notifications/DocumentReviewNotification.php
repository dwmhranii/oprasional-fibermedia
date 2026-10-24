<?php

namespace App\Notifications;

use App\Models\SubmissionDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentReviewNotification extends Notification
{
    use Queueable;

    public $document;

    /**
     * Create a new notification instance.
     */
    public function __construct(SubmissionDocument $document)
    {
        $this->document = $document;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        $statusMap = [
            'rejected' => 'Rejected',
            'needs_revision' => 'Needs Revision',
            'approved' => 'Approved',
        ];
        $humanStatus = $statusMap[$this->document->status] ?? 'Reviewed';

        return [
            'type' => 'document_review',
            'submission_id' => $this->document->submission_id,
            'document_id' => $this->document->id,
            'document_type' => $this->document->document_type,
            'status' => $this->document->status,
            'message' => "Your document {$this->document->document_type} for Submission {$this->document->submission->submission_number} has been marked as {$humanStatus}.",
            'notes' => $this->document->reviews()->latest()->first()?->review_notes,
        ];
    }
}
