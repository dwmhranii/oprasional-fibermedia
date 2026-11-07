<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentCustomer extends Model
{
    use HasFactory;

    protected $table = 'incident_customers';

    protected $fillable = [
        'incident_id',
        'customer_id',
        'state',
        'first_seen_at',
        'restored_at',
        'split_complaint_id',
    ];

    protected $casts = [
        'first_seen_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class, 'incident_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function splitComplaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'split_complaint_id');
    }
}
