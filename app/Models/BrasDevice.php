<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BrasDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'ip_address',
        'api_port',
        'username',
        'password',
        'use_ssl',
        'timeout',
        'location',
        'notes',
        'is_active',
        'last_synced_at',
        'last_sync_status',
        'last_sync_error',
        'active_sessions_count',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'api_port' => 'integer',
        'use_ssl' => 'boolean',
        'timeout' => 'integer',
        'is_active' => 'boolean',
        'password' => 'encrypted',
        'last_synced_at' => 'datetime',
        'active_sessions_count' => 'integer',
    ];

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'bras_id');
    }

    public function sessionLogs(): HasMany
    {
        return $this->hasMany(BrasSessionLog::class, 'bras_device_id');
    }
}
