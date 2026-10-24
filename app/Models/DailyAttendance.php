<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyAttendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'work_date',
        'status', // hadir, izin, sakit, alpa
        'check_in_at',
        'check_in_lat',
        'check_in_lng',
        'check_in_accuracy',
        'check_in_media_id',
        'check_out_at',
        'device_id',
        'set_by_id',
        'note',
        'is_manual',
        'office_id',
        'office_distance_meters',
        'late_minutes',
    ];

    protected $casts = [
        'work_date' => 'date',
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'check_in_lat' => 'float',
        'check_in_lng' => 'float',
        'check_in_accuracy' => 'float',
        'office_distance_meters' => 'float',
        'is_manual' => 'boolean',
        'late_minutes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function setBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'set_by_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(OfficeLocation::class, 'office_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function checkInMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'check_in_media_id');
    }
}
