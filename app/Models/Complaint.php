<?php

namespace App\Models;

use App\Enums\ComplaintCategory;
use App\Enums\ComplaintPriority;
use App\Enums\ComplaintStatus;
use App\Enums\ResolutionCategory;
use App\Traits\Filterable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Complaint extends Model
{
    use Filterable, HasFactory, LogsActivity;

    protected $fillable = [
        'ticket_number',
        'customer_id',
        'customer_code',
        'customer_name',
        'customer_phone',
        'customer_address',
        'customer_lat',
        'customer_lng',
        'area',
        'assigned_team',
        'whatsapp_message',
        'attachments',
        'category',
        'subject',
        'description',
        'priority',
        'phase_1_completed_at',
        'phase_2_completed_at',
        'status',
        'created_by_id',
        'resolution_type',
        'resolution_category',
        'status_reason',
        'verified_by_id',
        'verified_at',
        'verified_notes',
        'sla_response_due_at',
        'sla_resolve_due_at',
        'sla_paused_at',
        'sla_paused_seconds',
        'is_sla_breached',
        'first_response_at',
        'resolved_at',
        'closed_at',
        'assigned_team_id',
        'assigned_at',
        'accepted_at',
        'accepted_by_id',
        'response_deadline_at',
        'reassign_count',
        'unassigned_since',
        'customer_rating',
        'rating_note',
        'rated_at',
        'rated_by_id',
        'review_status',
        'review_flags',
        'reviewed_by',
        'reviewed_at',
        'review_note',
        'is_mass_outage',
        'affected_element_type',
        'affected_element_id',
    ];

    protected $casts = [
        'attachments' => 'array',
        'phase_1_completed_at' => 'datetime',
        'phase_2_completed_at' => 'datetime',
        'status' => ComplaintStatus::class,
        'category' => ComplaintCategory::class,
        'priority' => ComplaintPriority::class,
        'resolution_category' => ResolutionCategory::class,
        'is_sla_breached' => 'boolean',
        'is_mass_outage' => 'boolean',
        'customer_lat' => 'float',
        'customer_lng' => 'float',
        'sla_paused_seconds' => 'integer',
        'sla_response_due_at' => 'datetime',
        'sla_resolve_due_at' => 'datetime',
        'sla_paused_at' => 'datetime',
        'first_response_at' => 'datetime',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
        'verified_at' => 'datetime',
        'assigned_at' => 'datetime',
        'accepted_at' => 'datetime',
        'response_deadline_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'review_flags' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->useLogName('complaint')
            ->setDescriptionForEvent(fn (string $e) => "Complaint has been {$e}");
    }

    // ── Relationships ──────────────────────────────────────────────
    public function affectedCustomers()
    {
        return $this->belongsToMany(Customer::class, 'complaint_affected_customers', 'complaint_id', 'customer_id')
            ->withPivot('odp_id')
            ->withTimestamps();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_id');
    }

    public function currentAssignment(): HasOne
    {
        return $this->hasOne(ComplaintAssignment::class)->latestOfMany();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ComplaintAssignment::class);
    }

    public function evidence(): HasOne
    {
        return $this->hasOne(ComplaintEvidence::class)->latestOfMany();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(ComplaintAttendance::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ComplaintLog::class)->orderBy('id', 'asc');
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(User::class, 'team', 'assigned_team');
    }

    public function assignmentLogs(): MorphMany
    {
        return $this->morphMany(AssignmentLog::class, 'assignable')->orderByDesc('created_at');
    }

    public function ticketEvents(): MorphMany
    {
        return $this->morphMany(TicketEvent::class, 'eventable')->orderByDesc('occurred_at');
    }

    /**
     * Cek apakah seluruh persyaratan absensi Fase 2 telah terpenuhi.
     * Menggunakan phase2_requirements (anggota yang hadir hari itu atau dibebaskan admin),
     * bukan memeriksa seluruh anggota di users.team agar teknisi libur tidak menahan tiket.
     */
    public function allTeamMembersAttended(): bool
    {
        $requirements = $this->phase2Requirements;
        if ($requirements->isNotEmpty()) {
            return $requirements->every(fn ($req) => $req->completed_at !== null || $req->waived_by_id !== null);
        }

        // Fallback jika belum ada requirement terkunci: cek apakah sudah ada absensi tiket
        return $this->ticketAttendances()->exists() || $this->attendances()->exists();
    }

    // ── Scopes ──────────────────────────────────────────────────────
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['area'])) {
            $query->where('area', $filters['area']);
        }

        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (! empty($filters['team']) && $filters['team'] !== 'all') {
            $query->where('assigned_team', $filters['team']);
        }

        if (isset($filters['is_sla_breached']) && $filters['is_sla_breached'] !== '') {
            $query->where('is_sla_breached', filter_var($filters['is_sla_breached'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('customer_code', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    // ── State Machine ───────────────────────────────────────────────
    public function canTransitionTo(ComplaintStatus $newStatus): bool
    {
        return match ($this->status) {
            ComplaintStatus::OPEN => in_array($newStatus, [
                ComplaintStatus::ASSIGNED,
                ComplaintStatus::CLOSED,    // Selesai Remote
                ComplaintStatus::CANCELLED,
            ]),
            ComplaintStatus::ASSIGNED => in_array($newStatus, [
                ComplaintStatus::IN_PROGRESS,
                ComplaintStatus::CANCELLED,
            ]),
            ComplaintStatus::IN_PROGRESS => in_array($newStatus, [
                ComplaintStatus::PENDING_CUSTOMER,
                ComplaintStatus::PHASE_1_COMPLETED,
                ComplaintStatus::RESOLVED,
                ComplaintStatus::CANCELLED,
            ]),
            ComplaintStatus::PHASE_1_COMPLETED => in_array($newStatus, [
                ComplaintStatus::IN_PROGRESS,
                ComplaintStatus::RESOLVED,
                ComplaintStatus::CANCELLED,
            ]),
            ComplaintStatus::PENDING_CUSTOMER => in_array($newStatus, [
                ComplaintStatus::IN_PROGRESS,
            ]),
            ComplaintStatus::RESOLVED => in_array($newStatus, [
                ComplaintStatus::CLOSED,      // Verifikasi & Close
                ComplaintStatus::IN_PROGRESS, // Return ke teknisi
            ]),
            ComplaintStatus::CLOSED => in_array($newStatus, [
                ComplaintStatus::REOPENED,    // Maksimal 7 hari
            ]),
            ComplaintStatus::REOPENED => in_array($newStatus, [
                ComplaintStatus::ASSIGNED,
                ComplaintStatus::CANCELLED,
            ]),
            default => false,
        };
    }

    // ── SLA Helpers ──────────────────────────────────────────────────
    public function pauseSla(): void
    {
        if (! $this->sla_paused_at) {
            $this->sla_paused_at = now();
            $this->save();
        }
    }

    public function resumeSla(): void
    {
        if ($this->sla_paused_at) {
            $pausedSeconds = now()->diffInSeconds($this->sla_paused_at);
            $this->sla_paused_seconds += $pausedSeconds;
            $this->sla_paused_at = null;
            $this->save();
        }
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
}
