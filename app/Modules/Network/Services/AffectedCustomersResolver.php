<?php

namespace App\Modules\Network\Services;

use App\Models\CableTrack;
use App\Models\Customer;
use App\Models\NetworkCable;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AffectedCustomersResolver
{
    /**
     * Selesaikan seluruh pelanggan terdampak dari simpul atau kabel tertentu.
     * Tidak termasuk pelanggan berstatus Berhenti (terminated) dan tanpa duplikat.
     * Mengembalikan data terstruktur:
     * - 'customers': Collection pelanggan
     * - 'total_affected': int
     * - 'isolated_count': int
     * - 'per_odp': Collection [odp_id, odp_code, odp_name, count]
     * - 'node_info': array metadata simpul
     */
    public function resolve(string $nodeType, int $nodeId): array
    {
        $nodeType = strtolower($nodeType);
        $customerQuery = Customer::query()
            ->whereNotIn(DB::raw('LOWER(status)'), ['terminated', 'berhenti'])
            ->with(['odp:id,code,name']);

        $targetOdpIds = [];
        $directCustomerIds = [];
        $nodeInfo = [];

        switch ($nodeType) {
            case 'odp':
                $odp = Odp::findOrFail($nodeId);
                $targetOdpIds = [$odp->id];
                $nodeInfo = [
                    'type' => 'odp',
                    'id' => $odp->id,
                    'code' => $odp->code,
                    'name' => $odp->name,
                    'latitude' => $odp->latitude ? (float) $odp->latitude : null,
                    'longitude' => $odp->longitude ? (float) $odp->longitude : null,
                    'address' => $odp->address ?? $odp->wilayah ?? "ODP {$odp->name}",
                ];
                break;

            case 'odc':
                $odc = Odc::findOrFail($nodeId);
                $targetOdpIds = Odp::where('odc_id', $odc->id)->pluck('id')->toArray();
                $nodeInfo = [
                    'type' => 'odc',
                    'id' => $odc->id,
                    'code' => $odc->code,
                    'name' => $odc->name,
                    'latitude' => $odc->latitude ? (float) $odc->latitude : null,
                    'longitude' => $odc->longitude ? (float) $odc->longitude : null,
                    'address' => $odc->address ?? $odc->wilayah ?? "ODC {$odc->name}",
                ];
                break;

            case 'olt':
                $olt = Olt::findOrFail($nodeId);
                $childOdcIds = Odc::where('olt_id', $olt->id)->pluck('id');
                $targetOdpIds = Odp::whereIn('odc_id', $childOdcIds)->pluck('id')->toArray();
                $nodeInfo = [
                    'type' => 'olt',
                    'id' => $olt->id,
                    'code' => $olt->code,
                    'name' => $olt->name,
                    'latitude' => $olt->latitude ? (float) $olt->latitude : null,
                    'longitude' => $olt->longitude ? (float) $olt->longitude : null,
                    'address' => $olt->address ?? "OLT {$olt->name}",
                ];
                break;

            case 'cable':
            case 'network_cable':
            case 'cable_track':
                $cable = NetworkCable::find($nodeId) ?? CableTrack::findOrFail($nodeId);
                $nodeInfo = [
                    'type' => 'cable',
                    'id' => $cable->id,
                    'code' => $cable->code ?? "CBL-{$cable->id}",
                    'name' => $cable->name,
                    'latitude' => null,
                    'longitude' => null,
                    'address' => "Kabel {$cable->name}",
                ];

                if (! empty($cable->route) && is_array($cable->route) && isset($cable->route[0])) {
                    $nodeInfo['longitude'] = (float) $cable->route[0][0];
                    $nodeInfo['latitude'] = (float) $cable->route[0][1];
                }

                $kind = $cable->kind ?? null;
                if ($kind === 'olt_odc') {
                    $toOdcId = $cable->to_id ?? $cable->connected_odc_id;
                    if ($toOdcId) {
                        $targetOdpIds = Odp::where('odc_id', $toOdcId)->pluck('id')->toArray();
                    }
                } elseif ($kind === 'odc_odp') {
                    $toOdpId = $cable->to_id ?? $cable->connected_odp_id;
                    if ($toOdpId) {
                        $targetOdpIds = [$toOdpId];
                    }
                } elseif ($kind === 'odp_customer') {
                    $toCustId = $cable->to_id;
                    if ($toCustId) {
                        $directCustomerIds = [$toCustId];
                    }
                } else {
                    if (! empty($cable->downstream_odp_ids)) {
                        $targetOdpIds = is_array($cable->downstream_odp_ids)
                            ? $cable->downstream_odp_ids
                            : json_decode($cable->downstream_odp_ids, true) ?? [];
                    } elseif ($cable->connected_odp_id) {
                        $targetOdpIds = [$cable->connected_odp_id];
                    } elseif ($cable->connected_odc_id) {
                        $targetOdpIds = Odp::where('odc_id', $cable->connected_odc_id)->pluck('id')->toArray();
                    }
                }
                break;

            default:
                throw new \InvalidArgumentException("Tipe simpul tidak valid: {$nodeType}");
        }

        $customerQuery->where(function ($q) use ($targetOdpIds, $directCustomerIds) {
            $hasCondition = false;
            if (! empty($targetOdpIds)) {
                $q->whereIn('odp_id', $targetOdpIds);
                $hasCondition = true;
            }
            if (! empty($directCustomerIds)) {
                if ($hasCondition) {
                    $q->orWhereIn('id', $directCustomerIds);
                } else {
                    $q->whereIn('id', $directCustomerIds);
                }
                $hasCondition = true;
            }
            if (! $hasCondition) {
                $q->whereRaw('1 = 0');
            }
        });

        $customers = $customerQuery->get();

        $totalAffected = $customers->count();
        $isolatedCount = $customers->filter(function ($c) {
            $st = strtolower((string) $c->status);

            return in_array($st, ['isolated', 'terisolir']);
        })->count();

        $perOdp = $customers->groupBy('odp_id')->map(function ($group, $odpId) {
            $first = $group->first();

            return [
                'odp_id' => $odpId,
                'odp_code' => $first?->odp?->code ?? "ODP-{$odpId}",
                'odp_name' => $first?->odp?->name ?? "ODP #{$odpId}",
                'count' => $group->count(),
            ];
        })->values();

        return [
            'customers' => $customers,
            'total_affected' => $totalAffected,
            'isolated_count' => $isolatedCount,
            'per_odp' => $perOdp,
            'node_info' => $nodeInfo,
        ];
    }
}
