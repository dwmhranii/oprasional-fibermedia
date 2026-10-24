<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CableTrackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $coords = $this->coordinates;
        $isDrawn = is_array($coords) && count($coords) >= 2;

        return [
            'id' => $this->id,
            'client_uuid' => $this->client_uuid,
            'name' => $this->name,
            'coordinates' => $coords ?? [],
            'coordinates_count' => is_array($coords) ? count($coords) : 0,
            'is_drawn' => $isDrawn,
            'total_length_meters' => (float) ($this->total_length_meters ?? 0),
            'status' => $this->status ?? 'active',
            'operational_status' => $this->operational_status ?? 'normal', // normal, disrupted, cut
            'is_approved' => (bool) ($this->is_approved ?? true),
            'connected_odc_id' => $this->connected_odc_id,
            'connected_odc' => $this->connectedOdc ? [
                'id' => $this->connectedOdc->id,
                'code' => $this->connectedOdc->code,
                'name' => $this->connectedOdc->name,
            ] : null,
            'connected_odp_id' => $this->connected_odp_id,
            'connected_odp' => $this->connectedOdp ? [
                'id' => $this->connectedOdp->id,
                'code' => $this->connectedOdp->code,
                'name' => $this->connectedOdp->name,
            ] : null,
            'downstream_odp_ids' => $this->downstream_odp_ids ?? [],
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null,
            'notes' => $this->notes,
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
