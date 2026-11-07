<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class NetworkCable extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'code',
        'name',
        'from_type',
        'from_id',
        'from_name',
        'to_type',
        'to_id',
        'to_name',
        'kind',
        'is_backbone',
        'route',
        'length_m',
        'route_drawn',
        'status',
        'notes',
        'rev',
        'client_uuid',
        'created_by_id',
    ];

    protected $casts = [
        'is_backbone' => 'boolean',
        'route_drawn' => 'boolean',
        'route' => 'array',
        'length_m' => 'float',
        'rev' => 'integer',
    ];

    protected static function booted()
    {
        static::updating(function ($model) {
            $model->rev = ($model->rev ?? 0) + 1;
        });
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'status', 'length_m', 'route_drawn'])
            ->useLogName('network')
            ->logOnlyDirty();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function from(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'from_type', 'from_id');
    }

    public function to(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'to_type', 'to_id');
    }
}
