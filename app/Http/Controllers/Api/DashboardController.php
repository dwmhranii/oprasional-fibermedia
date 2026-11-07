<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    /**
     * GET /api/dashboard/summary
     * Query params:
     * - period: 'today' | '7d' | '30d' (default: 'today')
     * - refresh: '1' | 'true' (force cache refresh)
     */
    public function summary(Request $request): JsonResponse
    {
        $period = $request->query('period', 'today');
        $forceRefresh = $request->boolean('refresh');

        $data = $this->dashboardService->getSummary(
            $request->user(),
            $period,
            $forceRefresh
        );

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * POST /api/dashboard/clear-cache
     */
    public function clearCache(): JsonResponse
    {
        DashboardService::clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Cache dashboard berhasil dibersihkan.',
        ]);
    }
}
