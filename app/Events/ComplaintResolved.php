<?php

namespace App\Events;

use App\Models\Complaint;
use App\Models\ComplaintEvidence;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ComplaintResolved implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Complaint $complaint,
        public ComplaintEvidence $evidence
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('complaints.admin');
    }

    public function broadcastAs(): string
    {
        return 'complaint.resolved';
    }

    public function broadcastWith(): array
    {
        return [
            'complaint_id' => $this->complaint->id,
            'ticket_number' => $this->complaint->ticket_number,
            'customer_name' => $this->complaint->customer_name,
            'area' => $this->complaint->area,
            'resolution_category' => $this->evidence->resolution_category->value,
            'description' => $this->evidence->description,
            'submitted_at' => $this->evidence->submitted_at?->toIso8601String(),
        ];
    }
}
