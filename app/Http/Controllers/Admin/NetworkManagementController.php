<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CableTrackResource;
use App\Http\Resources\NetworkStatusLogResource;
use App\Http\Resources\OdpResource;
use App\Models\CableTrack;
use App\Models\Odp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Activitylog\Models\Activity;

class NetworkManagementController extends Controller
{
    /**
     * Riwayat perubahan status & log operasional perangkat jaringan.
     */
    public function logs(Request $request): AnonymousResourceCollection
    {
        $limit = min(100, (int) $request->input('per_page', 25));

        $logs = Activity::where('log_name', 'network')
            ->with('causer')
            ->latest('id')
            ->paginate($limit);

        return NetworkStatusLogResource::collection($logs);
    }

    /**
     * Daftar persetujuan tertunda untuk ODP (titik geser/usulan baru) dan Jalur Kabel usulan teknisi.
     */
    public function approvals(Request $request): JsonResponse
    {
        $pendingOdps = Odp::where('is_approved', false)
            ->orWhereNotNull('proposed_latitude')
            ->with(['odc', 'customers'])
            ->latest('id')
            ->get();

        $pendingCableTracks = CableTrack::where('status', 'proposed')
            ->with(['connectedOdc', 'connectedOdp', 'creator'])
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'pending_odps' => OdpResource::collection($pendingOdps),
                'pending_cable_tracks' => CableTrackResource::collection($pendingCableTracks),
            ],
        ]);
    }
}
