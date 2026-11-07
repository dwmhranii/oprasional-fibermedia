<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class NetworkStatusLog extends Model
{
    protected $fillable = [
        'node_type',
        'node_id',
        'from_status',
        'to_status',
        'reason',
        'source',
        'user_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function node(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'node_type', 'node_id');
    }
}
