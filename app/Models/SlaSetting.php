<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class SlaSetting extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'sla_settings';

    protected $fillable = [
        'priority',
        'resolution_hours',
        'resolution_minutes',
        'description',
        'is_active',
    ];

    protected $casts = [
        'resolution_hours' => 'integer',
        'resolution_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public static function getMinutesForPriority(string $priority): int
    {
        $setting = static::where('priority', strtolower($priority))->where('is_active', true)->first();
        if ($setting) {
            return (int) $setting->resolution_minutes;
        }

        // Bawaan PRD Final v1.2: Kritis 3 jam (180m), Tinggi 6 jam (360m), Sedang 24 jam (1440m)
        return match (strtolower($priority)) {
            'critical', 'kritis' => 180,
            'high', 'tinggi' => 360,
            default => 1440,
        };
    }
}
