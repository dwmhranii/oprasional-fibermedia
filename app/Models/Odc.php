<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Odc extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'address',
        'latitude',
        'longitude',
        'capacity_odp',
        'operational_status',
        'wilayah',
        'notes',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'capacity_odp' => 'integer',
    ];

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
