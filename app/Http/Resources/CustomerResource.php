<?php

namespace App\Http\Resources;

use App\Enums\SubmissionStatus;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Kolom sensitif (nik dan password) TIDAK PERNAH masuk dalam bentuk mentah ke Resource ini.
     */
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $submission = $this->relationLoaded('submission') ? $this->submission : $this->submission()->first();
        $provisioning = $submission && $submission->relationLoaded('provisioning') ? $submission->provisioning : $submission?->provisioning()->first();
        $task = $provisioning && $provisioning->relationLoaded('tasks') ? $provisioning->tasks->first() : $provisioning?->tasks()->with(['teknisi', 'assignments.evidence'])->first();

        $signaturePath = $task?->customer_signature_path;
        $signatureUrl = $signaturePath ? Storage::url($signaturePath) : null;

        $evidence = $task?->assignments?->first()?->evidence ?? $task?->assignments?->first()?->completionEvidence;
        $evidenceSignature = $evidence?->signature_path ? Storage::url($evidence->signature_path) : null;

        $hasBast = ! empty($signaturePath) || ! empty($evidence?->signature_path) || ($submission && $submission->status === SubmissionStatus::COMPLETED);

        // ODP with parent ODC
        $odp = $this->relationLoaded('odp') ? $this->odp : $this->odp;
        $odc = $odp && $odp->relationLoaded('odc') ? $odp->odc : $odp?->odc;

        $odpData = $odp ? [
            'id' => $odp->id,
            'code' => $odp->code,
            'name' => $odp->name,
            'address' => $odp->address ?? null,
            'latitude' => $odp->latitude ? (float) $odp->latitude : null,
            'longitude' => $odp->longitude ? (float) $odp->longitude : null,
            'port' => $this->odp_port,
            'notes' => $odp->description ?? $odp->notes ?? null,
            'odc' => $odc ? [
                'id' => $odc->id,
                'code' => $odc->code,
                'name' => $odc->name,
                'address' => $odc->address ?? null,
            ] : null,
        ] : null;

        // Tickets history
        $tickets = [];
        if ($this->relationLoaded('complaints')) {
            $tickets = $this->complaints->map(fn ($c) => [
                'id' => $c->id,
                'ticket_number' => $c->ticket_number ?? 'TKT-'.$c->id,
                'title' => $c->title ?? $c->description ?? 'Komplain',
                'status' => is_object($c->status) ? $c->status->value : $c->status,
                'priority' => $c->priority ?? 'normal',
                'created_at' => $formatDate($c->created_at),
            ]);
        }

        $user = $request->user();
        $canViewSecret = $user && $user->can('customers.view_secret');

        return [
            // Identitas
            'id' => $this->id,
            'customer_code' => $this->customer_code,
            'external_ref' => $this->external_ref,
            'name' => $this->name,
            'nik' => $this->masked_nik,
            'nik_masked' => $this->masked_nik,
            'phone' => $this->phone,
            'phone_normalized' => $this->phone_normalized,
            'email' => $this->email,
            'address' => $this->address,
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,

            // Layanan
            'service_type' => $this->service_type ?? 'pppoe',
            'bras_id' => $this->bras_id,
            'bras_name' => $this->bras?->name,
            'collector' => $this->collector,
            'username' => $this->username,
            'password_masked' => filled($this->password) ? '••••••••' : null,
            'package_id' => $this->package_id,
            'package' => $this->servicePackage?->name ?? $this->package,
            'package_name' => $this->servicePackage?->name ?? $this->package,
            'monthly_price' => (float) ($this->monthly_price ?: ($this->servicePackage?->price ?? 0)),
            'local_address' => $canViewSecret ? $this->local_address : null,
            'remote_address' => $canViewSecret ? $this->remote_address : null,
            'parent_queue' => $canViewSecret ? $this->parent_queue : null,
            'rate_limit' => $this->rate_limit,
            'subscribed_at' => $this->subscribed_at?->format('Y-m-d'),
            'expires_at' => $this->expires_at?->format('Y-m-d'),
            'status' => $this->status === 'held' ? 'terminated' : $this->status,
            'is_port_held' => $this->status === 'held',
            'is_online' => (bool) $this->is_online,
            'last_online_at' => $formatDate($this->last_online_at),
            'last_offline_at' => $formatDate($this->last_offline_at),
            'current_ip_address' => $canViewSecret ? $this->current_ip_address : null,
            'current_mac_address' => $canViewSecret ? $this->current_mac_address : null,
            'session_uptime' => $this->session_uptime,
            'session_id' => $canViewSecret ? $this->session_id : null,
            'onu_index' => $canViewSecret ? $this->onu_index : null,

            // Jaringan
            'odp_id' => $this->odp_id,
            'odp_code' => $this->odp?->code ?? $this->odp_code,
            'odp_name' => $this->odp?->name,
            'odp_port' => $this->odp_port,
            'odp' => $odpData,

            // Penagihan & Penempatan
            'debt' => (float) $this->debt,
            'wilayah' => $this->wilayah ?? $this->area,
            'installed_by_team_id' => $this->installed_by_team_id,
            'installed_by_team_name' => $this->installedByTeam?->name,
            'installed_task_id' => $this->installed_task_id,
            'sales_id' => $this->sales_id,
            'sales_name' => $this->sales?->name,
            'notes' => $this->notes,

            // Dokumen & Relasi Terkait
            'has_bast' => $hasBast,
            'signature_url' => $signatureUrl ?? $evidenceSignature,
            'tickets' => $tickets,
            'submission' => $submission ? [
                'id' => $submission->id,
                'submission_number' => $submission->submission_number,
                'customer_name' => $submission->customer_name,
                'phone' => $submission->phone,
                'email' => $submission->email,
                'address' => $submission->address,
                'package_name' => $submission->package_name,
                'package_speed' => $submission->package_speed,
                'package_price' => $submission->package_price,
                'total_price' => $submission->total_price,
                'status' => is_object($submission->status) ? $submission->status->value : $submission->status,
                'created_at' => $formatDate($submission->created_at),
                'sales_name' => $submission->user?->name,
            ] : null,
            'technical' => $provisioning ? [
                'provisioning_number' => $provisioning->provisioning_number,
                'bfass_username' => $provisioning->bfass_username,
                'vlan' => $provisioning->vlan,
                'odp' => $provisioning->odp ?? $this->odp_code,
                'onu_serial_number' => $provisioning->onu_serial_number,
                'ip_address' => $provisioning->ip_address,
                'status' => is_object($provisioning->status) ? $provisioning->status->value : $provisioning->status,
                'provisioned_at' => $formatDate($provisioning->provisioned_at),
            ] : null,
            'task' => $task ? [
                'id' => $task->id,
                'task_number' => $task->task_number,
                'teknisi_name' => $task->teknisi?->name,
                'status' => is_object($task->status) ? $task->status->value : $task->status,
                'completed_at' => $formatDate($task->completed_at),
                'photos' => $task->photos,
            ] : null,
            'service_chain' => [
                'submission_number' => $submission?->submission_number,
                'provisioning_number' => $provisioning?->provisioning_number,
                'task_number' => $task?->task_number,
                'customer_code' => $this->customer_code,
                'status' => $this->status === 'held' ? 'terminated' : $this->status,
            ],
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
