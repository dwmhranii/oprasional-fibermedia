<?php

namespace App\Models;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Events\ProvisioningCompleted;
use App\Notifications\ProvisioningCompletedNotification;
use App\Traits\Filterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Notification;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Provisioning extends Model
{
    use Filterable, HasFactory, LogsActivity;

    protected $fillable = [
        'provisioning_number',
        'submission_id',
        'admin_id',
        'bfass_username',
        'bfass_password',
        'vlan',
        'odp',
        'onu_serial_number',
        'bfass_account_id',
        'bfass_status',
        'service_type',
        'nas_server',
        'nas_ip',
        'ip_address',
        'ip_pool',
        'bandwidth_profile',
        'bandwidth_up',
        'bandwidth_down',
        'status',
        'retry_count',
        'bfass_response',
        'error_log',
        'notes',
        'completed_at',
        'provisioned_at',
        'credentials_saved_at',
        'assigned_at',
        'idempotency_key',
        'last_error',
        'failure_reason',
    ];

    protected $casts = [
        'bfass_password' => 'encrypted',
        'bfass_response' => 'array',
        'error_log' => 'array',
        'completed_at' => 'datetime',
        'provisioned_at' => 'datetime',
        'credentials_saved_at' => 'datetime',
        'assigned_at' => 'datetime',
        'status' => ProvisioningStatus::class,
        'bfass_status' => BfassStatus::class,
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->useLogName('provisioning')
            ->setDescriptionForEvent(fn (string $eventName) => "Provisioning has been {$eventName}");
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    protected static function booted()
    {
        static::updated(function ($provisioning) {
            if ($provisioning->wasChanged('status') && $provisioning->status === ProvisioningStatus::SUCCESS) {
                event(new ProvisioningCompleted($provisioning));

                $admins = User::role(['Admin', 'Superadmin'])->get();
                Notification::send($admins, new ProvisioningCompletedNotification($provisioning));
                if ($provisioning->submission && $provisioning->submission->user) {
                    $provisioning->submission->user->notify(new ProvisioningCompletedNotification($provisioning));
                }
            }
        });
    }
}
