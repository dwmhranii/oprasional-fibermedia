<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TicketAttendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'attendable_type',
        'attendable_id',
        'user_id',
        'selfie_media_id',
        'lat',
        'lng',
        'accuracy',
        'distance_meters',
        'geofence_status', // inside, outside, low_accuracy, unverified
        'captured_at',
        'received_at',
        'device_id',
    ];

    protected $casts = [
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'accuracy' => 'decimal:2',
        'distance_meters' => 'decimal:2',
        'captured_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function attendable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function selfieMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'selfie_media_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
