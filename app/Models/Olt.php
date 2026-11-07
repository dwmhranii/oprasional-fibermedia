<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Olt extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'code',
        'name',
        'ip_address',
        'address',
        'latitude',
        'longitude',
        'status',
        'is_active',
        'notes',
        'rev',
        'client_uuid',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'is_active' => 'boolean',
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
            ->logOnly(['name', 'status', 'ip_address', 'is_active'])
            ->useLogName('network')
            ->logOnlyDirty();
    }

    public function odcs(): HasMany
    {
        return $this->hasMany(Odc::class);
    }
}
