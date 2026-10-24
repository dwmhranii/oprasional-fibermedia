<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProvisioningResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $provData = $this->bfass_response['activation_details'] ?? $this->bfass_response['manual_provisioning'] ?? [];

        return [
            'id' => $this->id,
            'provisioning_number' => $this->provisioning_number,
            'submission_id' => $this->submission_id,
            'bfass_username' => $this->bfass_username ?? $provData['pppoe_username'] ?? $provData['username'] ?? null,
            'bfass_password' => $this->bfass_password ?? $provData['pppoe_password'] ?? $provData['password'] ?? null,
            'service_type' => $this->service_type ?? $provData['service_name'] ?? null,
            'bandwidth_profile' => $this->bandwidth_profile ?? $provData['internet_profile'] ?? null,
            'ip_address' => $this->ip_address ?? $provData['ip_address'] ?? null,
            'olt' => $this->olt ?? $provData['olt'] ?? null,
            'pon' => $this->pon ?? $provData['pon'] ?? null,
            'onu_model' => $this->onu_model ?? $provData['onu_model'] ?? null,
            'vlan' => $this->vlan ?? $provData['vlan'] ?? null,
            'odp' => $this->odp ?? $provData['odp'] ?? $provData['port'] ?? null,
            'onu_serial_number' => $this->onu_serial_number ?? $provData['onu_serial_number'] ?? $provData['onu_sn'] ?? null,
            'notes' => $this->notes,
            'status' => $this->status,
            'bfass_status' => $this->bfass_status,
            'bfass_response' => $this->bfass_response,
            'retry_count' => $this->retry_count,
            'error_log' => $this->error_log,
            'completed_at' => $formatDate($this->completed_at),
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
            'submission' => $this->whenLoaded('submission', fn () => new SubmissionResource($this->submission)),
            'admin' => $this->whenLoaded('admin'),
            'tasks' => $this->whenLoaded('tasks', function () {
                return $this->tasks->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'task_number' => $t->task_number,
                        'status' => $t->status?->value ?? $t->status,
                        'scheduled_date' => $t->scheduled_date,
                        'assigned_team' => $t->assigned_team,
                        'teknisi_id' => $t->teknisi_id,
                    ];
                });
            }),
        ];
    }
}
