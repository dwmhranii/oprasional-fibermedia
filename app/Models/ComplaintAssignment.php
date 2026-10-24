<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ComplaintAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'complaint_id',
        'technician_id',
        'assigned_team',
        'assigned_by_id',
        'assigned_by_role',
        'is_manual_assignment',
        'status',
        'scheduled_visit_at',
        'notes',
        'assigned_at',
        'started_at',
        'resolved_at',
        'returned_at',
        'return_reason',
    ];

    protected $casts = [
        'is_manual_assignment' => 'boolean',
        'scheduled_visit_at' => 'datetime',
        'assigned_at' => 'datetime',
        'started_at' => 'datetime',
        'resolved_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_id');
    }

    public function evidence(): HasOne
    {
        return $this->hasOne(ComplaintEvidence::class, 'assignment_id');
    }
}
