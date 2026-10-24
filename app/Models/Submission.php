<?php

namespace App\Models;

use App\Enums\SubmissionStatus;
use App\Events\SubmissionApproved;
use App\Events\SubmissionCreated;
use App\Events\SubmissionRejected;
use App\Traits\Filterable;
use App\Utils\IdentifierGenerator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Submission extends Model
{
    use Filterable, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'submission_number',
        'user_id',
        'sales_id',
        'customer_id',
        'customer_code',
        'customer_name',
        'nik',
        'nik_hash',
        'phone',
        'phone_normalized',
        'email',
        'address',
        'district',
        'city',
        'province',
        'village',
        'postal_code',
        'lat',
        'lng',
        'package_name',
        'package_speed',
        'package_price',
        'installation_fee',
        'promo_code',
        'discount',
        'total_price',
        'documents',
        'status',
        'validated_by',
        'validated_at',
        'validation_notes',
        'rejection_reason',
        'notes',
        'duplicate_warnings',
        'source',
        'ip_address',
    ];

    protected $casts = [
        'documents' => 'array',
        'notes' => 'array',
        'duplicate_warnings' => 'array',
        'validated_at' => 'datetime',
        'package_price' => 'decimal:2',
        'installation_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_price' => 'decimal:2',
        'lat' => 'float',
        'lng' => 'float',
        'status' => SubmissionStatus::class,
    ];

    protected static function booted()
    {
        static::creating(function (Submission $submission) {
            if (empty($submission->user_id)) {
                $submission->user_id = Auth::id();
            }
            if (empty($submission->sales_id)) {
                $submission->sales_id = $submission->user_id;
            }
            if (empty($submission->submission_number)) {
                $submission->submission_number = self::generateSubmissionNumber();
            }
            if (empty($submission->status)) {
                $submission->status = SubmissionStatus::PENDING;
            }
            $submission->total_price = (float) ($submission->package_price ?? 0) + (float) ($submission->installation_fee ?? 0);
        });

        static::saving(function (Submission $submission) {
            if ($submission->isDirty('nik') && filled($submission->nik)) {
                $digits = preg_replace('/\D+/', '', (string) $submission->nik);
                $submission->nik_hash = hash_hmac('sha256', $digits, (string) config('app.key'));
            }

            if ($submission->isDirty('phone') && filled($submission->phone)) {
                $submission->phone_normalized = Customer::normalizePhone($submission->phone);
            }

            if (empty($submission->sales_id) && filled($submission->user_id)) {
                $submission->sales_id = $submission->user_id;
            }
        });

        static::created(function (Submission $submission) {
            event(new SubmissionCreated($submission));
        });

        static::updated(function (Submission $submission) {
            if ($submission->wasChanged('status')) {
                if ($submission->status === SubmissionStatus::APPROVED) {
                    event(new SubmissionApproved($submission));
                } elseif ($submission->status === SubmissionStatus::REJECTED) {
                    event(new SubmissionRejected($submission));
                }
            }
        });
    }

    public static function generateSubmissionNumber(): string
    {
        return IdentifierGenerator::generate('SUB');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logExcept(['nik']) // Prevent sensitive PII data leakage
            ->logOnlyDirty()
            ->useLogName('submission')
            ->setDescriptionForEvent(fn (string $eventName) => "Submission has been {$eventName}");
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function provisioning(): HasOne
    {
        return $this->hasOne(Provisioning::class);
    }

    public function submissionDocuments(): HasMany
    {
        return $this->hasMany(SubmissionDocument::class);
    }

    /**
     * Get the interconnected Service Traceability Chain.
     */
    public function getServiceChainAttribute(): array
    {
        $task = $this->provisioning?->tasks?->first();

        return [
            'submission_number' => $this->submission_number,
            'provisioning_number' => $this->provisioning?->provisioning_number,
            'task_number' => $task?->task_number,
            'customer_code' => $this->customer_code ?? $this->customer?->customer_code,
            'status' => is_object($this->status) ? $this->status->value : $this->status,
            'stage' => match ($this->status) {
                SubmissionStatus::COMPLETED => 'Layanan Aktif (Selesai)',
                SubmissionStatus::APPROVED => 'Proses Penugasan / Instalasi',
                SubmissionStatus::PENDING, SubmissionStatus::PENDING_VALIDATION => 'Menunggu Validasi',
                SubmissionStatus::NEED_INFO => 'Butuh Informasi Tambahan',
                SubmissionStatus::REJECTED => 'Pengajuan Ditolak',
                default => 'Dalam Proses',
            },
        ];
    }

    /**
     * Scope to filter submissions based on the authenticated user.
     */
    public function scopeForUser($query, User $user)
    {
        if ($user->hasRole('Sales')) {
            return $query->where(function ($q) use ($user) {
                $q->where('sales_id', $user->id)
                    ->orWhere('user_id', $user->id);
            });
        }

        return $query;
    }

    /**
     * Determine if the submission is in an editable state.
     */
    public function isEditable(): bool
    {
        return in_array($this->status, [
            SubmissionStatus::PENDING,
            SubmissionStatus::NEED_INFO,
            SubmissionStatus::REJECTED,
        ]);
    }

    /**
     * Get the normalized documents array attribute.
     */
    public function getNormalizedDocumentsAttribute(): array
    {
        return $this->normalizeDocuments($this->documents ?? []);
    }

    /**
     * Normalize both legacy and modern documents array structures.
     */
    public function normalizeDocuments(array $documents): array
    {
        $normalized = [];
        $isLegacy = false;
        foreach ($documents as $key => $val) {
            if (! is_numeric($key) && is_string($val)) {
                $isLegacy = true;
                break;
            }
        }

        if ($isLegacy) {
            foreach ($documents as $type => $val) {
                if (is_string($val)) {
                    $normalized[] = [
                        'document_type' => $type,
                        'original_name' => basename($val),
                        'path' => $val,
                        'url' => Storage::url($val),
                        'uploaded_at' => $this->updated_at?->toIso8601String() ?? now()->toIso8601String(),
                    ];
                }
            }
        } else {
            $normalized = $documents;
        }

        return $normalized;
    }

    /**
     * Add or update a document associated with the submission.
     * Deprecates JSON mutation in favor of dedicated SubmissionDocument records.
     */
    public function addDocument(string $type, string $path, string $originalName): void
    {
        // Deactivate previous active documents of the same type
        $this->submissionDocuments()
            ->where('document_type', $type)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Create new active document
        $this->submissionDocuments()->create([
            'document_type' => $type,
            'original_name' => basename($originalName),
            'path' => $path,
            'status' => 'pending_review',
            'is_active' => true,
        ]);
    }

    /**
     * Build unified timeline history events for the submission.
     */
    public function getTimelineArray(): array
    {
        $timeline = [];
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        // 1. Initial Creation Event
        $creatorName = $this->user?->name ?? 'Sales';
        $timeline[] = [
            'id' => 'created_'.$this->id,
            'type' => 'created',
            'description' => "Pengajuan baru dibuat oleh {$creatorName}",
            'user' => $creatorName,
            'user_role' => 'Sales',
            'timestamp' => $formatDate($this->created_at),
            'raw_time' => $this->created_at ? $this->created_at->timestamp : 0,
        ];

        // 2. Validation / Status Change Event
        if ($this->validated_at) {
            $validatorName = $this->validator?->name ?? 'Admin';
            $statusVal = is_object($this->status) ? $this->status->value : $this->status;

            $desc = "Pengajuan diproses oleh Admin {$validatorName}";
            if ($statusVal === 'approved') {
                $desc = "Pengajuan disetujui oleh Admin {$validatorName}";
                if ($this->validation_notes) {
                    $desc .= " ({$this->validation_notes})";
                }
            } elseif ($statusVal === 'rejected') {
                $reason = $this->rejection_reason ?? $this->validation_notes ?? 'Tidak ada catatan';
                $desc = "Pengajuan ditolak oleh Admin {$validatorName}: {$reason}";
            } elseif ($statusVal === 'need_info') {
                $notes = $this->validation_notes ?? 'Dibutuhkan informasi tambahan';
                $desc = "Admin {$validatorName} meminta perbaikan/info tambahan: {$notes}";
            }

            $timeline[] = [
                'id' => 'validated_'.$this->id,
                'type' => 'validation',
                'description' => $desc,
                'user' => $validatorName,
                'user_role' => 'Admin',
                'timestamp' => $formatDate($this->validated_at),
                'raw_time' => $this->validated_at ? $this->validated_at->timestamp : 0,
            ];
        }

        // 3. Document Reviews
        if ($this->relationLoaded('submissionDocuments') || $this->submissionDocuments()->exists()) {
            $documents = $this->relationLoaded('submissionDocuments')
                ? $this->submissionDocuments
                : $this->submissionDocuments()->with('reviews.reviewer')->get();

            foreach ($documents as $doc) {
                $reviews = $doc->relationLoaded('reviews') ? $doc->reviews : $doc->reviews()->with('reviewer')->get();
                foreach ($reviews as $rev) {
                    $reviewerName = $rev->reviewer?->name ?? 'Admin';
                    $statusMap = [
                        'approved' => 'Disetujui',
                        'rejected' => 'Ditolak',
                        'needs_revision' => 'Butuh Perbaikan',
                    ];
                    $humanStatus = $statusMap[$rev->status] ?? $rev->status;
                    $docTypeUpper = strtoupper($doc->document_type);

                    $notesStr = $rev->review_notes ? " ({$rev->review_notes})" : '';
                    $desc = "Dokumen {$docTypeUpper} marked as {$humanStatus} oleh Admin {$reviewerName}{$notesStr}";

                    $time = $rev->reviewed_at ?? $rev->created_at;

                    $timeline[] = [
                        'id' => 'doc_review_'.$rev->id,
                        'type' => 'document_review',
                        'description' => $desc,
                        'user' => $reviewerName,
                        'user_role' => 'Admin',
                        'timestamp' => $formatDate($time),
                        'raw_time' => $time ? Carbon::parse($time)->timestamp : 0,
                    ];
                }
            }
        }

        // Sort timeline entries chronologically (newest first for frontend display)
        usort($timeline, fn ($a, $b) => $b['raw_time'] <=> $a['raw_time']);

        return array_map(function ($item) {
            unset($item['raw_time']);

            return $item;
        }, $timeline);
    }
}
