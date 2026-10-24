<?php

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $iso = fn ($d) => $d ? ($d instanceof CarbonInterface ? $d->toIso8601String() : \Carbon\Carbon::parse($d)->toIso8601String()) : null;

        return [
            'id' => $this->id,
            'assignable_type' => $this->assignable_type,
            'assignable_id' => $this->assignable_id,
            'ticket_type' => $this->ticket_type,
            'ticket_id' => $this->ticket_id,
            'team_id' => $this->team_id,
            'team_name' => $this->team?->name,
            'team' => $this->team ? [
                'id' => $this->team->id,
                'name' => $this->team->name,
            ] : null,
            'action' => $this->action,
            'reason' => $this->reason,
            'actor_id' => $this->actor_id,
            'actor_name' => $this->actor?->name ?? 'Sistem',
            'actor' => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
            ] : null,
            'attempt_no' => (int) ($this->attempt_no ?? 1),
            'created_at' => $iso($this->created_at),
            'updated_at' => $iso($this->updated_at),
        ];
    }
}
