<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class ComplaintType extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'complaint_types';

    protected $fillable = [
        'name',
        'description',
        'default_priority',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'complaint_type_id');
    }

    public function canBeDeleted(): bool
    {
        return $this->complaints()->count() === 0;
    }
}
