<?php

namespace App\Events;

use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ComplaintAssigned implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Complaint $complaint,
        public ComplaintAssignment $assignment,
        public User $technician
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("teknisi.{$this->technician->id}");
    }

    public function broadcastAs(): string
    {
        return 'complaint.assigned';
    }

    public function broadcastWith(): array
    {
        return [
            'complaint_id' => $this->complaint->id,
            'ticket_number' => $this->complaint->ticket_number,
            'customer_name' => $this->complaint->customer_name,
            'customer_phone' => $this->complaint->customer_phone,
            'customer_address' => $this->complaint->customer_address,
            'area' => $this->complaint->area,
            'category' => $this->complaint->category->value,
            'priority' => $this->complaint->priority->value,
            'notes' => $this->assignment->notes,
            'assigned_at' => $this->assignment->assigned_at?->toIso8601String(),
        ];
    }
}
