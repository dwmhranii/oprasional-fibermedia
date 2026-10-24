<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $status = 'pending';
        if ($this->revoked_at !== null) {
            $status = 'revoked';
        } elseif ($this->approved_at !== null) {
            $status = 'approved';
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'team' => $this->user->currentTeam?->name ?? $this->user->team,
            ] : null,
            'device_uuid' => $this->device_uuid,
            'label' => $this->label,
            'model' => $this->model,
            'platform' => $this->platform,
            'status' => $status,
            'is_approved' => $this->isApproved(),
            'approved_at' => $formatDate($this->approved_at),
            'approved_by' => $this->approvedBy ? [
                'id' => $this->approvedBy->id,
                'name' => $this->approvedBy->name,
            ] : null,
            'last_seen_at' => $formatDate($this->last_seen_at),
            'revoked_at' => $formatDate($this->revoked_at),
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
