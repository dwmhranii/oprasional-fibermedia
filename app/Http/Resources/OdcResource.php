<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OdcResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'address' => $this->address,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'capacity_odp' => (int) ($this->capacity_odp ?? 24),
            'used_odp_count' => $this->relationLoaded('odps') ? $this->odps->count() : $this->odps()->count(),
            'operational_status' => $this->operational_status ?? 'normal', // normal, disrupted, cut
            'wilayah' => $this->wilayah,
            'notes' => $this->notes,
            'odps' => $this->relationLoaded('odps') ? $this->odps->map(fn ($o) => [
                'id' => $o->id,
                'code' => $o->code,
                'name' => $o->name,
                'port_capacity' => (int) $o->port_capacity,
                'operational_status' => $o->operational_status ?? 'normal',
            ]) : null,
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
