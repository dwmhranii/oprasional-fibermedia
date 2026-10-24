<?php

namespace App\Modules\Network\Services;

use App\Models\BrasDevice;
use App\Models\Odp;

class NetworkService
{
    /**
     * Get active BRAS devices.
     */
    public function getActiveBrasDevices()
    {
        return BrasDevice::where('is_active', true)->get();
    }

    /**
     * Get ODPs with port availability.
     */
    public function getOdpsWithAvailability(array $filters = [])
    {
        $query = Odp::withCount(['activeCustomers'])->where('is_active', true);

        if (! empty($filters['wilayah'])) {
            $query->where('wilayah', $filters['wilayah']);
        }

        return $query->get()->map(function ($odp) {
            $freePorts = $odp->freePorts();

            return [
                'id' => $odp->id,
                'code' => $odp->code,
                'name' => $odp->name,
                'port_capacity' => $odp->port_capacity,
                'used_ports_count' => $odp->active_customers_count,
                'free_ports' => $freePorts,
                'has_available_port' => ! empty($freePorts),
            ];
        });
    }
}
