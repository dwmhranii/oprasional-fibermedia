<?php

namespace App\Models;

use App\Enums\TaskStatus;
use App\Events\TaskAssigned;
use App\Events\TaskCompleted;
use App\Traits\Filterable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Task extends Model
{
    use Filterable, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'task_number',
        'provisioning_id',
        'teknisi_id',
        'assigned_by',
        'assigned_team',
        'scheduled_date',
        'scheduled_start',
        'scheduled_end',
        'status',
        'result',
        'completion_notes',
        'customer_rating',
        'photos',
        'assigned_at',
        'departed_at',
        'arrived_at',
        'started_at',
        'completed_at',
        'completion_latitude',
        'completion_longitude',
        'completion_accuracy',
        'location_captured_at',
        'customer_signature_path',
        'signature_uploaded_at',
        'signature_uploaded_by',
        'phase_1_submitted_at',
        'return_count',
        'assigned_team_id',
        'accepted_at',
        'accepted_by_id',
        'response_deadline_at',
        'reassign_count',
        'unassigned_since',
        'rating_note',
        'rated_at',
        'rated_by_id',
        'review_status',
        'review_flags',
        'reviewed_by',
        'reviewed_at',
        'review_note',
        'has_port_conflict',
        'selected_odp_id',
        'selected_odp_port',
        'sla_target_minutes',
        'pause_reason_id',
        'paused_at',
        'total_paused_minutes',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'photos' => 'array',
        'assigned_at' => 'datetime',
        'departed_at' => 'datetime',
        'arrived_at' => 'datetime',
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'phase_1_submitted_at' => 'datetime',
        'completed_at' => 'datetime',
        'location_captured_at' => 'datetime',
        'signature_uploaded_at' => 'datetime',
        'accepted_at' => 'datetime',
        'response_deadline_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'review_flags' => 'array',
        'has_port_conflict' => 'boolean',
        'status' => TaskStatus::class,
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->useLogName('task')
            ->setDescriptionForEvent(fn (string $eventName) => "Task has been {$eventName}");
    }

    public function provisioning(): BelongsTo
    {
        return $this->belongsTo(Provisioning::class);
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(TaskChecklistItem::class);
    }

    public function teknisi(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teknisi_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TaskAssignment::class);
    }

    public function assignedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'assigned_team_id');
    }

    public function ticketAttendances(): MorphMany
    {
        return $this->morphMany(TicketAttendance::class, 'attendable');
    }

    public function phase2Requirements(): MorphMany
    {
        return $this->morphMany(Phase2Requirement::class, 'assignable');
    }

    public function media(): MorphMany
    {
        return $this->morphMany(Media::class, 'mediable');
    }

    public function assignmentLogs(): MorphMany
    {
        return $this->morphMany(AssignmentLog::class, 'assignable')->orderByDesc('created_at');
    }

    public function ticketEvents(): MorphMany
    {
        return $this->morphMany(TicketEvent::class, 'eventable')->orderByDesc('occurred_at');
    }

    protected static function booted()
    {
        static::saved(fn () => \App\Services\DashboardService::clearCache());
        static::deleted(fn () => \App\Services\DashboardService::clearCache());

        static::created(function ($task) {
            // Seed default checklist items
            $defaultItems = [
                'modem_installed' => 'Modem Installed',
                'ont_configured' => 'ONT Configured',
                'internet_tested' => 'Internet Tested',
                'customer_informed' => 'Customer Informed',
                'documentation_uploaded' => 'Documentation Uploaded',
            ];
            foreach ($defaultItems as $key => $label) {
                $task->checklistItems()->create(['item_name' => $key]);
            }

            event(new TaskAssigned($task));
        });

        static::updated(function ($task) {
            if ($task->wasChanged('teknisi_id')) {
                event(new TaskAssigned($task));
            }

            if ($task->wasChanged('status') && $task->status === TaskStatus::COMPLETED) {
                event(new TaskCompleted($task));
            }
        });
    }

    /**
     * Verify if the task status can transition to a new status.
     */
    public function canTransitionTo(TaskStatus $newStatus): bool
    {
        if ($this->status === TaskStatus::COMPLETED || $this->status === TaskStatus::FAILED) {
            return false;
        }

        return match ($this->status) {
            TaskStatus::ASSIGNED => in_array($newStatus, [TaskStatus::ON_THE_WAY, TaskStatus::FAILED]),
            TaskStatus::ON_THE_WAY => in_array($newStatus, [TaskStatus::IN_PROGRESS, TaskStatus::FAILED]),
            TaskStatus::IN_PROGRESS => in_array($newStatus, [TaskStatus::COMPLETED, TaskStatus::FAILED]),
            default => false,
        };
    }

    /**
     * Identifies if a task was created before the Team Workflow Refactor.
     * Used to gracefully fallback to legacy data storage for in-progress tasks.
     * Can be safely removed after all legacy tasks are completed.
     */
    public function isLegacyWorkflow(): bool
    {
        return $this->created_at && $this->created_at->lt(Carbon::parse(config('workflow.legacy_cutoff')));
    }
}
