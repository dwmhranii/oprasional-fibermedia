<?php

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $iso = fn ($d) => $d ? ($d instanceof CarbonInterface ? $d->toIso8601String() : \Carbon\Carbon::parse($d)->toIso8601String()) : null;

        $team = $this->currentTeam;
        $teamName = $team?->name ?? $this->team;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status ?? 'active',
            'team' => $teamName,
            'current_team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'order_index' => $team->order_index,
            ] : null,
            'roles' => $this->roles->pluck('name'),
            'role' => $this->roles->first()?->name,
            'permissions' => $this->whenLoaded('permissions', fn () => $this->permissions->pluck('name')),
            'coverage_areas' => $this->coverage_areas ?? [],
            'max_active_complaints' => (int) ($this->max_active_complaints ?? 5),
            'availability' => $this->availability ?? 'active',
            'last_complaint_assigned_at' => $iso($this->last_complaint_assigned_at),
            'created_at' => $iso($this->created_at),
            'updated_at' => $iso($this->updated_at),
        ];
    }
}
