<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiSnapshot extends Model
{
    use HasFactory;

    protected $table = 'kpi_snapshots';

    protected $fillable = [
        'period',
        'subject_type',
        'subject_id',
        'metrics',
        'weights',
        'score',
        'settings_version',
        'is_read_only',
        'computed_at',
    ];

    protected $casts = [
        'metrics' => 'array',
        'weights' => 'array',
        'score' => 'decimal:2',
        'settings_version' => 'integer',
        'is_read_only' => 'boolean',
        'computed_at' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'subject_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subject_id');
    }

    /**
     * Dapatkan subjek yang dinilai (Team atau User).
     */
    public function getSubjectAttribute(): mixed
    {
        if ($this->subject_type === 'team') {
            return Team::find($this->subject_id);
        }

        return User::find($this->subject_id);
    }
}
