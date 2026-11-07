<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class OdpPortHistory extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'odp_port_history';

    protected $fillable = [
        'odp_id',
        'port_number',
        'customer_id',
        'action',
        'held_until',
        'released_at',
        'notes',
        'created_by_id',
    ];

    protected $casts = [
        'port_number' => 'integer',
        'held_until' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public function odp(): BelongsTo
    {
        return $this->belongsTo(Odp::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
