<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplaintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_code' => $this->customer_code,
            'customer_address' => $this->customer_address,
            'area' => $this->area,
            'assigned_team' => $this->assigned_team,
            'assigned_to_name' => $this->assigned_team ?? $this->currentAssignment?->technician?->name,
            'category' => $this->category?->value ?? $this->category,
            'subject' => $this->subject,
            'status' => $this->status?->value ?? $this->status,
            'priority' => $this->priority?->value ?? $this->priority,
            'is_sla_breached' => (bool) $this->is_sla_breached,
            'sla_resolve_due_at' => $this->sla_resolve_due_at?->toIso8601String(),
            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'current_assignment' => $this->whenLoaded('currentAssignment', fn () => $this->currentAssignment ? [
                'id' => $this->currentAssignment->id,
                'assigned_team' => $this->currentAssignment->assigned_team ?? $this->assigned_team,
                'technician_id' => $this->currentAssignment->technician_id,
                'technician_name' => ($this->currentAssignment->assigned_team ?? $this->assigned_team) ?: $this->currentAssignment->technician?->name,
                'technician_phone' => $this->currentAssignment->technician?->phone,
                'status' => $this->currentAssignment->status,
                'assigned_at' => $this->currentAssignment->assigned_at?->toIso8601String(),
                'scheduled_visit_at' => $this->currentAssignment->scheduled_visit_at?->toIso8601String(),
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
