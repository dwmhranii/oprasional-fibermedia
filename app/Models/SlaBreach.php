<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class SlaBreach extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'breach_type',
        'entity_type',
        'entity_id',
        'description',
        'detected_at',
        'resolved_at',
        'metadata',
    ];

    protected $casts = [
        'detected_at' => 'datetime',
        'resolved_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->useLogName('sla_breach')
            ->setDescriptionForEvent(fn (string $eventName) => "SLA Breach has been {$eventName}");
    }

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }
}
