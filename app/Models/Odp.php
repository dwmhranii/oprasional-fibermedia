<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Odp extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'odc_id', 'code', 'name', 'address', 'latitude', 'longitude',
        'port_capacity', 'wilayah', 'notes', 'is_active',
        'client_uuid', 'status', 'is_approved', 'proposed_latitude',
        'proposed_longitude', 'created_by_id', 'operational_status',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'proposed_latitude' => 'decimal:7',
        'proposed_longitude' => 'decimal:7',
        'port_capacity' => 'integer',
        'is_active' => 'boolean',
        'is_approved' => 'boolean',
    ];

    public function odc()
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
