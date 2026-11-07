<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Incident extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'incidents';

    protected $fillable = [
        'code',
        'node_type',
        'node_id',
        'status',
        'severity',
        'started_at',
        'detected_at',
        'resolved_at',
        'merged_into_id',
        'source',
        'summary',
        'created_by',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'detected_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->useLogName('incident')
            ->setDescriptionForEvent(fn (string $eventName) => "Incident {$this->code} has been {$eventName}");
    }

    public function mergedInto(): BelongsTo
    {
        return $this->belongsTo(self::class, 'merged_into_id');
    }

    public function mergedIncidents(): HasMany
    {
        return $this->hasMany(self::class, 'merged_into_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function incidentCustomers(): HasMany
    {
        return $this->hasMany(IncidentCustomer::class, 'incident_id');
    }

    public function customers(): BelongsToMany
    {
        return $this->belongsToMany(Customer::class, 'incident_customers', 'incident_id', 'customer_id')
            ->withPivot(['state', 'first_seen_at', 'restored_at', 'split_complaint_id'])
            ->withTimestamps();
    }

    public function complaint(): HasOne
    {
        return $this->hasOne(Complaint::class, 'incident_id');
    }

    /**
     * Dapatkan model elemen jaringan fisik penyebab insiden.
     */
    public function getNodeAttribute()
    {
        return match ($this->node_type) {
            'olt' => Olt::find($this->node_id),
            'odc' => Odc::find($this->node_id),
            'odp' => Odp::find($this->node_id),
            'cable', 'network_cable' => NetworkCable::find($this->node_id) ?? CableTrack::find($this->node_id),
            default => null,
        };
    }
}
