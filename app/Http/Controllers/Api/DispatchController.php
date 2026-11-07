<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssignmentLog;
use App\Models\Complaint;
use App\Models\DispatchSetting;
use App\Models\Media;
use App\Models\Phase2Requirement;
use App\Models\Task;
use App\Models\Team;
use App\Models\TicketAttendance;
use App\Models\TicketEvent;
use App\Models\User;
use App\Modules\Dispatch\Services\DispatchService;
use App\Http\Resources\AssignmentLogResource;
use App\Http\Resources\DispatchSettingResource;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DispatchController extends Controller
{
    public function __construct(
        protected DispatchService $dispatchService
    ) {}

    /**
     * Ambil tiket aktif tim teknisi saat ini (Fase 2 PWA: satu tim satu tiket).
     * GET /api/field/tickets/current
     */
    public function getCurrentTicket(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam ?? Team::find($user->team_id);
        if (! $team && ! empty($user->team)) {
            $team = Team::where('name', $user->team)->first();
        }

        if (! $team) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'User belum terdaftar dalam tim teknisi.',
            ]);
        }

        // 1. Cek Task PSB aktif
        $task = Task::with('provisioning.submission')
            ->where('assigned_team_id', $team->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->orderByDesc('assigned_at')
            ->first();

        if ($task) {
            $acceptedUser = $task->accepted_by_id ? User::find($task->accepted_by_id) : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => 'psb',
                    'id' => $task->id,
                    'number' => $task->task_number,
                    'status' => $task->status,
                    'customer_name' => $task->provisioning?->submission?->customer_name ?? 'Pelanggan PSB',
                    'address' => $task->provisioning?->submission?->address ?? '-',
                    'phone' => $task->provisioning?->submission?->customer_phone ?? '-',
                    'deadline' => $task->response_deadline_at?->toIso8601String(),
                    'accepted_at' => $task->accepted_at?->toIso8601String(),
                    'accepted_by' => $acceptedUser?->name,
                    'reassign_count' => $task->reassign_count ?? 0,
                    'team_name' => $team->name,
                ],
            ]);
        }

        // 2. Cek Complaint aktif
        $complaint = Complaint::with('customer')
            ->where('assigned_team_id', $team->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->orderByDesc('assigned_at')
            ->first();

        if ($complaint) {
            $acceptedUser = $complaint->accepted_by_id ? User::find($complaint->accepted_by_id) : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => 'complaint',
                    'id' => $complaint->id,
                    'number' => $complaint->ticket_number ?? ('CMP-'.$complaint->id),
                    'status' => $complaint->status,
                    'customer_name' => $complaint->customer?->name ?? 'Pelanggan Gangguan',
                    'address' => $complaint->customer?->address ?? $complaint->address ?? '-',
                    'phone' => $complaint->customer?->phone ?? '-',
                    'deadline' => $complaint->response_deadline_at?->toIso8601String(),
                    'accepted_at' => $complaint->accepted_at?->toIso8601String(),
                    'accepted_by' => $acceptedUser?->name,
                    'reassign_count' => $complaint->reassign_count ?? 0,
                    'team_name' => $team->name,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Tidak ada tiket yang sedang ditugaskan ke tim Anda.',
        ]);
    }

    /**
     * Terima tiket oleh personil tim yang hadir di PWA.
     * POST /api/field/tickets/{type}/{id}/accept
     */
    public function acceptTicket(Request $request, string $type, int $id): JsonResponse
    {
        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);

        try {
            $result = $this->dispatchService->acceptTicket($ticket, $type, $request->user());

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => $result['ticket'],
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Tolak tiket oleh personil tim di PWA dengan alasan wajib.
     * POST /api/field/tickets/{type}/{id}/decline
     */
    public function declineTicket(Request $request, string $type, int $id): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|min:3|max:500',
        ]);

        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);

        try {
            $result = $this->dispatchService->declineTicket($ticket, $type, $request->user(), $request->reason);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'status' => $result['status'],
                'team' => $result['team'] ?? null,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Ambil pengaturan dispatch saat ini.
     * GET /api/admin/dispatch-settings
     */
    public function getSettings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new DispatchSettingResource(DispatchSetting::getEffective()),
        ]);
    }

    /**
     * Perbarui pengaturan dispatch (Admin / Superadmin).
     * PUT /api/admin/dispatch-settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'min_members_present' => 'nullable|integer|min:1',
            'accept_timeout_menit' => 'nullable|integer|min:1',
            'max_oper' => 'nullable|integer|min:1',
        ]);

        $current = DispatchSetting::getEffective();
        $minMembers = $data['min_members_present'] ?? $current['min_members_present'];
        $timeout = $data['accept_timeout_menit'] ?? $current['accept_timeout_menit'];
        $maxOper = $data['max_oper'] ?? $current['max_oper'];

        // Update main configuration row
        DB::table('dispatch_settings')->updateOrInsert(
            ['ticket_type' => null, 'key' => null],
            [
                'value' => json_encode(['default' => true]),
                'min_members_present' => $minMembers,
                'accept_timeout_menit' => $timeout,
                'max_oper' => $maxOper,
                'updated_at' => now(),
            ]
        );

        // Also update individual key entries for backwards compatibility
        DB::table('dispatch_settings')->updateOrInsert(
            ['key' => 'min_members_present'],
            ['value' => json_encode($minMembers), 'ticket_type' => null, 'updated_at' => now()]
        );
        DB::table('dispatch_settings')->updateOrInsert(
            ['key' => 'accept_timeout_menit'],
            ['value' => json_encode($timeout), 'ticket_type' => null, 'updated_at' => now()]
        );
        DB::table('dispatch_settings')->updateOrInsert(
            ['key' => 'max_oper'],
            ['value' => json_encode($maxOper), 'ticket_type' => null, 'updated_at' => now()]
        );

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan dispatch berhasil diperbarui.',
            'data' => new DispatchSettingResource(DispatchSetting::getEffective()),
        ]);
    }

    /**
     * Ambil antrean tertunda / belum ditugaskan.
     * GET /api/admin/dispatch/pending
     */
    public function getPendingTickets(): JsonResponse
    {
        $tasks = Task::with('provisioning.submission')
            ->where('status', 'unassigned')
            ->orWhere(function ($q) {
                $q->whereNull('assigned_team_id')
                    ->whereIn('status', ['created', 'pending', 'unassigned']);
            })
            ->orderBy('created_at')
            ->get();

        $complaints = Complaint::where('status', 'unassigned')
            ->orWhere(function ($q) {
                $q->whereNull('assigned_team_id')
                    ->whereIn('status', ['submitted', 'open', 'unassigned']);
            })
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'psb' => $tasks,
                'complaints' => $complaints,
                'total_pending' => $tasks->count() + $complaints->count(),
            ],
        ]);
    }

    /**
     * Riwayat log penugasan (assignment_logs).
     * GET /api/admin/assignment-logs
     */
    public function getAssignmentLogs(Request $request): JsonResponse
    {
        $query = AssignmentLog::with(['team', 'actor'])->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('team_id')) {
            $query->where('team_id', $request->team_id);
        }

        if ($request->filled('ticket_type')) {
            $query->where('ticket_type', $request->ticket_type);
        }

        if ($request->filled('ticket_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('ticket_id', $request->ticket_id)
                    ->orWhere('assignable_id', $request->ticket_id);
            });
        }

        $logs = $query->paginate($request->input('per_page', 25));

        return AssignmentLogResource::collection($logs)
            ->additional(['success' => true])
            ->response();
    }

    /**
     * Penugasan manual dengan alasan wajib.
     * POST /api/admin/dispatch/manual-assign
     */
    public function manualAssign(Request $request): JsonResponse
    {
        $request->validate([
            'ticket_type' => 'required|in:psb,complaint',
            'ticket_id' => 'required|integer',
            'team_id' => 'required|exists:teams,id',
            'reason' => 'required|string|min:3|max:500',
        ]);

        $ticket = $request->ticket_type === 'psb'
            ? Task::findOrFail($request->ticket_id)
            : Complaint::findOrFail($request->ticket_id);

        $team = Team::findOrFail($request->team_id);

        $result = $this->dispatchService->assignManual(
            $ticket,
            $request->ticket_type,
            $team,
            $request->reason,
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => "Tiket berhasil ditugaskan manual ke tim {$team->name}.",
            'data' => $result,
        ]);
    }

    /**
     * Jalankan pembagian sekarang untuk tiket yang belum ditugaskan.
     * POST /api/admin/dispatch/tickets/{type}/{id}/dispatch-now
     */
    public function dispatchNow(string $type, int $id): JsonResponse
    {
        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);
        $result = $this->dispatchService->assign($ticket, $type, [
            'reason' => 'Pembagian langsung oleh admin (dispatch now)',
            'actor_id' => auth()->id(),
        ]);

        return response()->json([
            'success' => $result['assigned'] ?? false,
            'message' => $result['message'] ?? ($result['assigned'] ? 'Tiket berhasil dibagikan.' : 'Tidak ada tim siap.'),
            'data' => $result,
        ]);
    }

    /**
     * GET /api/admin/dispatch/tickets/{type}/{id}/unified-detail
     * Mengembalikan detail terpadu tiket dengan tab Ringkasan, Penugasan (riwayat assignment_logs), dan Riwayat (ticket_events).
     */
    public function unifiedDetail(string $type, int $id): \App\Http\Resources\UnifiedTicketDetailResource
    {
        $isTask = in_array(strtolower($type), ['task', 'psb', 'provisioning']);
        $ticket = $isTask
            ? Task::with(['provisioning.submission', 'assignedTeam.activeUsers'])->findOrFail($id)
            : Complaint::with(['customer', 'assignedTeam.activeUsers'])->findOrFail($id);

        $number = $isTask
            ? ($ticket->task_number ?? 'TSK-'.$ticket->id)
            : ($ticket->ticket_number ?? 'CMP-'.$ticket->id);

        $customerName = $isTask
            ? ($ticket->provisioning?->submission?->customer_name ?? 'Pelanggan PSB')
            : ($ticket->customer_name ?? $ticket->customer?->name ?? 'Pelanggan Gangguan');

        $phone = $isTask
            ? ($ticket->provisioning?->submission?->phone ?? $ticket->provisioning?->submission?->customer_phone ?? '-')
            : ($ticket->customer_phone ?? $ticket->customer?->phone ?? '-');

        $address = $isTask
            ? ($ticket->provisioning?->submission?->address ?? '-')
            : ($ticket->customer_address ?? $ticket->customer?->address ?? '-');

        $area = $isTask
            ? ($ticket->provisioning?->submission?->area ?? '-')
            : ($ticket->area ?? '-');

        $coordinates = [
            'lat' => $isTask
                ? ($ticket->provisioning?->submission?->lat ? (float) $ticket->provisioning->submission->lat : null)
                : ($ticket->customer_lat ? (float) $ticket->customer_lat : null),
            'lng' => $isTask
                ? ($ticket->provisioning?->submission?->lng ? (float) $ticket->provisioning->submission->lng : null)
                : ($ticket->customer_lng ? (float) $ticket->customer_lng : null),
        ];

        $iso = fn ($d) => $d ? ($d instanceof CarbonInterface ? $d->toIso8601String() : Carbon::parse($d)->toIso8601String()) : null;

        // 1. Assignment logs
        $assignmentLogs = AssignmentLog::with(['team', 'actor'])
            ->where(function ($q) use ($ticket) {
                $q->where('assignable_type', get_class($ticket))
                    ->where('assignable_id', $ticket->id);
            })
            ->orWhere(function ($q) use ($type, $id) {
                $q->where('ticket_type', $type)
                    ->where('ticket_id', $id);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'team_name' => $log->team?->name ?? 'Tanpa Tim',
                'action' => $log->action,
                'reason' => $log->reason,
                'actor_name' => $log->actor?->name ?? 'Sistem',
                'attempt_no' => $log->attempt_no,
                'created_at' => $iso($log->created_at),
            ]);

        // 2. Ticket events
        $ticketEvents = TicketEvent::with('actor')
            ->where('eventable_type', get_class($ticket))
            ->where('eventable_id', $ticket->id)
            ->orderByDesc('occurred_at')
            ->get()
            ->map(fn ($ev) => [
                'id' => $ev->id,
                'event' => $ev->event,
                'from_status' => $ev->from_status,
                'to_status' => $ev->to_status,
                'payload' => $ev->payload,
                'actor_name' => $ev->actor?->name ?? 'Sistem',
                'occurred_at' => $iso($ev->occurred_at),
            ]);

        // 3. Tim aktif yang tersedia
        $availableTeams = Team::where('is_active', true)
            ->orderBy('order_index')
            ->get(['id', 'name', 'order_index']);

        // 4. Media & Bukti Pengerjaan Lapangan
        $mediaList = Media::where('mediable_type', get_class($ticket))
            ->where('mediable_id', $ticket->id)
            ->with('uploader:id,name')
            ->get();

        $beforeMedia = $mediaList->firstWhere('kind', 'before');
        $afterMedia = $mediaList->firstWhere('kind', 'after');
        $signatureMedia = $mediaList->firstWhere('kind', 'signature');

        // Attendances & Phase 2 Requirements
        $attendances = TicketAttendance::where('attendable_type', get_class($ticket))
            ->where('attendable_id', $ticket->id)
            ->with(['user:id,name,phone', 'selfieMedia'])
            ->get()
            ->map(fn ($att) => [
                'id' => $att->id,
                'user_id' => $att->user_id,
                'user_name' => $att->user?->name,
                'user_phone' => $att->user?->phone,
                'selfie_url' => $att->selfieMedia?->signed_url,
                'lat' => (float) $att->lat,
                'lng' => (float) $att->lng,
                'accuracy' => $att->accuracy !== null ? (float) $att->accuracy : null,
                'distance_meters' => $att->distance_meters !== null ? (float) $att->distance_meters : null,
                'geofence_status' => $att->geofence_status,
                'captured_at' => $iso($att->captured_at),
                'received_at' => $iso($att->received_at),
                'is_anomaly' => $att->selfieMedia?->is_anomaly ?? false,
                'anomaly_reasons' => $att->selfieMedia?->anomaly_reasons ?? [],
            ]);

        $phase2Requirements = Phase2Requirement::where('assignable_type', get_class($ticket))
            ->where('assignable_id', $ticket->id)
            ->with(['user:id,name,phone', 'waivedBy:id,name'])
            ->get()
            ->map(fn ($req) => [
                'id' => $req->id,
                'user_id' => $req->user_id,
                'user_name' => $req->user?->name,
                'completed_at' => $iso($req->completed_at),
                'waived_by_id' => $req->waived_by_id,
                'waived_by_name' => $req->waivedBy?->name,
                'waive_reason' => $req->waive_reason,
            ]);

        $reviewer = $ticket->reviewed_by ? User::find($ticket->reviewed_by) : null;
        $statusStr = (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status);

        return (new \App\Http\Resources\UnifiedTicketDetailResource([
            'ticket_number' => $number,
            'ticket' => [
                'id' => $ticket->id,
                'type' => $type,
                'type_label' => $isTask ? 'Pasang Baru (PSB)' : 'Gangguan (Komplain)',
                'number' => $number,
                'ticket_number' => $number,
                'task_number' => $number,
                    'status' => $statusStr,
                    'customer_name' => $customerName,
                    'phone' => $phone,
                    'address' => $address,
                    'area' => $area,
                    'coordinates' => $coordinates,
                    'assigned_team' => $ticket->assignedTeam?->name ?? $ticket->assigned_team,
                    'assigned_team_id' => $ticket->assigned_team_id,
                    'assigned_at' => $iso($ticket->assigned_at),
                    'response_deadline_at' => $iso($ticket->response_deadline_at),
                    'created_at' => $iso($ticket->created_at),
                    'updated_at' => $iso($ticket->updated_at),
                    'review_status' => $ticket->review_status ?? 'none',
                    'review_flags' => $ticket->review_flags ?? [],
                    'reviewed_by_name' => $reviewer?->name,
                    'reviewed_at' => $iso($ticket->reviewed_at),
                    'review_note' => $ticket->review_note,
                    'has_port_conflict' => (bool) ($ticket->has_port_conflict ?? false),
                    'priority' => $ticket->priority instanceof \BackedEnum ? $ticket->priority->value : ($ticket->priority ?? 'medium'),
                    'sla_target_minutes' => $isTask ? 1440 : (int) ($ticket->sla_target_minutes ?: \App\Models\SlaSetting::getMinutesForPriority($ticket->priority?->value ?? 'medium')),
                    'sla_resolve_due_at' => $iso($ticket->sla_resolve_due_at),
                    'sla_paused_at' => $iso($ticket->sla_paused_at),
                    'sla_progress' => $isTask ? null : app(\App\Services\ComplaintSlaService::class)->getProgress($ticket),
                    'can_reopen' => $isTask ? false : ($ticket instanceof Complaint ? $ticket->canBeReopened() : false),
                    'pause_reason' => $ticket->pauseReason?->reason ?? null,
                ],
                'current_team' => $ticket->assignedTeam ? [
                    'id' => $ticket->assignedTeam->id,
                    'name' => $ticket->assignedTeam->name,
                    'members' => $ticket->assignedTeam->activeUsers->map(fn ($u) => [
                        'id' => $u->id,
                        'name' => $u->name,
                        'phone' => $u->phone,
                    ]),
                ] : null,
                'available_teams' => $availableTeams,
                'assignment_logs' => $assignmentLogs,
                'ticket_events' => $ticketEvents,
                'phase1' => [
                    'photo_before_url' => $beforeMedia?->signed_url,
                    'photo_after_url' => $afterMedia?->signed_url,
                    'signature_url' => $signatureMedia?->signed_url,
                    'odp_id' => $ticket->selected_odp_id ?? null,
                    'odp_port' => $ticket->selected_odp_port ?? null,
                    'onu_index' => $ticket->provisioning?->onu_index ?? null,
                    'optical_power' => $ticket->provisioning?->optical_power ?? null,
                    'completion_notes' => $ticket->completion_notes ?? $ticket->resolution_category ?? null,
                    'has_port_conflict' => (bool) ($ticket->has_port_conflict ?? false),
                ],
                'evidence' => [
                    'attendances' => $attendances,
                    'phase2_requirements' => $phase2Requirements,
                    'has_anomalies' => $mediaList->contains('is_anomaly', true),
                ],
            ]))->additional(['success' => true]);
    }
}
