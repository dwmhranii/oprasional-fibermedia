<?php

namespace App\Events;

use App\Models\SubmissionDocument;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentReviewed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $document;

    /**
     * Create a new event instance.
     */
    public function __construct(SubmissionDocument $document)
    {
        $this->document = $document;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->document->submission->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'document.reviewed';
    }

    public function broadcastWith(): array
    {
        return [
            'submission_id' => $this->document->submission_id,
            'document_id' => $this->document->id,
            'document_type' => $this->document->document_type,
            'status' => $this->document->status,
        ];
    }
}
