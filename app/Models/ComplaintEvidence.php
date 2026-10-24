<?php

namespace App\Models;

use App\Enums\ResolutionCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintEvidence extends Model
{
    use HasFactory;

    protected $table = 'complaint_evidences';

    protected $fillable = [
        'complaint_id',
        'assignment_id',
        'photos',
        'description',
        'resolution_category',
        'submitted_at',
    ];

    protected $casts = [
        'photos' => 'array',
        'resolution_category' => ResolutionCategory::class,
        'submitted_at' => 'datetime',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ComplaintAssignment::class, 'assignment_id');
    }
}
