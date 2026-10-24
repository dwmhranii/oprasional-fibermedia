<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NetworkStatusLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $subjectType = class_basename($this->subject_type);

        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'description' => $this->description,
            'subject_type' => $subjectType,
            'subject_id' => $this->subject_id,
            'element_code' => $this->properties['code'] ?? $this->properties['name'] ?? null,
            'previous_status' => $this->properties['old_status'] ?? $this->properties['previous_status'] ?? null,
            'new_status' => $this->properties['new_status'] ?? null,
            'reason' => $this->properties['reason'] ?? null,
            'notes' => $this->properties['notes'] ?? null,
            'affected_customers_count' => (int) ($this->properties['affected_customers_count'] ?? 0),
            'causer' => $this->causer ? [
                'id' => $this->causer->id,
                'name' => $this->causer->name,
            ] : null,
            'created_at' => $formatDate($this->created_at),
        ];
    }
}
