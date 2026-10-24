<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Phase2Requirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'assignable_type',
        'assignable_id',
        'user_id',
        'required_at',
        'completed_at',
        'waived_by_id',
        'waive_reason',
    ];

    protected $casts = [
        'required_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function assignable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function waivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'waived_by_id');
    }

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    public function isWaived(): bool
    {
        return $this->waived_by_id !== null;
    }
}
