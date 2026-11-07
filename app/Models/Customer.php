<?php

namespace App\Models;

use App\Traits\Filterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Customer extends Model
{
    use Filterable, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'customer_code', 'external_ref',
        'name', 'nik', 'email', 'address', 'latitude', 'longitude', 'phone',
        'service_type', 'bras_id', 'collector', 'username', 'password',
        'package_id', 'monthly_price', 'local_address', 'remote_address', 'parent_queue', 'rate_limit',
        'subscribed_at', 'expires_at', 'status',
        'is_online', 'last_online_at', 'last_offline_at', 'current_ip_address', 'current_mac_address', 'session_uptime', 'session_id',
        'onu_index', 'odp_id', 'odp_port',
        'debt', 'debt_amount', 'billing_cycle_day', 'wilayah',
        'installed_by_team_id', 'installed_task_id', 'sales_id',
        'notes', 'location_source',
        // Kolom lama, dipertahankan sementara sampai kode yang memakainya dipindah.
        'package', 'odp_code',
    ];

    /** Kredensial dan NIK tidak ikut ke respons JSON; tampilkan lewat Resource dengan izin khusus. */
    protected $hidden = ['password', 'nik', 'nik_hash'];

    protected $casts = [
        'nik' => 'encrypted',
        'password' => 'encrypted',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'monthly_price' => 'decimal:2',
        'debt' => 'decimal:2',
        'debt_amount' => 'decimal:2',
        'billing_cycle_day' => 'integer',
        'is_online' => 'boolean',
        'last_online_at' => 'datetime',
        'last_offline_at' => 'datetime',
        'subscribed_at' => 'date',
        'expires_at' => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (Customer $customer) {
            if ($customer->isDirty('nik') && filled($customer->nik)) {
                $digits = preg_replace('/\D+/', '', (string) $customer->nik);
                $customer->nik_hash = hash_hmac('sha256', $digits, (string) config('app.key'));
            }

            if ($customer->isDirty('phone')) {
                $customer->phone_normalized = self::normalizePhone($customer->phone);
            }

            if (empty($customer->attributes['package'])) {
                $customer->attributes['package'] = $customer->servicePackage?->name ?? 'Layanan Broadband';
            }

            if (empty($customer->attributes['odp_code']) && $customer->odp_id) {
                $customer->attributes['odp_code'] = $customer->odp?->code;
            }
        });

        static::saved(fn () => \App\Services\DashboardService::clearCache());
        static::deleted(fn () => \App\Services\DashboardService::clearCache());
    }

    public static function normalizePhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        if ($digits === '') {
            return null;
        }

        return str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;
    }

    /**
     * NIK bertopeng untuk tampilan umum (contoh: 3507••••••••1234).
     */
    public function getMaskedNikAttribute(): ?string
    {
        $nik = $this->nik;
        if (! filled($nik)) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', (string) $nik);
        $len = strlen($digits);
        if ($len >= 8) {
            return substr($digits, 0, 4).str_repeat('•', max(0, $len - 8)).substr($digits, -4);
        }

        return str_repeat('•', $len);
    }

    /**
     * @deprecated Gunakan package_id dan relasi servicePackage.
     */
    public function getPackageAttribute($value): ?string
    {
        return $value ?: $this->servicePackage?->name;
    }

    /**
     * @deprecated Gunakan odp_id dan relasi odp.
     */
    public function getOdpCodeAttribute($value): ?string
    {
        return $value ?: $this->odp?->code;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logExcept(['password', 'nik', 'nik_hash'])
            ->logOnlyDirty()
            ->useLogName('customer')
            ->setDescriptionForEvent(fn (string $eventName) => "Customer has been {$eventName}");
    }

    public function servicePackage(): BelongsTo
    {
        return $this->belongsTo(Package::class, 'package_id');
    }

    public function bras(): BelongsTo
    {
        return $this->belongsTo(BrasDevice::class, 'bras_id');
    }

    public function odp(): BelongsTo
    {
        return $this->belongsTo(Odp::class, 'odp_id');
    }

    public function installedByTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'installed_by_team_id');
    }

    public function installedTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'installed_task_id');
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }

    public function submission(): HasOne
    {
        return $this->hasOne(Submission::class, 'customer_id');
    }

    public function massOutageComplaints()
    {
        return $this->belongsToMany(Complaint::class, 'complaint_affected_customers', 'customer_id', 'complaint_id')
            ->withPivot('odp_id')
            ->withTimestamps();
    }

    public function brasSessionLogs(): HasMany
    {
        return $this->hasMany(BrasSessionLog::class, 'customer_id');
    }

    public function odpPortHistory(): HasMany
    {
        return $this->hasMany(OdpPortHistory::class);
    }
}
