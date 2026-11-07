<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\BfassHealthController;
use App\Http\Controllers\Admin\CableTrackController;
use App\Http\Controllers\Admin\ComplaintController as AdminComplaintController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\FleetTrackingController;
use App\Http\Controllers\Admin\KpiController;
use App\Http\Controllers\Admin\NetworkManagementController;
use App\Http\Controllers\Admin\OdcController;
use App\Http\Controllers\Admin\OdpController;
use App\Http\Controllers\Admin\PromoCodeController;
use App\Http\Controllers\Admin\ProvisioningController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\SlaBreachController;
use App\Http\Controllers\Admin\SubmissionDocumentController;
use App\Http\Controllers\Admin\SubmissionValidationController;
use App\Http\Controllers\Admin\TaskAssignmentApprovalController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\BrasDeviceController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\DispatchController;
use App\Http\Controllers\Api\MassOutageController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\NetworkApiController;
use App\Http\Controllers\Api\NetworkMapLayerController;
use App\Http\Controllers\Api\NetworkRoutingController;
use App\Http\Controllers\Api\NetworkSyncController;
use App\Http\Controllers\Api\TicketReviewController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Sales\SubmissionController;
use App\Http\Controllers\Superadmin\ComplaintTypeController;
use App\Http\Controllers\Superadmin\HolidayController;
use App\Http\Controllers\Superadmin\OfficeLocationController;
use App\Http\Controllers\Superadmin\PauseReasonController;
use App\Http\Controllers\Superadmin\RoleController as SuperadminRoleController;
use App\Http\Controllers\Superadmin\SlaSettingController;
use App\Http\Controllers\Superadmin\TeamController as SuperadminTeamController;
use App\Http\Controllers\Superadmin\TwoFactorController;
use App\Http\Controllers\Superadmin\UserController;
use App\Http\Controllers\Teknisi\ComplaintController as TeknisiComplaintController;
use App\Http\Controllers\Teknisi\TaskChecklistController;
use App\Http\Controllers\Teknisi\TaskController;
use App\Http\Controllers\Teknisi\WorkOrderController;
use App\Http\Middleware\WorkflowLogMiddleware;
use App\Models\Complaint;
use App\Models\Media;
use App\Models\OfficeLocation;
use App\Models\Phase2Requirement;
use App\Models\Task;
use App\Models\TicketAttendance;
use App\Modules\Field\Controllers\MediaController;
use App\Modules\Field\Services\PhaseWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ── Public Endpoints ────────────────────────────────────────────────────────
Route::get('/time', function () {
    return response()->json([
        'success' => true,
        'time' => now()->toIso8601String(),
        'timestamp' => now()->timestamp,
        'timezone' => config('app.timezone', 'Asia/Jakarta'),
    ]);
});

Route::get('/enums', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'complaint_status' => \App\Enums\ComplaintStatus::options(),
            'task_status' => \App\Enums\TaskStatus::options(),
            'complaint_priority' => \App\Enums\ComplaintPriority::options(),
            'complaint_category' => \App\Enums\ComplaintCategory::options(),
            'provisioning_status' => \App\Enums\ProvisioningStatus::options(),
            'submission_status' => \App\Enums\SubmissionStatus::options(),
            'resolution_category' => \App\Enums\ResolutionCategory::options(),
            'task_assignment_status' => \App\Enums\TaskAssignmentStatus::options(),
            'bfass_status' => \App\Enums\BfassStatus::options(),
            'document_type' => \App\Enums\DocumentType::options(),
            'customer_status' => [
                ['value' => 'active', 'label' => 'Aktif'],
                ['value' => 'suspended', 'label' => 'Terisolir'],
                ['value' => 'terminated', 'label' => 'Berhenti'],
            ],
            'network_status' => [
                ['value' => 'normal', 'label' => 'Normal'],
                ['value' => 'disrupted', 'label' => 'Gangguan'],
                ['value' => 'cut', 'label' => 'Putus'],
                ['value' => 'maintenance', 'label' => 'Pemeliharaan'],
            ],
            'review_status' => [
                ['value' => 'not_required', 'label' => 'Tidak Perlu'],
                ['value' => 'pending', 'label' => 'Perlu Ditinjau'],
                ['value' => 'approved', 'label' => 'Disetujui'],
                ['value' => 'rework', 'label' => 'Kerja Ulang'],
                ['value' => 'flagged', 'label' => 'Bermasalah'],
            ],
            'geofence_status' => [
                ['value' => 'inside', 'label' => 'Di dalam radius'],
                ['value' => 'outside', 'label' => 'Di luar radius'],
                ['value' => 'low_accuracy', 'label' => 'Akurasi rendah'],
                ['value' => 'unverified', 'label' => 'Belum diverifikasi'],
            ],
            'attendance_status' => [
                ['value' => 'hadir', 'label' => 'Hadir'],
                ['value' => 'izin', 'label' => 'Izin'],
                ['value' => 'sakit', 'label' => 'Sakit'],
                ['value' => 'alpa', 'label' => 'Alpa'],
            ],
        ],
    ]);
});

