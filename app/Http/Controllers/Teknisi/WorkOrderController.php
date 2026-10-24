<?php

namespace App\Http\Controllers\Teknisi;

use App\Http\Controllers\Controller;
use App\Http\Resources\ComplaintDetailResource;
use App\Http\Resources\TaskResource;
use App\Models\Complaint;
use App\Models\Task;
use App\Services\WorkOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function __construct(
        private WorkOrderService $workOrderService
    ) {}

    /**
     * GET /api/teknisi/work-orders
     * Feed terpadu seluruh tugas lapangan teknisi (PSB + Gangguan)
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'type' => $request->query('type', 'all'),     // all | psb | complaint
            'tab' => $request->query('tab', $request->query('status', 'all')),
            'status' => $request->query('status', 'all'),
            'search' => $request->query('search'),
            'team' => $request->query('team'),
            'date' => $request->query('date'),
        ];

        $workOrders = $this->workOrderService->getTechnicianWorkOrders($request->user(), $filters);
        $counts = $this->workOrderService->getWorkOrderCounts($request->user(), [
            'type' => $filters['type'],
            'search' => $filters['search'],
            'team' => $filters['team'],
            'date' => $filters['date'],
        ]);

        return response()->json([
            'success' => true,
            'total' => $workOrders->count(),
            'counts' => $counts,
            'data' => $workOrders,
        ]);
    }

    /**
     * GET /api/teknisi/work-orders/{id}
     * Ambil detail spesifik dari Work Order (misal: "WO-CMP-12" atau "WO-TSK-4")
     */
    public function show(Request $request, string $id): JsonResponse
    {
        if (str_starts_with($id, 'WO-CMP-')) {
            $complaintId = (int) str_replace('WO-CMP-', '', $id);
            $complaint = Complaint::with(['customer', 'attendances.technician', 'currentAssignment.technician', 'evidence'])->findOrFail($complaintId);

            return response()->json([
                'success' => true,
                'type' => 'complaint',
                'data' => new ComplaintDetailResource($complaint),
            ]);
        }

        if (str_starts_with($id, 'WO-TSK-')) {
            $taskId = (int) str_replace('WO-TSK-', '', $id);
            $task = Task::with(['provisioning.submission', 'assignments.user'])->findOrFail($taskId);

            return response()->json([
                'success' => true,
                'type' => 'psb',
                'data' => new TaskResource($task),
            ]);
        }

        return response()->json(['message' => 'Format ID Work Order tidak valid.'], 400);
    }
}
