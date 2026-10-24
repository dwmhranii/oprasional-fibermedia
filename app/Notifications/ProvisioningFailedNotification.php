<?php

namespace App\Notifications;

use App\Models\Provisioning;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ProvisioningFailedNotification extends Notification
{
    use Queueable;

    protected Provisioning $provisioning;

    protected string $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(Provisioning $provisioning, string $reason)
    {
        $this->provisioning = $provisioning;
        $this->reason = $reason;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'provisioning_id' => $this->provisioning->id,
            'provisioning_number' => $this->provisioning->provisioning_number,
            'reason' => $this->reason,
            'message' => "Provisioning {$this->provisioning->provisioning_number} failed: {$this->reason}",
        ];
    }
}