Route::get('/tiles/manifest', [NetworkSyncController::class, 'tilesManifest']);
Route::get('/tiles/area.pmtiles', [NetworkSyncController::class, 'servePmtiles']);
Route::post('/login', [AuthController::class, 'login'])->name('login')->middleware('throttle:100,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:100,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:100,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// ── Authenticated Endpoints (auth:sanctum) ──────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Auth, Me, & Profile ───────────────────────────────────────────────
    Route::get('/me', [AuthController::class, 'me'])->name('me');
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $permissions = ($user->hasRole('Superadmin') || $user->hasRole('superadmin'))
            ? \Spatie\Permission\Models\Permission::pluck('name')
            : $user->getAllPermissions()->pluck('name');

        return array_merge($user->toArray(), [
            'roles' => $user->getRoleNames(),
            'role' => $user->getRoleNames()->first(),
            'permissions' => $permissions,
        ]);
    });
    Route::put('/user/profile', [ProfileController::class, 'updateProfile']);
    Route::put('/user/password', [ProfileController::class, 'changePassword']);
    Route::get('/user/notification-settings', [ProfileController::class, 'getNotificationSettings']);
    Route::put('/user/notification-settings', [ProfileController::class, 'updateNotificationSettings']);

    // ── 2FA TOTP (PRD Final v1.2) ──────────────────────────────────────────
    Route::get('/user/2fa/status', [TwoFactorController::class, 'status']);
    Route::post('/user/2fa/setup', [TwoFactorController::class, 'setup']);
    Route::post('/user/2fa/confirm', [TwoFactorController::class, 'confirm']);
    Route::post('/user/2fa/disable', [TwoFactorController::class, 'disable']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ── Navigation Menu & Badges ──────────────────────────────────────────
    Route::get('/menu', [MenuController::class, 'menu'])->name('menu.tree');
    Route::get('/menu/badges', [MenuController::class, 'badges'])->name('menu.badges');

    // ── Unified Dashboard Summary ─────────────────────────────────────────
    Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->name('dashboard.summary')->middleware('can:dashboard.view');
    Route::post('/dashboard/clear-cache', [DashboardController::class, 'clearCache'])->middleware('can:dashboard.view');
    Route::get('/dashboard/shortcuts', [AttendanceController::class, 'dashboardShortcuts'])->middleware('can:dashboard.view');

    // ── Notifications & Web Push ──────────────────────────────────────────
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read_all');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::get('/push-subscriptions/vapid-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy']);
    Route::post('/push-subscriptions/test', [PushSubscriptionController::class, 'test']);

    // ── Customers (Pelanggan) ──────────────────────────────────────────────
    Route::get('/customers/export', [CustomerController::class, 'export'])->name('customers.export')->middleware('can:customers.export');
    Route::get('/customers/import-template', [CustomerController::class, 'importTemplate'])->name('customers.import_template')->middleware('can:customers.import');
    Route::get('/customers/import/template', [CustomerController::class, 'importTemplate'])->name('customers.import.template')->middleware('can:customers.import');
    Route::post('/customers/import', [CustomerController::class, 'import'])->name('customers.import')->middleware('can:customers.import');
    Route::get('/customers/stats', [CustomerController::class, 'stats'])->name('customers.stats')->middleware('can:customers.view');
    Route::get('/customers/{customer}/secrets', [CustomerController::class, 'showSecrets'])->name('customers.secrets')->middleware('can:customers.view_secret');
    Route::match(['patch', 'put'], '/customers/{customer}/status', [CustomerController::class, 'updateStatus'])->name('customers.status')->middleware('can:customers.update');
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index')->middleware('can:customers.view');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store')->middleware('can:customers.create');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show')->middleware('can:customers.view');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update')->middleware('can:customers.update');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy')->middleware('can:customers.delete');



    // ── Submissions (Pengajuan PSB) ───────────────────────────────────────
    Route::post('/submissions/check-duplicate', [SubmissionController::class, 'checkDuplicate'])->name('submissions.check_duplicate')->middleware('can:submissions.create');
    Route::post('/submissions/{submission}/upload-document', [SubmissionController::class, 'uploadDocument'])->name('submissions.upload_document')->middleware('can:submissions.update_own');
    Route::match(['put', 'post'], '/submissions/{submission}/validate', [SubmissionValidationController::class, 'validateSubmission'])->name('submissions.validate')->middleware('can:submissions.approve');
    Route::put('/documents/{document}/review', [SubmissionDocumentController::class, 'review'])->name('documents.review')->middleware('can:submissions.approve');
    Route::get('/submissions', [SubmissionValidationController::class, 'index'])->name('submissions.index')->middleware('can:submissions.view_any_or_own');
    Route::post('/submissions', [SubmissionController::class, 'store'])->name('submissions.store')->middleware('can:submissions.create');
    Route::get('/submissions/{submission}', [SubmissionValidationController::class, 'show'])->name('submissions.show')->middleware('can:submissions.view_any_or_own');
    Route::put('/submissions/{submission}', [SubmissionController::class, 'update'])->name('submissions.update')->middleware('can:submissions.update_own');
    Route::delete('/submissions/{submission}', [SubmissionController::class, 'destroy'])->name('submissions.destroy')->middleware('can:submissions.delete');

    // ── Complaints (Pengaduan & Gangguan) ──────────────────────────────────
    Route::get('/areas/hierarchy', [AdminComplaintController::class, 'areaHierarchy'])->name('areas.hierarchy')->middleware('can:complaints.create');
    Route::get('/areas', [AdminComplaintController::class, 'areas'])->name('areas.index')->middleware('can:complaints.create');
    Route::get('/complaints/stats', [AdminComplaintController::class, 'stats'])->name('complaints.stats')->middleware('can:complaints.view_any_or_own');
    Route::get('/complaints/check-duplicate', [AdminComplaintController::class, 'checkDuplicate'])->name('complaints.check_duplicate')->middleware('can:complaints.create');
    Route::get('/complaints/available-teams', [AdminComplaintController::class, 'availableTeams'])->name('complaints.available_teams')->middleware('can:complaints.assign');
    Route::get('/complaints', [AdminComplaintController::class, 'index'])->name('complaints.index')->middleware('can:complaints.view_any_or_own');
    Route::post('/complaints', [AdminComplaintController::class, 'store'])->name('complaints.store')->middleware('can:complaints.create');
    Route::get('/complaints/{complaint}', [AdminComplaintController::class, 'show'])->name('complaints.show')->middleware('can:complaints.view_any_or_own');
    Route::post('/complaints/{complaint}/assign', [AdminComplaintController::class, 'assign'])->name('complaints.assign')->middleware('can:complaints.assign');
    Route::put('/complaints/{complaint}/resolve-remote', [AdminComplaintController::class, 'resolveRemote'])->middleware('can:complaints.review');
    Route::put('/complaints/{complaint}/verify-close', [AdminComplaintController::class, 'verifyClose'])->middleware('can:complaints.review');
    Route::put('/complaints/{complaint}/return', [AdminComplaintController::class, 'returnToTechnician'])->middleware('can:complaints.review');
    Route::put('/complaints/{complaint}/cancel', [AdminComplaintController::class, 'cancel'])->middleware('can:complaints.review');
    Route::match(['put', 'post'], '/complaints/{complaint}/reopen', [AdminComplaintController::class, 'reopen'])->middleware('can:complaints.review');
    Route::match(['put', 'post'], '/complaints/{complaint}/pause', [AdminComplaintController::class, 'pause'])->middleware('can:complaints.review');
    Route::match(['put', 'post'], '/complaints/{complaint}/pending-customer', [AdminComplaintController::class, 'pendingCustomer'])->middleware('can:complaints.review');
    Route::match(['put', 'post'], '/complaints/{complaint}/resume', [AdminComplaintController::class, 'resumeFromPending'])->middleware('can:complaints.review');
    Route::get('/pause-reasons/list', [PauseReasonController::class, 'index'])->middleware('can:complaints.view');

    // Operasional lapangan pada pengaduan
    Route::post('/complaints/{complaint}/start', [TeknisiComplaintController::class, 'start'])->middleware('can:tasks.update_status');
    Route::post('/complaints/{complaint}/accept', [TeknisiComplaintController::class, 'start'])->middleware('can:tasks.update_status');
    Route::post('/complaints/{complaint}/phase-1', [TeknisiComplaintController::class, 'phase1'])->middleware('can:tasks.update_status');
    Route::post('/complaints/{complaint}/resolve', [TeknisiComplaintController::class, 'resolve'])->middleware('can:tasks.update_status');
    Route::post('/complaints/{complaint}/phase-2-attendance', [TeknisiComplaintController::class, 'phase2Attendance'])->middleware('can:attendance.self');
    Route::get('/complaints/{complaint}/attendances', [TeknisiComplaintController::class, 'attendances'])->middleware('can:complaints.view_assigned');
    Route::put('/complaints/{complaint}/schedule-visit', [TeknisiComplaintController::class, 'scheduleVisit'])->middleware('can:tasks.update_status');

    // ── Work Orders & Tasks ───────────────────────────────────────────────
    Route::get('/tracking/live-map', [FleetTrackingController::class, 'liveMap'])->name('tracking.live_map')->middleware('can:network.view');
    Route::get('/work-orders', [WorkOrderController::class, 'index'])->name('work_orders.index')->middleware('can:workorders.view');
    Route::get('/work-orders/{id}', [WorkOrderController::class, 'show'])->name('work_orders.show')->middleware('can:workorders.view');
    Route::post('/work-orders/{id}/accept', [WorkOrderController::class, 'accept'])->name('work_orders.accept')->middleware('can:tasks.update_status');

    Route::get('/tasks', [TaskController::class, 'index'])->name('tasks.index')->middleware('can:tasks.view_assigned');
    Route::get('/tasks/{task}', [TaskController::class, 'show'])->name('tasks.show')->middleware('can:tasks.view_assigned');
    Route::get('/tasks/{task}/checklist', [TaskChecklistController::class, 'show'])->name('tasks.checklist.show')->middleware('can:tasks.view_assigned');
    Route::put('/tasks/{task}/checklist', [TaskChecklistController::class, 'update'])->name('tasks.checklist.update')->middleware('can:tasks.update_status');
    Route::put('/tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.status.update')->middleware(['can:tasks.update_status', WorkflowLogMiddleware::class]);
    Route::post('/tasks/{task}/upload-photo', [TaskController::class, 'uploadPhoto'])->name('tasks.upload_photo')->middleware(['can:tasks.update_status', WorkflowLogMiddleware::class]);
    Route::post('/tasks/{task}/upload-signature', [TaskController::class, 'uploadSignature'])->name('tasks.upload_signature')->middleware(['can:tasks.update_status', WorkflowLogMiddleware::class]);
    Route::post('/tasks/{task}/phase-1', [TaskController::class, 'phase1'])->name('tasks.phase1')->middleware(['can:tasks.update_status', WorkflowLogMiddleware::class]);
    Route::post('/tasks/{task}/phase-2', [TaskController::class, 'phase2'])->name('tasks.phase2')->middleware(['can:tasks.update_status', WorkflowLogMiddleware::class]);
    Route::patch('/tasks/{task}/reassign', [ProvisioningController::class, 'reassignTask'])->name('tasks.reassign')->middleware('can:complaints.assign');

    // Work Orders Review & Bukti
    Route::middleware('can:complaints.review')->group(function () {
        Route::put('/work-orders/{type}/{id}/phase-2-waive', [TicketReviewController::class, 'waive']);
        Route::get('/work-orders/{type}/{id}/evidence', function ($type, $id) {
            $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);

            $media = Media::where('mediable_type', get_class($ticket))
                ->where('mediable_id', $ticket->id)
                ->with('uploader:id,name')
                ->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'kind' => $m->kind,
                    'disk' => $m->disk,
                    'path' => $m->path,
                    'sha256' => $m->sha256,
                    'size' => $m->size,
                    'mime' => $m->mime,
                    'preview_url' => $m->signed_url,
                    'captured_at' => $m->captured_at?->toIso8601String(),
                    'received_at' => $m->received_at?->toIso8601String(),
                    'selisih_jam' => (float) $m->selisih_jam,
                    'lat' => $m->lat ? (float) $m->lat : null,
                    'lng' => $m->lng ? (float) $m->lng : null,
                    'accuracy' => $m->accuracy ? (float) $m->accuracy : null,
                    'uploaded_by' => $m->uploader?->name,
                    'is_anomaly' => (bool) $m->is_anomaly,
                    'anomaly_reasons' => $m->anomaly_reasons,
                ]);

            $attendances = TicketAttendance::where('attendable_type', get_class($ticket))
                ->where('attendable_id', $ticket->id)
                ->with(['user:id,name,phone', 'selfieMedia'])
                ->get()
                ->map(fn ($att) => [
                    'id' => $att->id,
                    'user_id' => $att->user_id,
                    'user_name' => $att->user?->name,
                    'selfie_url' => $att->selfieMedia?->signed_url,
                    'lat' => (float) $att->lat,
                    'lng' => (float) $att->lng,
                    'accuracy' => $att->accuracy ? (float) $att->accuracy : null,
                    'distance_meters' => $att->distance_meters ? (float) $att->distance_meters : null,
                    'geofence_status' => $att->geofence_status,
                    'captured_at' => $att->captured_at?->toIso8601String(),
                    'received_at' => $att->received_at?->toIso8601String(),
                ]);

            $requirements = Phase2Requirement::where('assignable_type', get_class($ticket))
                ->where('assignable_id', $ticket->id)
                ->with(['user:id,name', 'waivedBy:id,name'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'ticket' => [
                        'id' => $ticket->id,
                        'number' => $ticket->task_number ?? $ticket->ticket_number,
                        'status' => (string) ($ticket->status instanceof BackedEnum ? $ticket->status->value : $ticket->status),
                        'customer_name' => $ticket->provisioning?->submission?->customer_name ?? $ticket->customer_name,
                    ],
                    'media' => $media,
                    'attendances' => $attendances,
                    'phase2_requirements' => $requirements,
                    'has_anomalies' => $media->contains('is_anomaly', true),
                ],
            ]);
        });
        Route::post('/work-orders/{type}/{id}/review/approve', [TicketReviewController::class, 'approve']);
        Route::post('/work-orders/{type}/{id}/review/rework', [TicketReviewController::class, 'rework']);
        Route::post('/work-orders/{type}/{id}/review/flag', [TicketReviewController::class, 'flag']);
        Route::post('/work-orders/{type}/{id}/phase-2/waive', [TicketReviewController::class, 'waive']);
        Route::post('/work-orders/{type}/{id}/phase2/waive', [TicketReviewController::class, 'waive']);
        Route::post('/tickets/{type}/{id}/review/approve', [TicketReviewController::class, 'approve']);
        Route::post('/tickets/{type}/{id}/review/rework', [TicketReviewController::class, 'rework']);
        Route::post('/tickets/{type}/{id}/review/flag', [TicketReviewController::class, 'flag']);
        Route::post('/tickets/{type}/{id}/phase-2/waive', [TicketReviewController::class, 'waive']);
        Route::post('/tickets/{type}/{id}/phase2/waive', [TicketReviewController::class, 'waive']);
    });

    // Workflow Aksi Tiket Lapangan (PWA Dispatch)
    Route::get('/work-orders/current', [DispatchController::class, 'getCurrentTicket'])->middleware('can:tasks.view_assigned');
    Route::get('/work-orders/{type}/{id}/phase-status', function ($type, $id, Request $request, PhaseWorkflowService $workflow) {
        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);
        $requirements = Phase2Requirement::where('assignable_type', get_class($ticket))
            ->where('assignable_id', $ticket->id)
            ->with(['user:id,name,phone', 'waivedBy:id,name'])
            ->get();

        $userRequirement = $requirements->firstWhere('user_id', $request->user()->id);
        $userAttendance = TicketAttendance::where('attendable_type', get_class($ticket))
            ->where('attendable_id', $ticket->id)
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'ticket_id' => $ticket->id,
                'ticket_type' => $type,
                'status' => (string) ($ticket->status instanceof BackedEnum ? $ticket->status->value : $ticket->status),
                'is_phase1_done' => $type === 'psb' ? (bool) $ticket->phase_1_submitted_at : (bool) $ticket->phase_1_completed_at,
                'is_phase2_completed' => $workflow->isPhase2FullyCompleted($ticket),
                'user_has_attended' => (bool) $userAttendance,
                'user_is_waived' => (bool) ($userRequirement?->waived_by_id),
                'user_geofence_status' => $userAttendance?->geofence_status,
                'phase2_requirements' => $requirements,
            ],
        ]);
    })->middleware('can:tasks.view_assigned');

    Route::post('/work-orders/{type}/{id}/accept', [DispatchController::class, 'acceptTicket'])->middleware('can:tasks.update_status');
    Route::post('/work-orders/{type}/{id}/decline', [DispatchController::class, 'declineTicket'])->middleware('can:tasks.update_status');
    Route::post('/work-orders/{type}/{id}/phase-1', function ($type, $id, Request $request, PhaseWorkflowService $workflow) {
        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);
        $data = $request->all();

        if ($request->hasFile('photo_before')) {
            $data['photo_before'] = $request->file('photo_before');
        } elseif ($request->filled('photo_before_base64')) {
            $data['photo_before'] = $request->input('photo_before_base64');
        }

        if ($request->hasFile('photo_after')) {
            $data['photo_after'] = $request->file('photo_after');
        } elseif ($request->filled('photo_after_base64')) {
            $data['photo_after'] = $request->input('photo_after_base64');
        }

        if ($request->hasFile('signature')) {
            $data['signature'] = $request->file('signature');
        } elseif ($request->filled('signature_base64')) {
            $data['signature'] = $request->input('signature_base64');
        }

        $result = $workflow->submitPhase1($ticket, $request->user(), $data);

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => $result,
        ]);
    })->middleware('can:tasks.update_status');

    Route::post('/work-orders/{type}/{id}/phase-2-attendance', function ($type, $id, Request $request, PhaseWorkflowService $workflow) {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ]);
        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);

        $selfieContent = null;
        if ($request->hasFile('selfie')) {
            $selfieContent = $request->file('selfie');
        } elseif ($request->filled('selfie_base64')) {
            $selfieContent = $request->input('selfie_base64');
        }

        $targetLat = null;
        $targetLng = null;
        if ($ticket instanceof Task) {
            $targetLat = $ticket->provisioning?->submission?->lat ?? $ticket->provisioning?->submission?->latitude;
            $targetLng = $ticket->provisioning?->submission?->lng ?? $ticket->provisioning?->submission?->longitude;
        } elseif ($ticket instanceof Complaint) {
            $targetLat = $ticket->customer_lat ?? $ticket->customer?->latitude ?? $ticket->customer?->lat ?? $ticket->latitude;
            $targetLng = $ticket->customer_lng ?? $ticket->customer?->longitude ?? $ticket->customer?->lng ?? $ticket->longitude;
        }

        $att = $workflow->submitTicketAttendance($ticket, $request->user(), [
            'latitude' => (float) $request->latitude,
            'longitude' => (float) $request->longitude,
            'accuracy' => $request->filled('accuracy') ? (float) $request->accuracy : null,
            'selfie_content' => $selfieContent,
            'target_lat' => $targetLat ? (float) $targetLat : null,
            'target_lng' => $targetLng ? (float) $targetLng : null,
            'radius_meters' => 50,
            'captured_at' => $request->input('captured_at') ?? now(),
            'device_id' => $request->input('device_id'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Absensi tiket berhasil dicatat.',
            'data' => $att,
            'is_fully_completed' => $workflow->isPhase2FullyCompleted($ticket),
        ]);
    })->middleware('can:attendance.self');

    // ── PSB & Provisioning ────────────────────────────────────────────────
    Route::middleware('can:psb.view')->group(function () {
        Route::get('/bfass/health', BfassHealthController::class)->name('bfass.health');
        Route::get('/provisionings', [ProvisioningController::class, 'index'])->name('provisionings.index');
        Route::post('/provisionings', [ProvisioningController::class, 'store'])->name('provisionings.store');
        Route::get('/provisionings/{provisioning}', [ProvisioningController::class, 'show'])->name('provisionings.show');
        Route::put('/provisionings/{provisioning}/bfass-credentials', [ProvisioningController::class, 'updateBfassCredentials'])->name('provisionings.credentials');
        Route::post('/provisionings/{provisioning}/retry', [ProvisioningController::class, 'retry'])->name('provisionings.retry');
        Route::put('/task-assignments/{assignment}/approve', [TaskAssignmentApprovalController::class, 'approve'])->name('assignments.approve');
        Route::put('/task-assignments/{assignment}/return', [TaskAssignmentApprovalController::class, 'returnAssignment'])->name('assignments.return');
    });

    // ── Network Operations & Approvals ────────────────────────────────────
    Route::middleware('can:network.view')->group(function () {
        Route::get('/network/logs', [NetworkManagementController::class, 'logs'])->name('network.logs');
        Route::get('/network/map', [NetworkApiController::class, 'map'])->name('network.map');
        Route::get('/network/sync', [NetworkApiController::class, 'sync'])->name('network.sync');
        Route::get('/network/olts', [NetworkApiController::class, 'oltsIndex'])->name('network.olts.index');
        Route::get('/network/olts/{olt}', [NetworkApiController::class, 'oltsShow'])->name('network.olts.show');
        Route::get('/network/odcs', [NetworkApiController::class, 'odcsIndex'])->name('network.odcs.index');
        Route::get('/network/odcs/{odc}', [NetworkApiController::class, 'odcsShow'])->name('network.odcs.show');
        Route::get('/network/odps', [NetworkApiController::class, 'odpsIndex'])->name('network.odps.index');
        Route::get('/network/odps/nearest', [NetworkApiController::class, 'nearestOdps'])->name('network.odps.nearest');
        Route::get('/network/odps/{odp}', [NetworkApiController::class, 'odpsShow'])->name('network.odps.show');
        Route::get('/network/odps/{odp}/ports', [NetworkApiController::class, 'odpPorts'])->name('network.odps.ports');
        Route::get('/network/cables', [NetworkApiController::class, 'cablesIndex'])->name('network.cables.index');
        Route::get('/network/cables/{cable}', [NetworkApiController::class, 'cablesShow'])->name('network.cables.show');
        Route::get('/network/export/kmz', [NetworkApiController::class, 'exportKmz'])->name('network.export_kmz');
        Route::get('/network/reports/download', [NetworkApiController::class, 'downloadReport'])->name('network.reports.download');
        Route::get('/network/tiles/manifest', [NetworkApiController::class, 'tilesManifest'])->name('network.tiles.manifest');
    });

    Route::middleware('can:network.approve')->group(function () {
        Route::get('/network/approvals', [NetworkManagementController::class, 'approvals'])->name('network.approvals');
        Route::post('/network/odps/{odp}/approve', [OdpController::class, 'approve'])->name('network.odps.approve');
        Route::post('/network/cables/{cableTrack}/approve', [CableTrackController::class, 'approve'])->name('network.cables.approve');
    });

    // ── Gangguan Massal (Mass Outage) ────────────────────────────────────
    Route::middleware('can:incidents.view')->group(function () {
        Route::get('/network/mass-outage/affected-customers', [MassOutageController::class, 'affectedCustomers'])->name('network.mass_outage.affected');
        Route::get('/network/mass-outage/preview', [MassOutageController::class, 'preview'])->name('network.mass_outage.preview');
        Route::get('/network/mass-outage/active', [MassOutageController::class, 'activeIncidents'])->name('network.mass_outage.active');
        Route::get('/network/mass-outage/export', [MassOutageController::class, 'exportCsv'])->name('network.mass_outage.export');
    });

    Route::middleware('can:incidents.manage')->group(function () {
        Route::post('/network/mass-outage/trigger', [MassOutageController::class, 'trigger'])->name('network.mass_outage.trigger');
        Route::post('/network/mass-outage/resolve', [MassOutageController::class, 'resolve'])->name('network.mass_outage.resolve');
        Route::post('/network/mass-outage/split', [MassOutageController::class, 'split'])->name('network.mass_outage.split');
    });

    Route::middleware('can:network.manage')->group(function () {

        Route::get('/network/bras-devices', [BrasDeviceController::class, 'index'])->name('bras_devices.index');
        Route::post('/network/bras-devices', [BrasDeviceController::class, 'store'])->name('bras_devices.store');
        Route::get('/network/bras-devices/{brasDevice}', [BrasDeviceController::class, 'show'])->name('bras_devices.show');
        Route::put('/network/bras-devices/{brasDevice}', [BrasDeviceController::class, 'update'])->name('bras_devices.update');
        Route::delete('/network/bras-devices/{brasDevice}', [BrasDeviceController::class, 'destroy'])->name('bras_devices.destroy');
        Route::post('/network/bras-devices/{brasDevice}/sync', [BrasDeviceController::class, 'sync'])->name('bras_devices.sync');
        Route::get('/network/bras-devices/{brasDevice}/sessions', [BrasDeviceController::class, 'sessions'])->name('bras_devices.sessions');
        Route::get('/network/bras-devices/{brasDevice}/logs', [BrasDeviceController::class, 'logs'])->name('bras_devices.logs');

        Route::post('/network/olts', [NetworkApiController::class, 'oltsStore'])->name('network.olts.store');
        Route::put('/network/olts/{olt}', [NetworkApiController::class, 'oltsUpdate'])->name('network.olts.update');
        Route::delete('/network/olts/{olt}', [NetworkApiController::class, 'oltsDestroy'])->name('network.olts.destroy');

        Route::post('/network/odcs', [NetworkApiController::class, 'odcsStore'])->name('network.odcs.store');
        Route::put('/network/odcs/{odc}', [NetworkApiController::class, 'odcsUpdate'])->name('network.odcs.update');
        Route::delete('/network/odcs/{odc}', [NetworkApiController::class, 'odcsDestroy'])->name('network.odcs.destroy');

        Route::post('/network/odps', [NetworkApiController::class, 'odpsStore'])->name('network.odps.store');
        Route::put('/network/odps/{odp}', [NetworkApiController::class, 'odpsUpdate'])->name('network.odps.update');
        Route::delete('/network/odps/{odp}', [NetworkApiController::class, 'odpsDestroy'])->name('network.odps.destroy');

        Route::post('/network/cables', [NetworkApiController::class, 'cablesStore'])->name('network.cables.store');
        Route::put('/network/cables/{cable}', [NetworkApiController::class, 'cablesUpdate'])->name('network.cables.update');
        Route::put('/network/cables/{cable}/route', [NetworkApiController::class, 'updateCableRoute'])->name('network.cables.route');
        Route::delete('/network/cables/{cable}', [NetworkApiController::class, 'cablesDestroy'])->name('network.cables.destroy');

        Route::post('/network/{type}/{id}/status', [NetworkApiController::class, 'updateNodeStatus'])->name('network.nodes.status');
        Route::post('/network/import/kmz', [NetworkApiController::class, 'importKmz'])->name('network.import_kmz');

        Route::apiResource('/odcs', OdcController::class);
        Route::apiResource('/odps', OdpController::class);
        Route::get('/cables/{cableTrack}/affected-customers', [CableTrackController::class, 'affectedCustomers'])->name('cables.affected_customers');
        Route::apiResource('/cable-tracks', CableTrackController::class);
    });

    Route::middleware('can:network.propose')->group(function () {
        Route::post('/network/route-snap', [NetworkRoutingController::class, 'snapRoute']);
        Route::get('/network/map-layers', [NetworkMapLayerController::class, 'index']);
    });

    // ── Attendance, Devices, & Offices (Field PWA) ─────────────────────────
    Route::middleware(['can:pwa.access', 'can:attendance.self'])->group(function () {
        Route::post('/devices/register', [DeviceController::class, 'register'])->name('devices.register');
        Route::get('/attendance/today', [AttendanceController::class, 'today'])->name('attendance.today');
        Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn'])->name('attendance.check_in');
        Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut'])->name('attendance.check_out');
    });

    Route::middleware('can:devices.manage')->group(function () {
        Route::get('/devices', [DeviceController::class, 'index'])->name('devices.index');
        Route::put('/devices/{id}/approve', [DeviceController::class, 'approve'])->name('devices.approve');
        Route::put('/devices/{id}/revoke', [DeviceController::class, 'revoke'])->name('devices.revoke');
    });

    Route::middleware('can:attendance.manage')->group(function () {
        Route::get('/attendances', [AttendanceController::class, 'adminIndex'])->name('attendances.index');
        Route::get('/attendances/today', [AttendanceController::class, 'adminToday'])->name('attendances.today');
        Route::post('/attendances/{attendance}/review', [AttendanceController::class, 'reviewAttendance'])->name('attendances.review');
        Route::put('/attendances/{user}/{date}', [AttendanceController::class, 'adminAdjust'])->name('attendances.adjust');
        Route::post('/attendances/manual', [AttendanceController::class, 'adminManual'])->name('attendances.manual');
        Route::get('/attendances/recap', [AttendanceController::class, 'adminRecap'])->name('attendances.recap');
        Route::get('/attendances/recap/export', [AttendanceController::class, 'adminRecapExport'])->name('attendances.recap.export');
    });

    Route::middleware('can:settings.manage')->group(function () {
        // Lokasi Kantor Multi-Cabang & Wi-Fi IP (PRD Final v1.2)
        Route::get('/office-locations', [OfficeLocationController::class, 'index'])->name('office_locations.index');
        Route::post('/office-locations', [OfficeLocationController::class, 'store'])->name('office_locations.store');
        Route::get('/office-locations/nearest', [OfficeLocationController::class, 'nearest'])->name('office_locations.nearest');
        Route::get('/office-locations/{id}', [OfficeLocationController::class, 'show'])->name('office_locations.show');
        Route::put('/office-locations/{id}', [OfficeLocationController::class, 'update'])->name('office_locations.update');
        Route::delete('/office-locations/{id}', [OfficeLocationController::class, 'destroy'])->name('office_locations.destroy');
        Route::post('/office-locations/{id}/toggle-incident', [OfficeLocationController::class, 'toggleIncident'])->name('office_locations.toggle_incident');

        // Pengaturan SLA (PRD Final v1.2)
        Route::get('/sla-settings', [SlaSettingController::class, 'index'])->name('sla_settings.index');
        Route::put('/sla-settings/{id}', [SlaSettingController::class, 'update'])->name('sla_settings.update');
        Route::post('/sla-settings/batch', [SlaSettingController::class, 'batchUpdate'])->name('sla_settings.batch');

        // Jenis Gangguan (PRD Final v1.2)
        Route::get('/complaint-types', [ComplaintTypeController::class, 'index'])->name('complaint_types.index');
        Route::post('/complaint-types', [ComplaintTypeController::class, 'store'])->name('complaint_types.store');
        Route::get('/complaint-types/{id}', [ComplaintTypeController::class, 'show'])->name('complaint_types.show');
        Route::put('/complaint-types/{id}', [ComplaintTypeController::class, 'update'])->name('complaint_types.update');
        Route::delete('/complaint-types/{id}', [ComplaintTypeController::class, 'destroy'])->name('complaint_types.destroy');

        // Hari Libur Nasional & Alasan Jeda SLA (PRD Final v1.2)
        Route::get('/holidays', [HolidayController::class, 'index'])->name('holidays.index');
        Route::post('/holidays', [HolidayController::class, 'store'])->name('holidays.store');
        Route::get('/holidays/{id}', [HolidayController::class, 'show'])->name('holidays.show');
        Route::put('/holidays/{id}', [HolidayController::class, 'update'])->name('holidays.update');
        Route::delete('/holidays/{id}', [HolidayController::class, 'destroy'])->name('holidays.destroy');

        Route::get('/pause-reasons', [PauseReasonController::class, 'index'])->name('pause_reasons.index');
        Route::post('/pause-reasons', [PauseReasonController::class, 'store'])->name('pause_reasons.store');
        Route::get('/pause-reasons/{id}', [PauseReasonController::class, 'show'])->name('pause_reasons.show');
        Route::put('/pause-reasons/{id}', [PauseReasonController::class, 'update'])->name('pause_reasons.update');
        Route::delete('/pause-reasons/{id}', [PauseReasonController::class, 'destroy'])->name('pause_reasons.destroy');

        Route::get('/settings/dispatch', [DispatchController::class, 'getSettings'])->name('settings.dispatch.get');
        Route::put('/settings/dispatch', [DispatchController::class, 'updateSettings'])->name('settings.dispatch.update');
        Route::get('/dispatch-settings', [DispatchController::class, 'getSettings']);
        Route::put('/dispatch-settings', [DispatchController::class, 'updateSettings']);
        Route::get('/dispatch/pending', [DispatchController::class, 'getPendingTickets'])->name('dispatch.pending');
        Route::get('/dispatch/unassigned', [DispatchController::class, 'getPendingTickets'])->name('dispatch.unassigned');
        Route::get('/dispatch/assignment-logs', [DispatchController::class, 'getAssignmentLogs'])->name('dispatch.logs');
        Route::get('/assignment-logs', [DispatchController::class, 'getAssignmentLogs']);
        Route::post('/dispatch/manual-assign', [DispatchController::class, 'manualAssign'])->name('dispatch.manual_assign');
        Route::post('/dispatch/tickets/{type}/{id}/dispatch-now', [DispatchController::class, 'dispatchNow'])->name('dispatch.now');
        Route::get('/dispatch/tickets/{type}/{id}/unified-detail', [DispatchController::class, 'unifiedDetail'])->name('dispatch.detail');
    });

    // ── Teams Management ──────────────────────────────────────────────────
    Route::get('/teams/available', [AdminComplaintController::class, 'availableTeams'])->name('teams.available')->middleware('can:complaints.assign');
    Route::get('/technicians/available', [AdminComplaintController::class, 'availableTechnicians'])->name('technicians.available')->middleware('can:complaints.assign');
    Route::middleware('can:teams.manage')->group(function () {
        Route::get('/teams', [SuperadminTeamController::class, 'index'])->name('teams.index');
        Route::post('/teams', [SuperadminTeamController::class, 'store'])->name('teams.store');
        Route::get('/teams/{team}', [SuperadminTeamController::class, 'show'])->name('teams.show');
        Route::put('/teams/{team}', [SuperadminTeamController::class, 'update'])->name('teams.update');
        Route::patch('/teams/{team}/toggle', [SuperadminTeamController::class, 'toggle'])->name('teams.toggle');
        Route::delete('/teams/{team}', [SuperadminTeamController::class, 'destroy'])->name('teams.destroy');
        Route::post('/teams/{team}/members', [SuperadminTeamController::class, 'assignMembers'])->name('teams.members');
    });

    // ── Perangkat Terdaftar (Devices) ────────────────────────────────────
    Route::middleware('can:devices.view')->group(function () {
        Route::get('/devices', [DeviceController::class, 'index'])->name('devices.index');
    });

    Route::middleware('can:devices.manage')->group(function () {
        Route::put('/devices/{id}/approve', [DeviceController::class, 'approve'])->name('devices.approve');
        Route::put('/devices/{id}/revoke', [DeviceController::class, 'revoke'])->name('devices.revoke');
    });

    // ── Audit Logs ────────────────────────────────────────────────────────
    Route::middleware('can:audit.view')->group(function () {
        Route::get('/activity-logs', [AuditLogController::class, 'index'])->name('activity_logs.index');
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    // ── Packages & Promos Catalog ─────────────────────────────────────────
    Route::middleware('can:catalog.view')->group(function () {
        Route::get('/promos', [PromoCodeController::class, 'index'])->name('promos.index');
        Route::post('/promos', [PromoCodeController::class, 'store'])->name('promos.store');
        Route::get('/promos/{promo}', [PromoCodeController::class, 'show'])->name('promos.show');
        Route::put('/promos/{promo}', [PromoCodeController::class, 'update'])->name('promos.update');
        Route::patch('/promos/{promo}/toggle-status', [PromoCodeController::class, 'toggleStatus'])->name('promos.toggle_status');
        Route::delete('/promos/{promo}', [PromoCodeController::class, 'destroy'])->name('promos.destroy');
        Route::post('/promos/validate', [PromoCodeController::class, 'validateCode'])->name('promos.validate');

        Route::get('/packages', [PackageController::class, 'index'])->name('packages.index');
        Route::post('/packages/sync', [PackageController::class, 'sync'])->name('packages.sync')->middleware('throttle:5,1');
        Route::post('/packages', [PackageController::class, 'store'])->name('packages.store');
        Route::put('/packages/{package}', [PackageController::class, 'update'])->name('packages.update');
        Route::patch('/packages/{package}/toggle-active', [PackageController::class, 'toggleActive'])->name('packages.toggle_active');
        Route::delete('/packages/{package}', [PackageController::class, 'destroy'])->name('packages.destroy');
    });

    // ── KPI, Analytics, & Reports ─────────────────────────────────────────
    Route::middleware('can:reports.view')->group(function () {
        Route::get('/reports/submissions/excel', [ReportController::class, 'exportExcel'])->name('reports.submissions.excel');
        Route::get('/reports/submissions/{submission}/pdf', [ReportController::class, 'exportPdf'])->name('reports.submissions.pdf');
        Route::get('/reports/submissions/{submission}/bast', [ReportController::class, 'exportBast'])->name('reports.submissions.bast');
        Route::get('/analytics/kpi', [AnalyticsController::class, 'kpi'])->name('analytics.kpi');
        Route::get('/analytics/funnel', [AnalyticsController::class, 'funnel'])->name('analytics.funnel');
        Route::get('/analytics/regional', [AnalyticsController::class, 'regional'])->name('analytics.regional');
        Route::get('/analytics/trends', [AnalyticsController::class, 'trends'])->name('analytics.trends');
    });

    Route::middleware('can:kpi.view')->group(function () {
        Route::get('/kpi/overview', [KpiController::class, 'overview'])->name('kpi.overview');
        Route::get('/kpi/export', [KpiController::class, 'export'])->name('kpi.export');
        Route::get('/kpi/whatsapp-link', [KpiController::class, 'getWhatsAppLink'])->name('kpi.whatsapp_link');
        Route::get('/kpi/ratings/wa-link', [KpiController::class, 'getWhatsAppLink']);
        Route::get('/kpi/team/{team}/{period}', [KpiController::class, 'teamKpi'])->name('kpi.team');
        Route::get('/kpi/operations/{user}/{period}', [KpiController::class, 'technicianKpi'])->name('kpi.operations');
        Route::get('/kpi/acquisitions/{user}/{period}', [KpiController::class, 'salesKpi'])->name('kpi.acquisitions');
        Route::get('/sla-breaches/summary', [SlaBreachController::class, 'summary'])->name('sla_breaches.summary');
        Route::get('/sla-breaches', [SlaBreachController::class, 'index'])->name('sla_breaches.index');
        Route::get('/sla-breaches/{id}', [SlaBreachController::class, 'show'])->name('sla_breaches.show');
    });

    Route::middleware('can:kpi.manage')->group(function () {
        Route::get('/kpi/settings', [KpiController::class, 'getSettings'])->name('kpi.settings.get');
        Route::put('/kpi/settings', [KpiController::class, 'updateSettings'])->name('kpi.settings.update');
        Route::post('/kpi/snapshot', [KpiController::class, 'triggerSnapshot'])->name('kpi.snapshot');
        Route::post('/kpi/snapshots/calculate', [KpiController::class, 'triggerSnapshot']);
        Route::post('/kpi/rating', [KpiController::class, 'recordRating'])->name('kpi.rating');
        Route::post('/kpi/ratings', [KpiController::class, 'recordRating']);
    });

    // ── Pengguna (Users) ───────────────────────────────────────────────────
    Route::middleware('can:users.view')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        Route::get('/users/{user}/activity', [UserController::class, 'activity'])->name('users.activity');
    });

    Route::middleware('can:users.manage')->group(function () {
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus'])->name('users.update_status');
        Route::patch('/users/{user}/role', [UserController::class, 'updateRole'])->name('users.update_role');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset_password');
    });

    // ── Hak Akses & Matriks Role (Access Control) ─────────────────────────
    Route::middleware('can:access.manage')->group(function () {
        Route::get('/roles', [SuperadminRoleController::class, 'index'])->name('roles.index');
        Route::post('/roles', [SuperadminRoleController::class, 'store'])->name('roles.store');
        Route::get('/roles/catalog', [SuperadminRoleController::class, 'catalog'])->name('roles.catalog');
        Route::get('/roles/{role}', [SuperadminRoleController::class, 'show'])->name('roles.show');
        Route::patch('/roles/{role}', [SuperadminRoleController::class, 'update'])->name('roles.update');
        Route::put('/roles/{role}', [SuperadminRoleController::class, 'update']);
        Route::delete('/roles/{role}', [SuperadminRoleController::class, 'destroy'])->name('roles.destroy');
        Route::get('/permissions', [SuperadminRoleController::class, 'catalog'])->name('permissions.index');
        Route::get('/permissions/catalog', [SuperadminRoleController::class, 'catalog'])->name('permissions.catalog');
        Route::get('/roles/{role}/permissions', [SuperadminRoleController::class, 'permissions'])->name('roles.permissions');
        Route::put('/roles/{role}/permissions', [SuperadminRoleController::class, 'updatePermissions'])->name('roles.sync_permissions');
        Route::get('/roles/{role}/menu-preview', [SuperadminRoleController::class, 'menuPreview'])->name('roles.menu_preview');
        Route::post('/roles/{role}/reset', [SuperadminRoleController::class, 'reset'])->name('roles.reset');
    });
});

// Private Signed Media Download Route (Aturan 9)
Route::get('/media/{media}/download', [MediaController::class, 'download'])
    ->name('media.download')
    ->middleware('signed');
