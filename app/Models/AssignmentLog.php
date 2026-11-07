<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AssignmentLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'assignable_type',
        'assignable_id',
        'ticket_type',
        'ticket_id',
        'team_id',
        'action',
        'reason',
        'actor_id',
        'attempt_no',
    ];

    public function assignable(): MorphTo
    {
        return $this->morphTo();
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
