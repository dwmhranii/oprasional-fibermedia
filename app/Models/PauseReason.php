<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class PauseReason extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'pause_reasons';

    protected $fillable = [
        'code',
        'reason',
        'requires_photo',
        'is_active',
        'order_index',
    ];

    protected $casts = [
        'requires_photo' => 'boolean',
        'is_active' => 'boolean',
        'order_index' => 'integer',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }
}
