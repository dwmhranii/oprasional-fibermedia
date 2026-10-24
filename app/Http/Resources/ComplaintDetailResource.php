<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ComplaintDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,

            // Identitas Pelanggan
            'customer_id' => $this->customer_id,
            'customer_code' => $this->customer_code,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_address' => $this->customer_address,
            'customer_lat' => $this->customer_lat ? (float) $this->customer_lat : null,
            'customer_lng' => $this->customer_lng ? (float) $this->customer_lng : null,
            'area' => $this->area,
            'assigned_team' => $this->assigned_team,
            'team_members' => $this->assigned_team ? User::role('Teknisi')->where('team', $this->assigned_team)->get(['id', 'name', 'phone'])->toArray() : [],
            'whatsapp_message' => $this->whatsapp_message,
            'attachments' => $this->attachments ? array_values(array_map(fn ($p) => Storage::url($p), $this->attachments)) : [],

            // Detail Tiket
            'category' => $this->category?->value ?? $this->category,
            'subject' => $this->subject,
            'description' => $this->description,
            'status' => $this->status?->value ?? $this->status,
            'priority' => $this->priority?->value ?? $this->priority,
            'status_reason' => $this->status_reason,

            // Resolusi 2 Fase
            'phase_1_completed_at' => $this->phase_1_completed_at?->toIso8601String(),
            'phase_2_completed_at' => $this->phase_2_completed_at?->toIso8601String(),
            'all_team_members_attended' => $this->allTeamMembersAttended(),
            'attendances' => $this->whenLoaded('attendances', fn () => $this->attendances->map(fn ($att) => [
                'id' => $att->id,
                'user_id' => $att->user_id,
                'technician_name' => $att->technician?->name,
                'selfie_url' => $att->selfie_url,
                'latitude' => (float) $att->latitude,
                'longitude' => (float) $att->longitude,
                'accuracy' => $att->accuracy ? (float) $att->accuracy : null,
                'distance_meters' => $att->distance_meters ? (float) $att->distance_meters : null,
                'is_within_radius' => (bool) $att->is_within_radius,
                'clocked_at' => $att->clocked_at?->toIso8601String(),
            ])
            ),

            // Resolusi & Verifikasi
            'resolution_type' => $this->resolution_type,
            'resolution_category' => $this->resolution_category?->value ?? $this->resolution_category,
            'verified_by_id' => $this->verified_by_id,
            'verified_by_name' => $this->whenLoaded('verifiedBy', fn () => $this->verifiedBy?->name),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'verified_notes' => $this->verified_notes,

            // SLA Timers
            'sla_response_due_at' => $this->sla_response_due_at?->toIso8601String(),
            'sla_resolve_due_at' => $this->sla_resolve_due_at?->toIso8601String(),
            'sla_paused_at' => $this->sla_paused_at?->toIso8601String(),
            'sla_paused_seconds' => (int) $this->sla_paused_seconds,
            'is_sla_breached' => (bool) $this->is_sla_breached,
            'first_response_at' => $this->first_response_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),

            // Relations
            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'current_assignment' => $this->whenLoaded('currentAssignment', function () {
                $a = $this->currentAssignment;
                if (! $a) {
                    return null;
                }
                $team = $a->assigned_team ?? $this->assigned_team;
                $members = $team ? User::role('Teknisi')->where('team', $team)->get(['id', 'name', 'phone'])->toArray() : [];

                return [
                    'id' => $a->id,
                    'assigned_team' => $team,
                    'team_members' => $members,
                    'technician_id' => $a->technician_id,
                    'technician_name' => $team ?: $a->technician?->name,
                    'technician_phone' => $a->technician?->phone,
                    'assigned_by_id' => $a->assigned_by_id,
                    'assigned_by_role' => $a->assigned_by_role,
                    'is_manual_assignment' => (bool) $a->is_manual_assignment,
                    'status' => $a->status,
                    'scheduled_visit_at' => $a->scheduled_visit_at?->toIso8601String(),
                    'notes' => $a->notes,
                    'assigned_at' => $a->assigned_at?->toIso8601String(),
                    'started_at' => $a->started_at?->toIso8601String(),
                    'resolved_at' => $a->resolved_at?->toIso8601String(),
                    'returned_at' => $a->returned_at?->toIso8601String(),
                    'return_reason' => $a->return_reason,
                ];
            }),
            'all_assignments' => $this->whenLoaded('assignments', fn () => $this->assignments->map(fn ($a) => [
                'id' => $a->id,
                'technician_id' => $a->technician_id,
                'technician_name' => $a->technician?->name,
                'technician_phone' => $a->technician?->phone,
                'assigned_by_role' => $a->assigned_by_role,
                'is_manual_assignment' => (bool) $a->is_manual_assignment,
                'status' => $a->status,
                'scheduled_visit_at' => $a->scheduled_visit_at?->toIso8601String(),
                'notes' => $a->notes,
                'assigned_at' => $a->assigned_at?->toIso8601String(),
                'started_at' => $a->started_at?->toIso8601String(),
                'resolved_at' => $a->resolved_at?->toIso8601String(),
                'returned_at' => $a->returned_at?->toIso8601String(),
                'return_reason' => $a->return_reason,
            ])
            ),
            'evidence' => $this->whenLoaded('evidence', fn () => $this->evidence ? [
                'photos' => $this->evidence->photos,
                'description' => $this->evidence->description,
                'resolution_category' => $this->evidence->resolution_category?->value ?? $this->evidence->resolution_category,
                'opm_redaman' => $this->evidence->opm_redaman,
                'submitted_at' => $this->evidence->submitted_at?->toIso8601String(),
            ] : null),
            'logs' => $this->whenLoaded('logs', fn () => $this->logs->map(fn ($l) => [
                'id' => $l->id,
                'from_status' => $l->from_status,
                'to_status' => $l->to_status,
                'action' => $l->action,
                'actor_name' => $l->actor?->name,
                'actor_role' => $l->actor_role,
                'notes' => $l->notes,
                'created_at' => $l->created_at?->toIso8601String(),
            ])
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
