<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskCompletionEvidence extends Model
{
    use HasFactory;

    protected $table = 'task_completion_evidences';

    protected $fillable = [
        'task_assignment_id',
        'latitude',
        'longitude',
        'accuracy',
        'signature_path',
        'photo_before',
        'photo_after',
        'attendance_photo_path',
        'checklist_result',
        'notes',
        'submitted_at',
        'status',
    ];

    protected $casts = [
        'checklist_result' => 'array',
        'submitted_at' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'accuracy' => 'decimal:2',
    ];

    public function assignment()
    {
        return $this->belongsTo(TaskAssignment::class, 'task_assignment_id');
    }
}
