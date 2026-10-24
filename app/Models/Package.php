<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'speed_mbps',
        'price',
        'category',
        'description',
        'is_popular',
        'is_active',
        'synced_at',
    ];

    protected $casts = [
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
        'price' => 'float',
        'speed_mbps' => 'integer',
        'synced_at' => 'datetime',
    ];

    /**
     * Scope query to active packages only.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
