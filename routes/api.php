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
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\DispatchController;
use App\Http\Controllers\Api\MassOutageController;
use App\Http\Controllers\Api\MenuController;
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
use App\Http\Controllers\Superadmin\RoleController as SuperadminRoleController;
use App\Http\Controllers\Superadmin\TeamController as SuperadminTeamController;
use App\Http\Controllers\Superadmin\UserController;
use App\Http\Controllers\Teknisi\ComplaintController as TeknisiComplaintController;
use App\Http\Controllers\Teknisi\TaskChecklistController;
use App\Http\Controllers\Teknisi\TaskController;
use App\Http\Controllers\Teknisi\WorkOrderController;
use App\Http\Middleware\WorkflowLogMiddleware;
use App\Models\Complaint;
use App\Models\OfficeLocation;
use App\Models\Task;
use App\Modules\Field\Controllers\MediaController;
use App\Modules\Field\Services\PhaseWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/time', function () {
    return response()->json([
        'success' => true,
        'time' => now()->toIso8601String(),
        'timestamp' => now()->timestamp,
        'timezone' => config('app.timezone', 'Asia/Jakarta'),
    ]);
});
Route::get('/tiles/manifest', [NetworkSyncController::class, 'tilesManifest']);
Route::get('/tiles/area.pmtiles', [NetworkSyncController::class, 'servePmtiles']);
Route::post('/login', [AuthController::class, 'login'])->name('login')->middleware('throttle:100,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:100,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    // Auth & Profile
    Route::get('/user', function (Request $request) {
        $user = $request->user();

        return array_merge($user->toArray(), [
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    });
    Route::put('/user/profile', [ProfileController::class, 'updateProfile']);
    Route::put('/user/password', [ProfileController::class, 'changePassword']);
    Route::get('/user/notification-settings', [ProfileController::class, 'getNotificationSettings']);
    Route::put('/user/notification-settings', [ProfileController::class, 'updateNotificationSettings']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Navigation Menu & Badges (TAMBAHAN FASE 1)
    Route::get('/menu', [MenuController::class, 'menu']);
    Route::get('/menu/badges', [MenuController::class, 'badges']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    // Web Push Subscriptions (True Web Push PWA)
    Route::get('/push-subscriptions/vapid-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy']);
    Route::post('/push-subscriptions/test', [PushSubscriptionController::class, 'test']);

    // Packages Catalog & Promo Validation
    Route::get('/packages', [PackageController::class, 'index']);
    Route::post('/promos/validate', [PromoCodeController::class, 'validateCode']);
    Route::get('/customers/{customer}/secrets', [CustomerController::class, 'showSecrets']);

    // Sales Endpoints
    Route::middleware('role:Sales|Admin|Superadmin')->group(function () {
        Route::get('/sales/submissions', [SubmissionController::class, 'index']);
        Route::post('/sales/submissions', [SubmissionController::class, 'store']);
        Route::post('/sales/submissions/check-duplicate', [SubmissionController::class, 'checkDuplicate']);
        Route::get('/sales/submissions/{submission}', [SubmissionController::class, 'show']);
        Route::put('/sales/submissions/{submission}', [SubmissionController::class, 'update']);
        Route::post('/sales/submissions/{submission}/upload-document', [SubmissionController::class, 'uploadDocument']);
    });

    // Admin Endpoints
    Route::middleware('role:Admin|Superadmin')->group(function () {
        // Promo Code Management
        Route::get('/admin/promos', [PromoCodeController::class, 'index']);
        Route::post('/admin/promos', [PromoCodeController::class, 'store']);
        Route::get('/admin/promos/{promo}', [PromoCodeController::class, 'show']);
        Route::put('/admin/promos/{promo}', [PromoCodeController::class, 'update']);
        Route::patch('/admin/promos/{promo}/toggle-status', [PromoCodeController::class, 'toggleStatus']);
        Route::delete('/admin/promos/{promo}', [PromoCodeController::class, 'destroy']);

        // Package Management & Synchronization
        Route::post('/admin/packages/sync', [PackageController::class, 'sync'])->middleware('throttle:5,1');
        Route::post('/admin/packages', [PackageController::class, 'store']);
        Route::put('/admin/packages/{package}', [PackageController::class, 'update']);
        Route::patch('/admin/packages/{package}/toggle-active', [PackageController::class, 'toggleActive']);
        // Submissions Validation
        Route::get('/admin/submissions', [SubmissionValidationController::class, 'index']);
        Route::get('/admin/submissions/{submission}', [SubmissionValidationController::class, 'show']);
        Route::match(['put', 'post'], '/admin/submissions/{submission}/validate', [SubmissionValidationController::class, 'validateSubmission']);

        // Customer Management (Kelola Pelanggan)
        Route::get('/admin/customers/export', [CustomerController::class, 'export']);
        Route::get('/admin/customers/import-template', [CustomerController::class, 'importTemplate']);
        Route::post('/admin/customers/import', [CustomerController::class, 'import']);
        Route::get('/admin/customers', [CustomerController::class, 'index']);
        Route::post('/admin/customers', [CustomerController::class, 'store']);
        Route::get('/admin/customers/stats', [CustomerController::class, 'stats']);
        Route::get('/admin/customers/{customer}', [CustomerController::class, 'show']);
        Route::get('/admin/customers/{customer}/secrets', [CustomerController::class, 'showSecrets']);
        Route::patch('/admin/customers/{customer}/status', [CustomerController::class, 'updateStatus']);
        Route::put('/admin/customers/{customer}', [CustomerController::class, 'update']);

        // BFASS Health
        Route::get('/admin/bfass/health', BfassHealthController::class);

        // Provisioning
        Route::get('/admin/provisionings', [ProvisioningController::class, 'index']);
        Route::post('/admin/provisionings', [ProvisioningController::class, 'store']);
        Route::get('/admin/provisionings/{provisioning}', [ProvisioningController::class, 'show']);
        Route::put('/admin/provisionings/{provisioning}/bfass-credentials', [ProvisioningController::class, 'updateBfassCredentials']);
        Route::post('/admin/provisionings/{provisioning}/retry', [ProvisioningController::class, 'retry']);

        // Task Assignment
        Route::patch('/admin/tasks/{task}/reassign', [ProvisioningController::class, 'reassignTask']);
        Route::put('/admin/task-assignments/{assignment}/approve', [TaskAssignmentApprovalController::class, 'approve']);
        Route::put('/admin/task-assignments/{assignment}/return', [TaskAssignmentApprovalController::class, 'returnAssignment']);

        // Reports & Audit Logs
        Route::get('/admin/reports/submissions/excel', [ReportController::class, 'exportExcel']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/admin/audit-log', [AuditLogController::class, 'index']);

        // Analytics
        Route::get('/admin/analytics/kpi', [AnalyticsController::class, 'kpi']);
        Route::get('/admin/analytics/funnel', [AnalyticsController::class, 'funnel']);
        Route::get('/admin/analytics/regional', [AnalyticsController::class, 'regional']);
        Route::get('/admin/analytics/trends', [AnalyticsController::class, 'trends']);

        // Admin Document Review Endpoint
        Route::put('/admin/documents/{document}/review', [SubmissionDocumentController::class, 'review']);

        // SLA Breaches
        Route::get('/admin/sla-breaches/summary', [SlaBreachController::class, 'summary']);
        Route::get('/admin/sla-breaches', [SlaBreachController::class, 'index']);
        Route::get('/admin/sla-breaches/{id}', [SlaBreachController::class, 'show']);

        // ── Complaints Management (Menu Pengaduan) ────────────────────────
        Route::get('/admin/areas/hierarchy', [AdminComplaintController::class, 'areaHierarchy']);
        Route::get('/admin/areas', [AdminComplaintController::class, 'areas']);
        Route::get('/admin/teams/available', [AdminComplaintController::class, 'availableTeams']);
        Route::get('/admin/technicians/available', [AdminComplaintController::class, 'availableTechnicians']);
        Route::get('/admin/complaints/stats', [AdminComplaintController::class, 'stats']);
        Route::get('/admin/complaints/check-duplicate', [AdminComplaintController::class, 'checkDuplicate']);
        Route::get('/admin/complaints', [AdminComplaintController::class, 'index']);
        Route::post('/admin/complaints', [AdminComplaintController::class, 'store']);
        Route::get('/admin/complaints/{complaint}', [AdminComplaintController::class, 'show']);
        Route::post('/admin/complaints/{complaint}/assign', [AdminComplaintController::class, 'assign']);
        Route::put('/admin/complaints/{complaint}/resolve-remote', [AdminComplaintController::class, 'resolveRemote']);
        Route::put('/admin/complaints/{complaint}/verify-close', [AdminComplaintController::class, 'verifyClose']);
        Route::put('/admin/complaints/{complaint}/return', [AdminComplaintController::class, 'returnToTechnician']);
        Route::put('/admin/complaints/{complaint}/cancel', [AdminComplaintController::class, 'cancel']);
        Route::put('/admin/complaints/{complaint}/reopen', [AdminComplaintController::class, 'reopen']);
        Route::put('/admin/complaints/{complaint}/pending-customer', [AdminComplaintController::class, 'pendingCustomer']);
        Route::put('/admin/complaints/{complaint}/resume', [AdminComplaintController::class, 'resumeFromPending']);

        // ── Unified Work Orders & Fleet Tracking (Admin / Superadmin) ───
        Route::get('/admin/tracking/live-map', [FleetTrackingController::class, 'liveMap']);
        Route::get('/admin/work-orders', [FleetTrackingController::class, 'index']);
    });

    // Teknisi Endpoints
    Route::middleware('role:Teknisi|Admin|Superadmin')->group(function () {
        Route::get('/admin/reports/submissions/{submission}/pdf', [ReportController::class, 'exportPdf']);
        Route::get('/admin/reports/submissions/{submission}/bast', [ReportController::class, 'exportBast']);

        // ── Unified Work Orders (Satu Pintu: PSB + Gangguan) ────────────
        Route::get('/teknisi/work-orders', [WorkOrderController::class, 'index']);
        Route::get('/teknisi/work-orders/{id}', [WorkOrderController::class, 'show']);

        Route::get('/teknisi/tasks', [TaskController::class, 'index']);
        Route::get('/teknisi/tasks/{task}', [TaskController::class, 'show']);
        Route::put('/teknisi/tasks/{task}/status', [TaskController::class, 'updateStatus'])->middleware(WorkflowLogMiddleware::class);
        Route::post('/teknisi/tasks/{task}/upload-photo', [TaskController::class, 'uploadPhoto'])->middleware(WorkflowLogMiddleware::class);
        Route::post('/teknisi/tasks/{task}/upload-signature', [TaskController::class, 'uploadSignature'])->middleware(WorkflowLogMiddleware::class);
        Route::get('/teknisi/tasks/{task}/checklist', [TaskChecklistController::class, 'show']);
        Route::put('/teknisi/tasks/{task}/checklist', [TaskChecklistController::class, 'update']);
        Route::post('/teknisi/tasks/{task}/phase-1', [TaskController::class, 'phase1'])->middleware(WorkflowLogMiddleware::class);
        Route::post('/teknisi/tasks/{task}/phase-2', [TaskController::class, 'phase2'])->middleware(WorkflowLogMiddleware::class);

        // ── Complaints Teknisi (Penyelesaian 2 Fase & Absensi Tim) ───────
        Route::get('/teknisi/complaints', [TeknisiComplaintController::class, 'index']);
        Route::get('/teknisi/complaints/{complaint}', [TeknisiComplaintController::class, 'show']);
        Route::post('/teknisi/complaints/{complaint}/start', [TeknisiComplaintController::class, 'start']);
        Route::post('/teknisi/complaints/{complaint}/phase-1', [TeknisiComplaintController::class, 'phase1']);
        Route::post('/teknisi/complaints/{complaint}/resolve', [TeknisiComplaintController::class, 'resolve']); // Backward-compatible alias
        Route::post('/teknisi/complaints/{complaint}/phase-2-attendance', [TeknisiComplaintController::class, 'phase2Attendance']);
        Route::get('/teknisi/complaints/{complaint}/attendances', [TeknisiComplaintController::class, 'attendances']);
        Route::put('/teknisi/complaints/{complaint}/schedule-visit', [TeknisiComplaintController::class, 'scheduleVisit']);
        Route::put('/teknisi/complaints/{complaint}/pending-customer', [TeknisiComplaintController::class, 'pendingCustomer']);
    });

    // Superadmin Endpoints
    Route::middleware('role:Superadmin')->group(function () {
        Route::delete('/superadmin/submissions/{submission}', [SubmissionController::class, 'destroy']);
        Route::delete('/admin/submissions/{submission}', [SubmissionController::class, 'destroy']);
        Route::delete('/superadmin/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::delete('/admin/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::delete('/admin/packages/{package}', [PackageController::class, 'destroy']);

        // ── Team Management (Team A, B, C, D, dst.) ───────────────────
        Route::get('/superadmin/teams', [SuperadminTeamController::class, 'index']);
        Route::post('/superadmin/teams', [SuperadminTeamController::class, 'store']);
        Route::get('/superadmin/teams/{team}', [SuperadminTeamController::class, 'show']);
        Route::put('/superadmin/teams/{team}', [SuperadminTeamController::class, 'update']);
        Route::patch('/superadmin/teams/{team}/toggle', [SuperadminTeamController::class, 'toggle']);
        Route::delete('/superadmin/teams/{team}', [SuperadminTeamController::class, 'destroy']);
        Route::post('/superadmin/teams/{team}/members', [SuperadminTeamController::class, 'assignMembers']);

        // ── Role & Menu Access Matrix Management ──────────────────────
        Route::get('/superadmin/roles', [SuperadminRoleController::class, 'index']);
        Route::post('/superadmin/roles', [SuperadminRoleController::class, 'store']);
        Route::get('/superadmin/roles/{role}', [SuperadminRoleController::class, 'show']);
        Route::put('/superadmin/roles/{role}/permissions', [SuperadminRoleController::class, 'updatePermissions']);
        Route::delete('/superadmin/roles/{role}', [SuperadminRoleController::class, 'destroy']);
        Route::get('/superadmin/permissions', [SuperadminRoleController::class, 'catalog']);

        // ── User Management ───────────────────────────────────────────
        Route::patch('/superadmin/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::post('/superadmin/users/{user}/reset-password', [UserController::class, 'resetPassword']);
        Route::get('/superadmin/users/{user}/activity', [UserController::class, 'activity']);
        Route::apiResource('/superadmin/users', UserController::class);
    });

    // ── Admin & Superadmin Operational Endpoints ────────────────────────
    Route::middleware('role:Admin|Superadmin')->group(function () {
        // Device & Attendance Admin Endpoints
        Route::get('/admin/devices', [DeviceController::class, 'index']);
        Route::put('/admin/devices/{id}/approve', [DeviceController::class, 'approve']);
        Route::put('/admin/devices/{id}/revoke', [DeviceController::class, 'revoke']);
        Route::get('/admin/attendances', [AttendanceController::class, 'adminIndex']);
        Route::put('/admin/attendances/{user}/{date}', [AttendanceController::class, 'adminAdjust']);

        // Office Locations (Titik Kantor & Radius Geofence)
        Route::get('/admin/office-locations', function () {
            return response()->json(['success' => true, 'data' => OfficeLocation::all()]);
        });
        Route::post('/admin/office-locations', function (Request $request) {
            $data = $request->validate([
                'name' => 'required|string|max:150',
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'radius_meters' => 'nullable|integer|min:50',
                'is_active' => 'boolean',
            ]);
            $data['radius_meters'] = max(50, (int) ($data['radius_meters'] ?? 50));
            $office = OfficeLocation::create($data);

            return response()->json(['success' => true, 'message' => 'Titik kantor berhasil ditambahkan.', 'data' => $office], 201);
        });
        Route::put('/admin/office-locations/{id}', function ($id, Request $request) {
            $office = OfficeLocation::findOrFail($id);
            $data = $request->validate([
                'name' => 'sometimes|string|max:150',
                'latitude' => 'sometimes|numeric|between:-90,90',
                'longitude' => 'sometimes|numeric|between:-180,180',
                'radius_meters' => 'sometimes|integer|min:50',
                'is_active' => 'sometimes|boolean',
            ]);
            if (isset($data['radius_meters'])) {
                $data['radius_meters'] = max(50, (int) $data['radius_meters']);
            }
            $office->update($data);

            return response()->json(['success' => true, 'message' => 'Titik kantor berhasil diperbarui.', 'data' => $office]);
        });
        Route::delete('/admin/office-locations/{id}', function ($id) {
            $office = OfficeLocation::findOrFail($id);
            $office->delete();

            return response()->json(['success' => true, 'message' => 'Titik kantor berhasil dihapus.']);
        });

        // KPI & Rating Pelanggan (Aturan 11 & Fase 5)
        Route::get('/admin/kpi/overview', [KpiController::class, 'overview']);
        Route::get('/admin/kpi/export', [KpiController::class, 'export']);
        Route::get('/admin/kpi/settings', [KpiController::class, 'getSettings']);
        Route::put('/admin/kpi/settings', [KpiController::class, 'updateSettings']);
        Route::post('/admin/kpi/snapshot', [KpiController::class, 'triggerSnapshot']);
        Route::post('/admin/kpi/rating', [KpiController::class, 'recordRating']);
        Route::get('/admin/kpi/whatsapp-link', [KpiController::class, 'getWhatsAppLink']);
        Route::get('/admin/kpi/team/{team}/{period}', [KpiController::class, 'teamKpi']);
        Route::get('/admin/kpi/technician/{user}/{period}', [KpiController::class, 'technicianKpi']);
        Route::get('/admin/kpi/sales/{user}/{period}', [KpiController::class, 'salesKpi']);

        // Gangguan Massal (Perluasan Jaringan - Butir 1)
        Route::get('/admin/network/mass-outage/affected-customers', [MassOutageController::class, 'affectedCustomers']);
        Route::post('/admin/network/mass-outage/trigger', [MassOutageController::class, 'trigger']);
        Route::post('/admin/network/mass-outage/resolve', [MassOutageController::class, 'resolve']);

        // BRAS Devices & PPPoE Session Sync (Perluasan Jaringan - Butir 2)
        Route::get('/admin/network/bras-devices', [BrasDeviceController::class, 'index']);
        Route::post('/admin/network/bras-devices', [BrasDeviceController::class, 'store']);
        Route::get('/admin/network/bras-devices/{brasDevice}', [BrasDeviceController::class, 'show']);
        Route::put('/admin/network/bras-devices/{brasDevice}', [BrasDeviceController::class, 'update']);
        Route::delete('/admin/network/bras-devices/{brasDevice}', [BrasDeviceController::class, 'destroy']);
        Route::post('/admin/network/bras-devices/{brasDevice}/sync', [BrasDeviceController::class, 'sync']);
        Route::get('/admin/network/bras-devices/{brasDevice}/sessions', [BrasDeviceController::class, 'sessions']);
        Route::get('/admin/network/bras-devices/{brasDevice}/logs', [BrasDeviceController::class, 'logs']);

        // Jaringan: ODC, ODP, Cable Tracks, Approvals, & Logs
        Route::get('/admin/network/logs', [NetworkManagementController::class, 'logs']);
        Route::get('/admin/network/approvals', [NetworkManagementController::class, 'approvals']);

        Route::apiResource('/admin/odcs', OdcController::class);

        Route::post('/admin/odps/{odp}/approve', [OdpController::class, 'approve']);
        Route::apiResource('/admin/odps', OdpController::class);

        Route::post('/admin/cable-tracks/{cableTrack}/approve', [CableTrackController::class, 'approve']);
        Route::get('/admin/cable-tracks/{cableTrack}/affected-customers', [CableTrackController::class, 'affectedCustomers']);
        Route::apiResource('/admin/cable-tracks', CableTrackController::class);

        // Phase 2 Waiver / Pembebasan (Aturan 6 & Tambahan Peninjauan Bukti)
        Route::put('/admin/tickets/{type}/{id}/phase-2-waive', [TicketReviewController::class, 'waive']);

        // Dispatch Management (Fase 2)
        Route::get('/admin/dispatch-settings', [DispatchController::class, 'getSettings']);
        Route::put('/admin/dispatch-settings', [DispatchController::class, 'updateSettings']);
        Route::get('/admin/dispatch/pending', [DispatchController::class, 'getPendingTickets']);
        Route::get('/admin/dispatch/unassigned', [DispatchController::class, 'getPendingTickets']);
        Route::get('/admin/assignment-logs', [DispatchController::class, 'getAssignmentLogs']);
        Route::post('/admin/dispatch/manual-assign', [DispatchController::class, 'manualAssign']);
        Route::post('/admin/dispatch/tickets/{type}/{id}/dispatch-now', [DispatchController::class, 'dispatchNow']);
        Route::get('/admin/dispatch/tickets/{type}/{id}/unified-detail', [DispatchController::class, 'unifiedDetail']);

        // ── Admin: Absensi Harian & Rekap Absensi (Fase 1) ──────────────
        Route::get('/admin/attendances/today', [AttendanceController::class, 'adminToday']);
        Route::get('/admin/attendances', [AttendanceController::class, 'adminIndex']);
        Route::post('/admin/attendances/manual', [AttendanceController::class, 'adminManual']);
        Route::get('/admin/attendances/recap', [AttendanceController::class, 'adminRecap']);
        Route::get('/admin/attendances/recap/export', [AttendanceController::class, 'adminRecapExport']);

        // Dashboard Shortcuts (Fase 1)
        Route::get('/admin/dashboard/shortcuts', [AttendanceController::class, 'dashboardShortcuts']);
    });

    // ── Field & PWA (All Authenticated Roles) ──────────────────────────
    Route::post('/field/devices/register', [DeviceController::class, 'register']);
    Route::get('/attendance/today', [AttendanceController::class, 'today']);
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);

    // Field Ticket Actions: Accept & Decline (Fase 2)
    Route::get('/field/tickets/current', [DispatchController::class, 'getCurrentTicket']);
    Route::post('/field/tickets/{type}/{id}/accept', [DispatchController::class, 'acceptTicket']);
    Route::post('/field/tickets/{type}/{id}/decline', [DispatchController::class, 'declineTicket']);

    // ── Network Offline Sync & Field Submissions (TAMBAHAN FASE 3) ────
    Route::get('/network/sync', [NetworkSyncController::class, 'sync']);
    Route::post('/odps', [NetworkSyncController::class, 'storeOdp']);
    Route::get('/cable-tracks', [NetworkSyncController::class, 'indexCableTracks']);
    Route::post('/cable-tracks', [NetworkSyncController::class, 'storeCableTrack']);
    Route::post('/network/route-snap', [NetworkRoutingController::class, 'snapRoute']);
    Route::get('/network/map-layers', [NetworkMapLayerController::class, 'index']);

    // ── Fase 1 (Dikerjakan Bersama di Lapangan) ───────────────────────
    Route::post('/field/tickets/{type}/{id}/phase-1', function ($type, $id, Request $request, PhaseWorkflowService $workflow) {
        $ticket = $type === 'psb' ? Task::findOrFail($id) : Complaint::findOrFail($id);

        $data = $request->all();

        // Ambil file atau base64 foto sebelum
        if ($request->hasFile('photo_before')) {
            $data['photo_before'] = $request->file('photo_before');
        } elseif ($request->filled('photo_before_base64')) {
            $data['photo_before'] = $request->input('photo_before_base64');
        }

        // Ambil file atau base64 foto sesudah
        if ($request->hasFile('photo_after')) {
            $data['photo_after'] = $request->file('photo_after');
        } elseif ($request->filled('photo_after_base64')) {
            $data['photo_after'] = $request->input('photo_after_base64');
        }

        // Ambil file atau base64 tanda tangan
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
    });

    // ── Tiket Lapangan & Absensi Fase 2 (Aturan 6 & 7) ─────────────────
    Route::post('/field/tickets/{type}/{id}/phase-2-attendance', function ($type, $id, Request $request, PhaseWorkflowService $workflow) {
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
            $base64 = $request->input('selfie_base64');
            $selfieContent = $base64;
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
    });

    // ── Status & Persyaratan Fase Tiket Lapangan ────────────────────────
    Route::get('/field/tickets/{type}/{id}/phase-status', function ($type, $id, Request $request, PhaseWorkflowService $workflow) {
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
    });

    // ── Admin: Tinjau Bukti & Bebaskan Anggota Fase 2 (Item 7) ──────────
    Route::middleware(['role:Admin|Superadmin'])->group(function () {
        Route::get('/admin/tickets/{type}/{id}/evidence', function ($type, $id) {
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

        // ── Review Actions & Phase 2 Waiver (Tambahan Peninjauan Bukti & Aturan 6) ───
        Route::post('/admin/tickets/{type}/{id}/review/approve', [TicketReviewController::class, 'approve']);
        Route::post('/admin/tickets/{type}/{id}/review/rework', [TicketReviewController::class, 'rework']);
        Route::post('/admin/tickets/{type}/{id}/review/flag', [TicketReviewController::class, 'flag']);
        Route::post('/admin/tickets/{type}/{id}/phase2/waive', [TicketReviewController::class, 'waive']);
    });
});

// Private Signed Media Download Route (Aturan 9)
Route::get('/media/{media}/download', [MediaController::class, 'download'])
    ->name('media.download')
    ->middleware('signed');
