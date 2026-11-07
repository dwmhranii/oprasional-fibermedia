<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Odp extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'odc_id',
        'code',
        'name',
        'address',
        'latitude',
        'longitude',
        'port_capacity',
        'wilayah',
        'notes',
        'is_active',
        'client_uuid',
        'status',
        'operational_status',
        'needs_review',
        'is_approved',
        'proposed_latitude',
        'proposed_longitude',
        'created_by_id',
        'rev',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'proposed_latitude' => 'decimal:7',
        'proposed_longitude' => 'decimal:7',
        'port_capacity' => 'integer',
        'is_active' => 'boolean',
        'is_approved' => 'boolean',
        'needs_review' => 'boolean',
        'rev' => 'integer',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
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
            ->logOnly(['name', 'status', 'operational_status', 'latitude', 'longitude', 'is_approved'])
            ->useLogName('network')
            ->logOnlyDirty();
    }

    public function odc(): BelongsTo
    {
        return $this->belongsTo(Odc::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * Ambil pelanggan aktif/terpasang yang tertaut ke ODP ini.
     */
    public function getAffectedCustomers()
    {
        return $this->customers()
            ->where('status', '!=', 'terminated')
            ->get();
    }

    /** Jumlah port yang masih kosong (pelanggan berhenti tidak menghitung). */
    public function freePorts(): int
    {
        $used = $this->customers()->where('status', '!=', 'terminated')->whereNotNull('odp_port')->count();

        return max(0, $this->port_capacity - $used);
    }
}
