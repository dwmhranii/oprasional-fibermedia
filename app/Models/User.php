<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\Filterable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Filterable, HasApiTokens, HasFactory, HasRoles, LogsActivity, Notifiable;

    protected $guard_name = 'web';

    protected static function booted(): void
    {
        static::saved(function (User $user) {
            if (! empty($user->team)) {
                $team = Team::firstOrCreate(
                    ['name' => $user->team],
                    ['is_active' => true, 'order_index' => (Team::max('order_index') ?? 0) + 1]
                );
                TeamMember::firstOrCreate(
                    ['team_id' => $team->id, 'user_id' => $user->id, 'left_at' => null],
                    ['joined_at' => now()]
                );
            }
        });

        static::updated(function (User $user) {
            if ($user->wasChanged('status') && $user->status !== 'active') {
                $user->tokens()->delete();
                $user->devices()->update([
                    'revoked_at' => now(),
                ]);
            }
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'status',
        'team',
        'notification_settings',
        'coverage_areas',
        'max_active_complaints',
        'availability',
        'last_complaint_assigned_at',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
    ];

    protected $appends = [
        'role',
    ];

    public function getRoleAttribute(): ?string
    {
        return $this->getRoleNames()->first() ?? null;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_settings' => 'array',
            'coverage_areas' => 'array',
            'last_complaint_assigned_at' => 'datetime',
            'max_active_complaints' => 'integer',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    public function complaintAssignments(): HasMany
    {
        return $this->hasMany(ComplaintAssignment::class, 'technician_id');
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function activeTeamMember(): HasOne
    {
        return $this->hasOne(TeamMember::class)->whereNull('left_at');
    }

    public function currentTeam(): HasOneThrough
    {
        return $this->hasOneThrough(Team::class, TeamMember::class, 'user_id', 'id', 'id', 'team_id')
            ->whereNull('team_members.left_at');
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_members')
            ->whereNull('team_members.left_at')
            ->withPivot(['joined_at', 'left_at']);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(DailyAttendance::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }
}
