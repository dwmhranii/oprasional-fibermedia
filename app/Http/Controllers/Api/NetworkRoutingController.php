<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Network\RoadRoutingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NetworkRoutingController extends Controller
{
    public function __construct(
        protected RoadRoutingService $routingService
    ) {}

    /**
     * Dapatkan rute mengikuti kontur jalan antara dua titik sebagai bantuan menggambar jalur kabel.
     */
    public function snapRoute(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'origin' => 'required|array|size:2',
            'origin.0' => 'required|numeric|between:-180,180',
            'origin.1' => 'required|numeric|between:-90,90',
            'destination' => 'required|array|size:2',
            'destination.0' => 'required|numeric|between:-180,180',
            'destination.1' => 'required|numeric|between:-90,90',
        ]);

        $origin = [(float) $validated['origin'][0], (float) $validated['origin'][1]];
        $destination = [(float) $validated['destination'][0], (float) $validated['destination'][1]];

        $result = $this->routingService->routeAlongRoad($origin, $destination);

        return response()->json([
            'success' => $result['success'],
            'coordinates' => $result['coordinates'],
            'distance_meters' => $result['distance_meters'],
            'snapped_to_road' => $result['snapped_to_road'],
            'message' => $result['message'],
        ]);
    }
}
