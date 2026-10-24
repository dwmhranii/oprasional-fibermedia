<?php

namespace App\Models;

use App\Enums\TaskAssignmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'status',
        'assigned_at',
        'started_at',
        'submitted_at',
        'completed_at',
        'approved_at',
        'approved_by',
        'notes',
        'phase_2_submitted_at',
    ];

    protected $casts = [
        'status' => TaskAssignmentStatus::class,
        'assigned_at' => 'datetime',
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'phase_2_submitted_at' => 'datetime',
        'completed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function evidence()
    {
        return $this->hasOne(TaskCompletionEvidence::class);
    }

    public function completionEvidence()
    {
        return $this->hasOne(TaskCompletionEvidence::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
