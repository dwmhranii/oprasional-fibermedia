<?php

namespace App\Events;

use App\Models\Submission;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SubmissionRejected implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $submissionId;

    public $status;

    public $salesId;

    public $reason;

    public function __construct(Submission $submission)
    {
        $this->submissionId = $submission->id;
        $this->status = $submission->status;
        $this->salesId = $submission->user_id;
        $this->reason = $submission->rejection_reason;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('sales.'.$this->salesId),
        ];
    }
}
