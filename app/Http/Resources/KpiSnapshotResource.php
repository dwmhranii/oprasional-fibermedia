<?php

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KpiSnapshotResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $iso = fn ($d) => $d ? ($d instanceof CarbonInterface ? $d->toIso8601String() : \Carbon\Carbon::parse($d)->toIso8601String()) : null;

        $subjectName = match ($this->subject_type) {
            'team' => $this->team?->name,
            'user', 'technician', 'sales' => $this->user?->name,
            default => null,
        };

        return [
            'id' => $this->id,
            'period' => $this->period,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'subject_name' => $subjectName,
            'metrics' => $this->metrics,
            'weights' => $this->weights,
            'score' => (float) $this->score,
            'settings_version' => (int) ($this->settings_version ?? 1),
            'is_read_only' => (bool) $this->is_read_only,
            'computed_at' => $iso($this->computed_at),
            'created_at' => $iso($this->created_at),
        ];
    }
}
