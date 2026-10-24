<?php

namespace App\Events;

use App\Models\Team;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TeamAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $teamId;

    public string $teamName;

    public string $ticketType; // 'psb' or 'complaint'

    public int $ticketId;

    public ?string $ticketNumber;

    public ?string $deadline;

    /**
     * Create a new event instance.
     */
    public function __construct(Team $team, $ticket, string $ticketType, ?string $deadline = null)
    {
        $this->teamId = $team->id;
        $this->teamName = $team->name;
        $this->ticketType = $ticketType;
        $this->ticketId = $ticket->id;
        $this->ticketNumber = $ticket->task_number ?? $ticket->ticket_number ?? (string) $ticket->id;
        $this->deadline = $deadline;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('team.'.$this->teamId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'team_id' => $this->teamId,
            'team_name' => $this->teamName,
            'ticket_type' => $this->ticketType,
            'ticket_id' => $this->ticketId,
            'ticket_number' => $this->ticketNumber,
            'deadline' => $this->deadline,
        ];
    }
}
