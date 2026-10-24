<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrasSessionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'bras_device_id',
        'customer_id',
        'username',
        'event',
        'ip_address',
        'mac_address',
        'uptime',
        'source',
        'details',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function brasDevice(): BelongsTo
    {
        return $this->belongsTo(BrasDevice::class, 'bras_device_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
