<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ComplaintAttendance extends Model
{
    use HasFactory;

    protected $table = 'complaint_attendances';

    protected $fillable = [
        'complaint_id',
        'user_id',
        'selfie_photo_path',
        'latitude',
        'longitude',
        'accuracy',
        'distance_meters',
        'is_within_radius',
        'clocked_at',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'accuracy' => 'float',
        'distance_meters' => 'float',
        'is_within_radius' => 'boolean',
        'clocked_at' => 'datetime',
    ];

    protected $appends = [
        'selfie_url',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getSelfieUrlAttribute(): ?string
    {
        if (! $this->selfie_photo_path) {
            return null;
        }

        if (str_starts_with($this->selfie_photo_path, 'http://') || str_starts_with($this->selfie_photo_path, 'https://')) {
            return $this->selfie_photo_path;
        }

        return Storage::url($this->selfie_photo_path);
    }
}
