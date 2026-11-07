<?php

namespace App\Http\Controllers\Teknisi;

use App\Enums\ComplaintStatus;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ComplaintDetailResource;
use App\Http\Resources\TaskResource;
use App\Models\Complaint;
use App\Models\ComplaintLog;
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

    /**
     * POST /api/work-orders/{id}/accept
     * Alur Terima Tiket oleh Teknisi untuk seluruh jenis Work Order (PSB + Pengaduan)
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (str_starts_with($id, 'WO-CMP-') || is_numeric($id)) {
            $complaintId = is_numeric($id) ? (int) $id : (int) str_replace('WO-CMP-', '', $id);
            $complaint = Complaint::findOrFail($complaintId);

            if ($complaint->status === ComplaintStatus::ASSIGNED || $complaint->status === ComplaintStatus::OPEN) {
                $complaint->update(['status' => ComplaintStatus::IN_PROGRESS]);

                if ($complaint->currentAssignment) {
                    $complaint->currentAssignment->update([
                        'status' => 'in_progress',
                        'started_at' => now(),
                    ]);
                }

                ComplaintLog::create([
                    'complaint_id' => $complaint->id,
                    'from_status' => ComplaintStatus::ASSIGNED->value,
                    'to_status' => ComplaintStatus::IN_PROGRESS->value,
                    'action' => 'accepted',
                    'notes' => 'Tiket pengaduan diterima oleh teknisi di PWA.',
                    'actor_id' => $user?->id,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Tiket pengaduan berhasil diterima.',
                    'data' => [
                        'id' => $complaint->id,
                        'status' => ComplaintStatus::IN_PROGRESS->value,
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => "Tiket sudah berstatus {$complaint->status->value}.",
                'data' => [
                    'id' => $complaint->id,
                    'status' => $complaint->status->value,
                ],
            ]);
        }

        if (str_starts_with($id, 'WO-TSK-')) {
            $taskId = (int) str_replace('WO-TSK-', '', $id);
            $task = Task::findOrFail($taskId);

            $task->update([
                'status' => TaskStatus::IN_PROGRESS,
                'started_at' => $task->started_at ?? now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tugas PSB berhasil diterima.',
                'data' => [
                    'id' => $task->id,
                    'status' => TaskStatus::IN_PROGRESS->value,
                ],
            ]);
        }

        return response()->json(['message' => 'Format ID Work Order tidak valid.'], 400);
    }
}
