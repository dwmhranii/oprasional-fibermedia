<?php

namespace App\Http\Controllers\Api;

use App\Exports\AttendanceRecapExport;
use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\OfficeLocation;
use App\Models\RoundRobinPointer;
use App\Models\Team;
use App\Models\User;
use App\Modules\Attendance\Services\AttendanceService;
use App\Services\AttendanceRecapService;
use App\Services\TeamReadinessService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttendanceController extends Controller
{
    protected AttendanceService $attendanceService;

    protected TeamReadinessService $teamReadinessService;

    public function __construct(
        AttendanceService $attendanceService,
        TeamReadinessService $teamReadinessService
    ) {
        $this->attendanceService = $attendanceService;
        $this->teamReadinessService = $teamReadinessService;
    }

    /**
     * Check-in endpoint for PWA / Field staff.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
            'device_uuid' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:500',
        ]);

        if (! $request->hasFile('selfie') && ! $request->filled('selfie_base64')) {
            return response()->json([
                'success' => false,
                'message' => 'Foto selfie dari kamera wajib disertakan.',
            ], 422);
        }

        $result = $this->attendanceService->processCheckIn($request->user(), $request);

        return response()->json($result, $result['status_code']);
    }

    /**
     * Check-out endpoint for PWA / Field staff.
     */
    public function checkOut(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
            'selfie' => 'nullable|file|image|max:1024',
            'selfie_base64' => 'nullable|string',
            'device_uuid' => 'nullable|string|max:100',
        ]);

        $result = $this->attendanceService->processCheckOut($request->user(), $request);

        return response()->json($result, $result['status_code']);
    }

    /**
     * Get today's attendance status & office geofence info for current user.
     */
    public function today(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        $attendance = DailyAttendance::with(['checkInMedia', 'checkOutMedia', 'office'])
            ->where('user_id', $user->id)
            ->whereDate('work_date', $today)
            ->first();

        $offices = OfficeLocation::where('is_active', true)->get();

        // Team info
        $team = $user->teams()->first();
        $isTeamReady = false;
        if ($team) {
            $isTeamReady = $this->teamReadinessService->isTeamReady($team, $today);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                    'team' => $team ? [
                        'id' => $team->id,
                        'name' => $team->name,
                        'is_ready' => $isTeamReady,
                    ] : null,
                ],
                'attendance' => $attendance ? [
                    'id' => $attendance->id,
                    'work_date' => $attendance->work_date->toDateString(),
                    'status' => $attendance->status,
                    'check_in_at' => $attendance->check_in_at ? $attendance->check_in_at->toIso8601String() : null,
                    'check_out_at' => $attendance->check_out_at ? $attendance->check_out_at->toIso8601String() : null,
                    'check_in_time' => $attendance->check_in_at ? $attendance->check_in_at->format('H:i') : null,
                    'check_out_time' => $attendance->check_out_at ? $attendance->check_out_at->format('H:i') : null,
                    'office_distance_meters' => $attendance->office_distance_meters,
                    'late_minutes' => $attendance->late_minutes,
                    'photo_url' => $attendance->checkInMedia?->signed_url,
                    'check_in_photo_url' => $attendance->checkInMedia?->signed_url,
                    'check_out_photo_url' => $attendance->checkOutMedia?->signed_url,
                ] : null,
                'offices' => $offices->map(fn ($o) => [
                    'id' => $o->id,
                    'name' => $o->name,
                    'latitude' => (float) $o->latitude,
                    'longitude' => (float) $o->longitude,
                    'radius_meters' => (int) $o->radius_meters,
                ]),
            ],
        ]);
    }

    /**
     * Riwayat absensi pribadi pengguna (PWA / Mobile).
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = min((int) $request->input('limit', 30), 100);

        $attendances = DailyAttendance::with(['office', 'checkInMedia', 'checkOutMedia'])
            ->where('user_id', $user->id)
            ->orderByDesc('work_date')
            ->orderByDesc('check_in_at')
            ->take($limit)
            ->get()
            ->map(function ($att) {
                return [
                    'id' => (string) $att->id,
                    'user_id' => $att->user_id,
                    'work_date' => $att->work_date ? $att->work_date->toDateString() : null,
                    'status' => $att->status,
                    'attendance_channel' => $att->track === 'field' ? 'field' : 'office',
                    'check_in_at' => $att->check_in_at ? $att->check_in_at->toIso8601String() : null,
                    'check_out_at' => $att->check_out_at ? $att->check_out_at->toIso8601String() : null,
                    'check_in_time' => $att->check_in_at ? $att->check_in_at->format('H:i') : null,
                    'check_out_time' => $att->check_out_at ? $att->check_out_at->format('H:i') : null,
                    'office_name' => $att->office?->name,
                    'office_distance_meters' => $att->office_distance_meters,
                    'wifi_ip' => $att->client_ip,
                    'wifi_ip_verified' => true,
                    'is_suspicious' => (bool) $att->is_suspicious,
                    'review_status' => $att->review_status,
                    'check_in_photo_url' => $att->checkInMedia?->signed_url,
                    'check_out_photo_url' => $att->checkOutMedia?->signed_url,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $attendances,
        ]);
    }

    /**
     * Halaman Admin: Absensi Harian Hari Ini.
     * Mengembalikan:
     * 1. Tabel siapa sudah masuk/pulang hari ini (jam, lokasi lat/lng, penanda di luar radius).
     * 2. Panel "Tim Siap" (tim mana siap, anggota hadir berapa & siapa saja).
     * 3. Tim yang mendapat giliran berikutnya untuk antrean PSB dan gangguan ("belum tersedia" jika tidak ada tim siap).
     */
    public function adminToday(Request $request): JsonResponse
    {
        $targetDate = $request->input('date');
        $query = DailyAttendance::with(['user.teams', 'office', 'checkInMedia', 'checkOutMedia', 'setBy', 'reviewedBy']);

        if ($targetDate && $targetDate !== 'all') {
            try {
                $today = Carbon::parse($targetDate)->toDateString();
            } catch (\Exception $e) {
                $today = Carbon::today()->toDateString();
            }
            $query->whereDate('work_date', $today);
        } elseif ($targetDate === 'all') {
            $today = Carbon::today()->toDateString();
            $query->orderByDesc('work_date')->orderByDesc('check_in_at')->take(100);
        } else {
            $today = Carbon::today()->toDateString();
            $query->whereDate('work_date', $today);
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('track') && $request->input('track') !== 'all') {
            $query->where('track', $request->input('track'));
        }

        if ($request->filled('review_status') && $request->input('review_status') !== 'all') {
            $query->where('review_status', $request->input('review_status'));
        }

        $attendances = $query->get()
            ->map(function ($att) {
                $allowedRadius = $att->office ? max(50, $att->office->radius_meters ?: 50) : 50;
                $isOutsideRadius = $att->office_distance_meters !== null && $att->office_distance_meters > $allowedRadius;

                return [
                    'id' => $att->id,
                    'user_id' => $att->user_id,
                    'user_name' => $att->user?->name,
                    'user_email' => $att->user?->email,
                    'team_name' => $att->user?->teams->first()?->name ?? 'Tanpa Tim',
                    'track' => $att->track ?? 'office',
                    'status' => $att->status,
                    'review_status' => $att->review_status,
                    'is_suspicious' => (bool) $att->is_suspicious,
                    'suspicious_reason' => $att->suspicious_reason,
                    'client_ip' => $att->client_ip,
                    'check_in_at' => $att->check_in_at?->format('H:i:s'),
                    'check_out_at' => $att->check_out_at?->format('H:i:s'),
                    'latitude' => $att->check_in_lat ? (float) $att->check_in_lat : null,
                    'longitude' => $att->check_in_lng ? (float) $att->check_in_lng : null,
                    'accuracy' => $att->check_in_accuracy ? (float) $att->check_in_accuracy : null,
                    'check_out_latitude' => $att->check_out_lat ? (float) $att->check_out_lat : null,
                    'check_out_longitude' => $att->check_out_lng ? (float) $att->check_out_lng : null,
                    'check_out_accuracy' => $att->check_out_accuracy ? (float) $att->check_out_accuracy : null,
                    'office_name' => $att->office?->name,
                    'office_distance_meters' => $att->office_distance_meters,
                    'is_outside_radius' => $isOutsideRadius,
                    'is_manual' => (bool) $att->is_manual,
                    'note' => $att->note,
                    'set_by' => $att->setBy?->name,
                    'reviewed_by' => $att->reviewedBy?->name,
                    'reviewed_at' => $att->reviewed_at?->format('Y-m-d H:i:s'),
                    'review_notes' => $att->review_notes,
                    'selfie_url' => $att->checkInMedia?->signed_url,
                    'check_in_selfie_url' => $att->checkInMedia?->signed_url,
                    'check_out_selfie_url' => $att->checkOutMedia?->signed_url,
                ];
            });

        // 2. Panel Tim Siap
        $allTeams = Team::where('is_active', true)->orderBy('order_index')->get();
        $minMembers = $this->teamReadinessService->getMinMembersPresent();
        $teamsReadyList = [];
        $readyTeamMap = [];

        foreach ($allTeams as $team) {
            $presentMembers = $this->teamReadinessService->getPresentMembersToday($team, $today);
            $attendedMembers = $this->teamReadinessService->getAttendedMembersToday($team, $today);
            $presentCount = $presentMembers->count();
            $attendedCount = $attendedMembers->count();
            $isReady = $presentCount >= $minMembers;

            if ($isReady) {
                $readyTeamMap[$team->id] = $team;
            }

            $checkedOutMembers = $attendedMembers->filter(function ($u) use ($presentMembers) {
                return ! $presentMembers->contains('id', $u->id);
            });

            $teamsReadyList[] = [
                'id' => $team->id,
                'name' => $team->name,
                'is_ready' => $isReady,
                'present_count' => $presentCount,
                'attended_count' => $attendedCount,
                'checked_out_count' => $checkedOutMembers->count(),
                'min_required' => $minMembers,
                'present_members' => $presentMembers->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                ])->values(),
                'checked_out_members' => $checkedOutMembers->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                ])->values(),
            ];
        }

        // 3. Tim Giliran Berikutnya untuk PSB dan Gangguan
        $nextQueue = [
            'psb' => $this->calculateNextQueueTeam('psb', $allTeams, $readyTeamMap),
            'complaint' => $this->calculateNextQueueTeam('complaint', $allTeams, $readyTeamMap),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $today,
                'attendances' => $attendances,
                'team_panel' => [
                    'min_members_present' => $minMembers,
                    'total_ready_teams' => count($readyTeamMap),
                    'teams' => $teamsReadyList,
                ],
                'next_queue' => $nextQueue,
            ],
        ]);
    }

    /**
     * Hitung giliran tim berikutnya berdasarkan RoundRobinPointer dan tim siap.
     * Mengembalikan "belum tersedia" jika tidak ada tim yang siap.
     */
    protected function calculateNextQueueTeam(string $queueType, $allTeams, array $readyTeamMap): string
    {
        if (empty($readyTeamMap) || $allTeams->isEmpty()) {
            return 'belum tersedia';
        }

        $pointer = RoundRobinPointer::where('queue_type', $queueType)->first();
        $lastTeamId = $pointer?->last_team_id;

        $teamCount = $allTeams->count();
        $lastTeamIndex = -1;

        if ($lastTeamId) {
            foreach ($allTeams as $idx => $t) {
                if ((int) $t->id === (int) $lastTeamId) {
                    $lastTeamIndex = $idx;
                    break;
                }
            }
        }

        for ($step = 1; $step <= $teamCount; $step++) {
            $candidateIdx = ($lastTeamIndex + $step) % $teamCount;
            $candidateTeam = $allTeams[$candidateIdx];
            if (isset($readyTeamMap[$candidateTeam->id])) {
                return $candidateTeam->name;
            }
        }

        return 'belum tersedia';
    }

    /**
     * Input manual absensi oleh Admin dengan alasan wajib.
     * Sesuai instruksi: "input manual tanpa alasan ditolak".
     */
    public function adminManual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'work_date' => 'required|date',
            'status' => 'required|in:hadir,izin,sakit,alpa',
            'reason' => 'required|string|min:5|max:500',
        ], [
            'reason.required' => 'Alasan input manual wajib diisi.',
            'reason.min' => 'Alasan input manual minimal 5 karakter.',
        ]);

        $checkInAt = null;
        if ($validated['status'] === 'hadir') {
            $checkInAt = Carbon::parse($validated['work_date'])->setTime(8, 0, 0);
        }

        $attendance = DailyAttendance::updateOrCreate([
            'user_id' => $validated['user_id'],
            'work_date' => $validated['work_date'],
        ], [
            'status' => $validated['status'],
            'check_in_at' => $checkInAt,
            'note' => $validated['reason'],
            'is_manual' => true,
            'set_by_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Absensi manual berhasil disimpan.',
            'data' => $attendance,
        ]);
    }

    /**
     * Rekap Absensi Bulanan.
     */
    public function adminRecap(Request $request, AttendanceRecapService $recapService): JsonResponse
    {
        $month = $request->input('month', Carbon::today()->format('Y-m'));
        $teamId = $request->filled('team_id') ? (int) $request->team_id : null;
        $userId = $request->filled('user_id') ? (int) $request->user_id : null;

        $recap = $recapService->getMonthlyRecap($month, $teamId, $userId);

        return response()->json([
            'success' => true,
            'data' => $recap,
        ]);
    }

    /**
     * Ekspor Rekap Absensi Bulanan ke file Excel (.xlsx).
     */
    public function adminRecapExport(Request $request, AttendanceRecapService $recapService): BinaryFileResponse
    {
        $month = $request->input('month', Carbon::today()->format('Y-m'));
        $teamId = $request->filled('team_id') ? (int) $request->team_id : null;
        $userId = $request->filled('user_id') ? (int) $request->user_id : null;

        $recap = $recapService->getMonthlyRecap($month, $teamId, $userId);
        $fileName = "rekap_absensi_{$month}.xlsx";

        return Excel::download(new AttendanceRecapExport($recap), $fileName);
    }

    /**
     * Halaman Admin: Daftar Absensi (Index).
     * Jika work_date tidak diisi, gunakan hari ini (alias/konsisten dengan adminToday).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        return $this->adminToday($request);
    }

    /**
     * Admin: Penyesuaian/Update absensi untuk pengguna dan tanggal tertentu.
     */
    public function adminAdjust(Request $request, string $userId, string $date): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:hadir,izin,sakit,alpa',
            'reason' => 'nullable|string|max:500',
            'late_minutes' => 'nullable|integer|min:0',
        ]);

        $targetUser = User::findOrFail($userId);
        $workDate = Carbon::parse($date)->toDateString();

        $checkInAt = null;
        if ($validated['status'] === 'hadir') {
            $checkInAt = Carbon::parse($workDate)->setTime(8, 0, 0);
        }

        $attendance = DailyAttendance::updateOrCreate([
            'user_id' => $targetUser->id,
            'work_date' => $workDate,
        ], [
            'status' => $validated['status'],
            'check_in_at' => $checkInAt,
            'late_minutes' => $validated['late_minutes'] ?? 0,
            'note' => $validated['reason'] ?? 'Penyesuaian oleh Admin/Superadmin',
            'is_manual' => true,
            'set_by_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status absensi berhasil disesuaikan.',
            'data' => $attendance,
        ]);
    }

    /**
     * Tinjau Absensi Lapangan (Approve / Reject) oleh Admin/CS atau Superadmin sesuai PRD Bagian 6.
     */
    public function reviewAttendance(Request $request, DailyAttendance $attendance): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validated['action'] === 'reject' && empty(trim($validated['notes'] ?? ''))) {
            return response()->json([
                'success' => false,
                'message' => 'Catatan alasan penolakan absensi wajib diisi.',
            ], 422);
        }

        $reviewer = $request->user();
        $isApproved = $validated['action'] === 'approve';

        $attendance->update([
            'status' => $isApproved ? 'hadir' : 'alpa',
            'review_status' => $isApproved ? 'approved' : 'rejected',
            'reviewed_by_id' => $reviewer->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['notes'] ?? null,
        ]);

        activity('attendance')
            ->performedOn($attendance)
            ->causedBy($reviewer)
            ->withProperties([
                'attendance_id' => $attendance->id,
                'target_user_id' => $attendance->user_id,
                'action' => $validated['action'],
                'notes' => $validated['notes'] ?? null,
            ])
            ->log("Absensi lapangan staf {$attendance->user?->name} ".($isApproved ? 'disetujui' : 'ditolak')." oleh {$reviewer->name}.");

        return response()->json([
            'success' => true,
            'message' => 'Absensi lapangan berhasil '.($isApproved ? 'disetujui (status: hadir)' : 'ditolak (status: alpa)').'.',
            'data' => new \App\Http\Resources\DailyAttendanceResource($attendance->load(['user', 'reviewedBy', 'office'])),
        ]);
    }

    /**
     * Kartu Pintasan Dashboard Admin:
     * - pengaduan baru dan belum ditugaskan
     * - pelanggan jatuh tempo / terisolir
     * - tim siap hari ini
     * (kartu yang datanya belum tersedia disembunyikan oleh FE)
     */
    public function dashboardShortcuts(Request $request): JsonResponse
    {
        $today = Carbon::today()->toDateString();

        // 1. Pengaduan baru & belum ditugaskan
        $unassignedComplaintsCount = Complaint::where('status', 'open')
            ->whereNull('assigned_team_id')
            ->count();

        // 2. Pelanggan jatuh tempo / terisolir
        $isolatedCustomersCount = Customer::where(function ($q) {
            $q->where('status', 'suspended')
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('expires_at')
                        ->where('expires_at', '<=', Carbon::now())
                        ->where('status', '!=', 'terminated');
                });
        })->count();

        // 3. Tim siap hari ini
        $readyTeams = $this->teamReadinessService->getReadyTeams($today);
        $readyTeamsCount = count($readyTeams);

        return response()->json([
            'success' => true,
            'data' => [
                'unassigned_complaints' => [
                    'title' => 'Pengaduan Baru & Belum Ditugaskan',
                    'count' => $unassignedComplaintsCount,
                    'route' => '/complaints?filter=unassigned',
                    'available' => true,
                ],
                'isolated_customers' => [
                    'title' => 'Pelanggan Jatuh Tempo / Terisolir',
                    'count' => $isolatedCustomersCount,
                    'route' => '/customers?filter=isolated',
                    'available' => true,
                ],
                'ready_teams' => [
                    'title' => 'Tim Siap Hari Ini',
                    'count' => $readyTeamsCount,
                    'route' => '/attendance/today',
                    'available' => true,
                ],
            ],
        ]);
    }
}
