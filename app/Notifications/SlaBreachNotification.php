<?php

namespace App\Notifications;

use App\Models\SlaBreach;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class SlaBreachNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected SlaBreach $breach;

    /**
     * Create a new notification instance.
     */
    public function __construct(SlaBreach $breach)
    {
        $this->breach = $breach;
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
        // For entity reference, attempt to load identifier if exists
        $entityRef = $this->breach->entity_type.' #'.$this->breach->entity_id;

        return [
            'breach_id' => $this->breach->id,
            'breach_type' => $this->breach->breach_type,
            'entity_reference' => $entityRef,
            'description' => $this->breach->description,
            'detected_at' => $this->breach->detected_at?->setTimezone('Asia/Jakarta')->toIso8601String(),
            'message' => "SLA Breach Detected: {$this->breach->description}",
        ];
    }
}
