<?php

namespace App\Events;

use App\Models\Provisioning;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProvisioningCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $provisioningId;

    public $provisioningNumber;

    public $bfassAccountId;

    public $status;

    public function __construct(Provisioning $provisioning)
    {
        $this->provisioningId = $provisioning->id;
        $this->provisioningNumber = $provisioning->provisioning_number;
        $this->bfassAccountId = $provisioning->bfass_account_id;
        $this->status = $provisioning->status;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admins'),
        ];
    }
}
