<?php

namespace App\Events;

use App\Models\Complaint;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ComplaintReturned implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Complaint $complaint,
        public string $reason,
        public ?User $technician = null
    ) {}

    public function broadcastOn(): Channel
    {
        $techId = $this->technician?->id ?? $this->complaint->currentAssignment?->technician_id;

        return new PrivateChannel("teknisi.{$techId}");
    }

    public function broadcastAs(): string
    {
        return 'complaint.returned';
    }

    public function broadcastWith(): array
    {
        return [
            'complaint_id' => $this->complaint->id,
            'ticket_number' => $this->complaint->ticket_number,
            'customer_name' => $this->complaint->customer_name,
            'return_reason' => $this->reason,
            'returned_at' => now()->toIso8601String(),
        ];
    }
}
