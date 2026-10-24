<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CableTrack extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_uuid',
        'name',
        'coordinates',
        'raw_points_count',
        'simplified_points_count',
        'total_length_meters',
        'created_by_id',
        'status',
        'operational_status',
        'connected_odc_id',
        'connected_odp_id',
        'downstream_odp_ids',
        'notes',
    ];

    protected $casts = [
        'coordinates' => 'array',
        'downstream_odp_ids' => 'array',
        'raw_points_count' => 'integer',
        'simplified_points_count' => 'integer',
        'total_length_meters' => 'decimal:2',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function connectedOdc(): BelongsTo
    {
        return $this->belongsTo(Odc::class, 'connected_odc_id');
    }

    public function connectedOdp(): BelongsTo
    {
        return $this->belongsTo(Odp::class, 'connected_odp_id');
    }

    /**
     * Ambil seluruh pelanggan yang terdampak bila kabel ini terganggu/putus.
     */
    public function getAffectedCustomers()
    {
        $odpIds = collect($this->downstream_odp_ids ?? []);

        if ($this->connected_odp_id && ! $odpIds->contains($this->connected_odp_id)) {
            $odpIds->push($this->connected_odp_id);
        }

        if ($this->connected_odc_id) {
            $odcOdpIds = Odp::where('odc_id', $this->connected_odc_id)->pluck('id');
            $odpIds = $odpIds->merge($odcOdpIds)->unique();
        }

        return Customer::whereIn('odp_id', $odpIds)
            ->where('status', '!=', 'terminated')
            ->get();
    }
}
