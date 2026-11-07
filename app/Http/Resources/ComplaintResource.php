<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplaintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $canViewInternalDispatch = $request->user()?->can('complaints.view') || $request->user()?->can('complaints.assign');

        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_code' => $this->customer_code,
            'customer_address' => $this->customer_address,
            'area' => $this->area,
            'assigned_team' => $canViewInternalDispatch ? $this->assigned_team : null,
            'assigned_to_name' => $canViewInternalDispatch ? ($this->assigned_team ?? $this->currentAssignment?->technician?->name) : null,
            'category' => $this->category?->value ?? $this->category,
            'subject' => $this->subject,
            'status' => $this->status?->value ?? $this->status,
            'priority' => $this->priority?->value ?? $this->priority,
            'is_sla_breached' => (bool) $this->is_sla_breached,
            'sla_target_minutes' => (int) ($this->sla_target_minutes ?: \App\Models\SlaSetting::getMinutesForPriority($this->priority?->value ?? 'medium')),
            'sla_progress' => app(\App\Services\ComplaintSlaService::class)->getProgress($this->resource),
            'can_reopen' => $this->canBeReopened(),
            'is_mass' => (bool) ($this->is_mass || $this->is_mass_outage),
            'incident_id' => $this->incident_id,
            'affected_customers_count' => ($this->is_mass || $this->is_mass_outage)
                ? ($this->incident_id
                    ? \App\Models\IncidentCustomer::where('incident_id', $this->incident_id)->count()
                    : $this->affectedCustomers()->count())
                : 0,
            'sla_resolve_due_at' => $this->sla_resolve_due_at?->toIso8601String(),
            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'current_assignment' => $canViewInternalDispatch ? $this->whenLoaded('currentAssignment', fn () => $this->currentAssignment ? [
                'id' => $this->currentAssignment->id,
                'assigned_team' => $this->currentAssignment->assigned_team ?? $this->assigned_team,
                'technician_id' => $this->currentAssignment->technician_id,
                'technician_name' => ($this->currentAssignment->assigned_team ?? $this->assigned_team) ?: $this->currentAssignment->technician?->name,
                'technician_phone' => $this->currentAssignment->technician?->phone,
                'status' => $this->currentAssignment->status,
                'assigned_at' => $this->currentAssignment->assigned_at?->toIso8601String(),
                'scheduled_visit_at' => $this->currentAssignment->scheduled_visit_at?->toIso8601String(),
            ] : null) : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
