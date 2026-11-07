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
        'track', // office, field
        'status', // hadir, field_checkin, izin, sakit, alpa
        'check_in_at',
        'check_in_lat',
        'check_in_lng',
        'check_in_accuracy',
        'check_in_media_id',
        'check_out_at',
        'check_out_media_id',
        'check_out_lat',
        'check_out_lng',
        'check_out_accuracy',
        'device_id',
        'client_ip',
        'set_by_id',
        'note',
        'is_manual',
        'is_suspicious',
        'suspicious_reason',
        'review_status', // pending_review, approved, rejected
        'reviewed_by_id',
        'reviewed_at',
        'review_notes',
        'office_id',
        'office_distance_meters',
        'late_minutes',
    ];

    protected $casts = [
        'work_date' => 'date',
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'check_in_lat' => 'float',
        'check_in_lng' => 'float',
        'check_in_accuracy' => 'float',
        'check_out_lat' => 'float',
        'check_out_lng' => 'float',
        'check_out_accuracy' => 'float',
        'office_distance_meters' => 'float',
        'is_manual' => 'boolean',
        'is_suspicious' => 'boolean',
        'late_minutes' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saved(fn () => \App\Services\DashboardService::clearCache());
        static::deleted(fn () => \App\Services\DashboardService::clearCache());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function setBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'set_by_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
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

    public function checkOutMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'check_out_media_id');
    }
}
