<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\WorkOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FleetTrackingController extends Controller
{
    public function __construct(
        private WorkOrderService $workOrderService
    ) {}

    /**
     * GET /api/admin/tracking/live-map
     * Data peta live sebaran teknisi, PSB, dan Komplain aktif di Malang Raya
     */
    public function liveMap(Request $request): JsonResponse
    {
        $filters = [
            'team' => $request->query('team', 'all'),
            'type' => $request->query('type', 'all'), // all | psb | complaint
            'status' => 'active',
        ];

        $data = $this->workOrderService->getLiveTrackingMap($filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * GET /api/admin/work-orders
     * Daftar terpadu seluruh Work Order di sistem untuk pemantauan Admin / Superadmin
     * TIDAK memiliki method POST (hanya pantau / read-only).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'team' => $request->query('team', 'all'),
            'type' => $request->query('type', 'all'),
            'tab' => $request->query('tab', $request->query('status', 'all')),
            'date' => $request->query('date'),
            'search' => $request->query('search'),
        ];

        $workOrders = $this->workOrderService->getTechnicianWorkOrders($request->user(), $filters);
        $counts = $this->workOrderService->getWorkOrderCounts($request->user(), [
            'team' => $filters['team'],
            'type' => $filters['type'],
            'date' => $filters['date'],
            'search' => $filters['search'],
        ]);

        return response()->json([
            'success' => true,
            'total' => $workOrders->count(),
            'counts' => $counts,
            'data' => $workOrders,
        ]);
    }
}
