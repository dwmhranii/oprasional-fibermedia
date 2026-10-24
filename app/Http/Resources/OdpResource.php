<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OdpResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $odc = $this->relationLoaded('odc') ? $this->odc : $this->odc()->first();
        $customers = $this->relationLoaded('customers')
            ? $this->customers
            : $this->customers()->where('status', '!=', 'terminated')->get();

        $customersByPort = $customers->keyBy('odp_port');
        $portCapacity = (int) ($this->port_capacity ?? 8);

        $ports = [];
        for ($i = 1; $i <= $portCapacity; $i++) {
            $cust = $customersByPort->get($i);
            $ports[] = [
                'port_number' => $i,
                'is_occupied' => ! empty($cust),
                'customer' => $cust ? [
                    'id' => $cust->id,
                    'customer_code' => $cust->customer_code,
                    'name' => $cust->name,
                    'phone' => $cust->phone,
                    'status' => $cust->status,
                    'monthly_price' => (float) $cust->monthly_price,
                ] : null,
            ];
        }

        $usedPorts = $customers->whereNotNull('odp_port')->count();
        $freePorts = max(0, $portCapacity - $usedPorts);

        return [
            'id' => $this->id,
            'client_uuid' => $this->client_uuid,
            'odc_id' => $this->odc_id,
            'odc' => $odc ? [
                'id' => $odc->id,
                'code' => $odc->code,
                'name' => $odc->name,
                'address' => $odc->address,
                'operational_status' => $odc->operational_status ?? 'normal',
            ] : null,
            'code' => $this->code,
            'name' => $this->name,
            'address' => $this->address,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'proposed_latitude' => $this->proposed_latitude !== null ? (float) $this->proposed_latitude : null,
            'has_pending_location_change' => $this->proposed_latitude !== null && $this->proposed_longitude !== null &&
                ($this->proposed_latitude != $this->latitude || $this->proposed_longitude != $this->longitude),
            'has_pending_relocation' => $this->proposed_latitude !== null && $this->proposed_longitude !== null &&
                ($this->proposed_latitude != $this->latitude || $this->proposed_longitude != $this->longitude),
            'port_capacity' => $portCapacity,
            'used_ports' => $usedPorts,
            'occupied_ports_count' => $usedPorts,
            'free_ports' => $freePorts,
            'available_ports_count' => $freePorts,
            'wilayah' => $this->wilayah,
            'notes' => $this->notes,
            'is_active' => (bool) $this->is_active,
            'status' => $this->status ?? 'active',
            'operational_status' => $this->operational_status ?? 'normal', // normal, disrupted, cut
            'is_approved' => (bool) $this->is_approved,
            'ports' => $ports,
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
