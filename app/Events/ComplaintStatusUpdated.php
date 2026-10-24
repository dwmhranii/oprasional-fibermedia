<?php

namespace App\Events;

use App\Models\Complaint;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ComplaintStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Complaint $complaint,
        public string $fromStatus,
        public string $toStatus,
        public ?string $notes = null
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("complaint.{$this->complaint->id}");
    }

    public function broadcastAs(): string
    {
        return 'complaint.status_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'complaint_id' => $this->complaint->id,
            'ticket_number' => $this->complaint->ticket_number,
            'from_status' => $this->fromStatus,
            'to_status' => $this->toStatus,
            'notes' => $this->notes,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
