<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class Media extends Model
{
    use HasFactory;

    protected $fillable = [
        'mediable_type',
        'mediable_id',
        'kind',
        'disk',
        'path',
        'sha256',
        'size',
        'mime',
        'captured_at',
        'received_at',
        'selisih_jam',
        'lat',
        'lng',
        'accuracy',
        'device_id',
        'uploaded_by_id',
        'is_anomaly',
        'anomaly_reasons',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'received_at' => 'datetime',
        'selisih_jam' => 'decimal:2',
        'is_anomaly' => 'boolean',
        'anomaly_reasons' => 'array',
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'accuracy' => 'decimal:2',
    ];

    public function mediable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }

    public function getUrlAttribute(): ?string
    {
        if (! $this->path) {
            return null;
        }
        if ($this->disk === 'public') {
            return Storage::disk('public')->url($this->path);
        }

        return $this->getSignedUrlAttribute();
    }

    public function getSignedUrlAttribute(): ?string
    {
        if (! $this->path) {
            return null;
        }
        if ($this->disk === 'public') {
            return Storage::disk('public')->url($this->path);
        }

        return URL::temporarySignedRoute(
            'media.download',
            now()->addHours(2),
            ['media' => $this->id]
        );
    }
}
