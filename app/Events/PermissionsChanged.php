<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PermissionsChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $roleId;

    public array $userIds;

    public function __construct(int $roleId, array $userIds = [])
    {
        $this->roleId = $roleId;
        $this->userIds = $userIds;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('permissions'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'permissions.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'role_id' => $this->roleId,
            'user_ids' => $this->userIds,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
