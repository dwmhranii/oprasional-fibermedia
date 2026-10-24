<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\BfassHealthCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class BfassHealthController extends Controller
{
    public function __invoke(BfassHealthCheckService $healthCheckService): JsonResponse
    {
        Gate::authorize('manage_provisioning');

        $result = $healthCheckService->check();

        $status = 200;
        if (! $result['reachable'] || ! $result['auth_valid']) {
            $status = 503; // Service Unavailable
        }

        return response()->json([
            'status' => $status === 200 ? 'healthy' : 'unhealthy',
            'details' => $result,
        ], $status);
    }
}
