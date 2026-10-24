<?php

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KpiSettingResource extends JsonResource
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
            'key' => $this->key,
            'version' => (int) $this->version,
            'category' => $this->category,
            'value' => $this->value,
            'weights' => $this->weights,
            'targets' => $this->targets,
            'is_active' => (bool) $this->is_active,
            'read_only_until' => $this->read_only_until ? $this->read_only_until->toDateString() : null,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'creator_name' => $this->creator?->name,
            'created_at' => $iso($this->created_at),
            'updated_at' => $iso($this->updated_at),
        ];
    }
}
