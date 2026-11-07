<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Odc extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'olt_id',
        'code',
        'name',
        'address',
        'latitude',
        'longitude',
        'capacity_odp',
        'status',
        'operational_status',
        'wilayah',
        'notes',
        'is_active',
        'rev',
        'client_uuid',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'capacity_odp' => 'integer',
        'is_active' => 'boolean',
        'rev' => 'integer',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            // Sinkronkan status dan operational_status bila salah satu diisi
            if ($model->isDirty('status') && ! $model->isDirty('operational_status')) {
                $model->operational_status = $model->status;
            } elseif ($model->isDirty('operational_status') && ! $model->isDirty('status')) {
                $model->status = $model->operational_status;
            }
        });

        static::updating(function ($model) {
            $model->rev = ($model->rev ?? 0) + 1;
        });
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'status', 'operational_status', 'latitude', 'longitude'])
            ->useLogName('network')
            ->logOnlyDirty();
    }

    public function olt(): BelongsTo
    {
        return $this->belongsTo(Olt::class);
    }

    public function odps(): HasMany
    {
        return $this->hasMany(Odp::class);
    }

    /**
     * Ambil seluruh pelanggan yang berada di bawah ODC ini (melalui seluruh ODP anaknya).
     */
    public function getAffectedCustomers()
    {
        $odpIds = $this->odps()->pluck('id');

        return Customer::whereIn('odp_id', $odpIds)
            ->where('status', '!=', 'terminated')
            ->get();
    }
}
