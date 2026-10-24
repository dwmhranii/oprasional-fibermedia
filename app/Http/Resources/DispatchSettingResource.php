<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DispatchSettingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = is_array($this->resource) ? $this->resource : $this->resource->toArray();

        $minMembers = (int) ($data['min_members_present'] ?? 1);
        $timeout = (int) ($data['accept_timeout_menit'] ?? 15);
        $maxOper = (int) ($data['max_oper'] ?? 3);

        return [
            'min_members_present' => $minMembers,
            'accept_timeout_menit' => $timeout,
            'max_oper' => $maxOper,

            // Backward compatibility aliases
            'min_members' => $minMembers,
            'timeout_minutes' => $timeout,
            'response_timeout_minutes' => $timeout,
            'max_handover' => $maxOper,
        ];
    }
}
