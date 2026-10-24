<?php

namespace App\Notifications;

use App\Models\Provisioning;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ProvisioningCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Provisioning $provisioning;

    public function __construct(Provisioning $provisioning)
    {
        $this->provisioning = $provisioning;
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
            'type' => 'provisioning_completed',
            'provisioning_id' => $this->provisioning->id,
            'provisioning_number' => $this->provisioning->provisioning_number,
            'message' => "Provisioning {$this->provisioning->provisioning_number} has been successfully completed.",
        ];
    }
}
