<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TicketEvent extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'ticket_events';

    protected $fillable = [
        'eventable_type',
        'eventable_id',
        'actor_id',
        'event',
        'from_status',
        'to_status',
        'payload',
        'occurred_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function eventable(): MorphTo
    {
        return $this->morphTo();
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * Catat event jejak tiket baru dengan waktu server.
     */
    public static function record(
        Model $ticket,
        string $event,
        string|\BackedEnum|null $fromStatus = null,
        string|\BackedEnum|null $toStatus = null,
        ?array $payload = null,
        ?int $actorId = null
    ): self {
        $from = $fromStatus instanceof \BackedEnum
            ? $fromStatus->value
            : ($fromStatus ?? ($ticket->getOriginal('status') instanceof \BackedEnum ? $ticket->getOriginal('status')->value : $ticket->getOriginal('status')));

        $to = $toStatus instanceof \BackedEnum
            ? $toStatus->value
            : ($toStatus ?? ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status));

        return self::create([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => $actorId ?? auth()->id(),
            'event' => $event,
            'from_status' => $from,
            'to_status' => $to,
            'payload' => $payload,
            'occurred_at' => now(),
        ]);
    }
}
