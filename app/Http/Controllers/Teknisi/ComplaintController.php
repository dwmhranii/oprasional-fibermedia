<?php

namespace App\Http\Controllers\Teknisi;

use App\Enums\ComplaintStatus;
use App\Events\ComplaintStatusUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Complaint\ComplaintReasonRequest;
use App\Http\Requests\Complaint\ComplaintResolveRequest;
use App\Http\Resources\ComplaintDetailResource;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\ComplaintLog;
use App\Models\User;
use App\Modules\Field\Services\PhaseWorkflowService;
use App\Services\ComplaintAttendanceService;
use App\Services\ComplaintEvidenceService;
use App\Services\ComplaintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ComplaintController extends Controller
{
    public function __construct(
        private ComplaintEvidenceService $evidenceService,
        private ComplaintService $complaintService,
        private ComplaintAttendanceService $attendanceService
    ) {}

    /**
     * Validasi apakah user/teknisi memiliki hak akses ke tiket (melalui tim atau perorangan).
     */
    private function canTechnicianAccess(Request $request, Complaint $complaint): bool
    {
        $user = $request->user();
        if ($user->can('complaints.manage') || $user->can('complaints.view_all')) {
            return true;
        }

        if (! empty($user->team) && $complaint->assigned_team === $user->team) {
            return true;
        }

        $assignment = $complaint->currentAssignment;
        if ($assignment) {
            if ($assignment->technician_id === $user->id) {
                return true;
            }
            if (! empty($user->team) && $assignment->assigned_team === $user->team) {
                return true;
            }
        }

        return false;
    }

    /**
     * GET /api/teknisi/complaints
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $userId = $user->id;
        $userTeam = $user->team;

        $isPrivileged = $user->can('complaints.manage') || $user->can('complaints.view_all');
        $query = Complaint::query();

        if (! $isPrivileged) {
            $query->where(function ($q) use ($userId, $userTeam) {
                if ($userTeam) {
                    $q->where('assigned_team', $userTeam);
                }
                $q->orWhereHas('currentAssignment', function ($sub) use ($userId, $userTeam) {
                    $sub->where('technician_id', $userId);
                    if ($userTeam) {
                        $sub->orWhere('assigned_team', $userTeam);
                    }
                });
            });
        } elseif ($request->filled('team') && $request->input('team') !== 'all') {
            $query->where('assigned_team', $request->input('team'));
        }

        $complaints = $query
            ->with(['currentAssignment.technician', 'attendances.technician'])
            ->filter($request->all())
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 15));

        return ComplaintResource::collection($complaints);
    }

    /**
     * GET /api/teknisi/complaints/{complaint}
     */
    public function show(Request $request, Complaint $complaint): ComplaintDetailResource
    {
        if (! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Akses ditolak: Anda tidak ditugaskan pada tiket pengaduan ini.');
        }

        $complaint->load([
            'customer',
            'currentAssignment.technician',
            'assignments.technician',
            'evidence',
            'attendances.technician',
            'logs.actor',
        ]);

        return new ComplaintDetailResource($complaint);
    }

    /**
     * POST /api/teknisi/complaints/{complaint}/start
     */
    public function start(Request $request, Complaint $complaint): JsonResponse
    {
        $assignment = $complaint->currentAssignment;

        if (! $assignment || ! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Anda tidak ditugaskan pada tiket ini.');
        }

        if (! $complaint->canTransitionTo(ComplaintStatus::IN_PROGRESS)) {
            return response()->json([
                'message' => "Tiket tidak dapat dimulai dari status '{$complaint->status->value}'.",
            ], 422);
        }

        $userId = $request->user()->id;
        $fromStatus = $complaint->status->value;

        if ($complaint->status === ComplaintStatus::PENDING_CUSTOMER) {
            $complaint->resumeSla();
        }

        $complaint->update(['status' => ComplaintStatus::IN_PROGRESS]);
        $assignment->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        ComplaintLog::create([
            'complaint_id' => $complaint->id,
            'from_status' => $fromStatus,
            'to_status' => ComplaintStatus::IN_PROGRESS->value,
            'action' => 'started',
            'actor_id' => $userId,
            'actor_role' => 'Teknisi',
            'notes' => 'Teknisi memulai pengerjaan di lapangan.',
        ]);

        event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::IN_PROGRESS->value));

        return response()->json([
            'message' => 'Pengerjaan tiket pengaduan dimulai.',
            'complaint' => new ComplaintDetailResource($complaint->fresh(['currentAssignment.technician', 'attendances.technician'])),
        ]);
    }

    /**
     * POST /api/teknisi/complaints/{complaint}/phase-1
     * Alias: POST /api/teknisi/complaints/{complaint}/resolve
     * Multipart FormData: min 1 foto bukti fisik (kamera belakang, watermarked, <2MB) + resolution_category + description
     */
    public function phase1(ComplaintResolveRequest $request, Complaint $complaint): JsonResponse
    {
        $assignment = $complaint->currentAssignment;

        if (! $assignment || ! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Anda tidak ditugaskan pada tiket ini.');
        }

        $photos = $request->file('photos');
        if (! is_array($photos)) {
            $photos = [$photos];
        }

        $evidence = $this->evidenceService->submitEvidence(
            $complaint,
            $assignment,
            $request->validated(),
            $photos,
            $request->user()
        );

        app(PhaseWorkflowService::class)->lockPhase2Requirements($complaint, $request->user());

        $freshComplaint = $complaint->fresh(['evidence', 'attendances.technician', 'currentAssignment.technician']);
        $allAttended = $freshComplaint->allTeamMembersAttended();

        $message = $allAttended
            ? 'Bukti pengerjaan berhasil dikirim dan absensi tim telah lengkap. Status tiket menjadi RESOLVED (Menunggu verifikasi Admin).'
            : 'Fase 1 (pengerjaan teknis) berhasil disubmit. Menunggu seluruh anggota tim menyelesaikan absensi selfie Fase 2.';

        return response()->json([
            'message' => $message,
            'evidence' => $evidence,
            'complaint' => new ComplaintDetailResource($freshComplaint),
        ]);
    }

    public function resolve(ComplaintResolveRequest $request, Complaint $complaint): JsonResponse
    {
        return $this->phase1($request, $complaint);
    }

    /**
     * POST /api/teknisi/complaints/{complaint}/phase-2-attendance
     * Multipart FormData: selfie_photo (kamera depan, watermarked, <2MB) + latitude + longitude + accuracy
     */
    public function phase2Attendance(Request $request, Complaint $complaint): JsonResponse
    {
        if (! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Anda tidak ditugaskan pada tiket pengaduan ini.');
        }

        $validated = $request->validate([
            'selfie_photo' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:2048',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ], [
            'selfie_photo.required' => 'Foto selfie absensi langsung dari kamera wajib diunggah.',
            'selfie_photo.max' => 'Ukuran foto selfie maksimal 2 MB.',
            'latitude.required' => 'Koordinat latitude GPS wajib disertakan.',
            'longitude.required' => 'Koordinat longitude GPS wajib disertakan.',
        ]);

        $attendance = $this->attendanceService->submitAttendance(
            $complaint,
            $request->user(),
            $validated,
            $request->file('selfie_photo')
        );

        $freshComplaint = $complaint->fresh(['evidence', 'attendances.technician', 'currentAssignment.technician']);
        $allAttended = $freshComplaint->allTeamMembersAttended();
        $isResolved = $freshComplaint->status === ComplaintStatus::RESOLVED;

        $message = $isResolved
            ? 'Absensi Anda tercatat dan seluruh tim telah lengkap! Tiket pengaduan resmi diselesaikan (RESOLVED).'
            : ($allAttended
                ? 'Absensi Anda tercatat. Seluruh personel tim telah hadir di lokasi.'
                : 'Absensi Anda berhasil dicatat. Menunggu rekan tim lainnya melakukan absensi.');

        return response()->json([
            'message' => $message,
            'attendance' => [
                'id' => $attendance->id,
                'user_id' => $attendance->user_id,
                'technician_name' => $attendance->technician?->name,
                'selfie_url' => $attendance->selfie_url,
                'latitude' => (float) $attendance->latitude,
                'longitude' => (float) $attendance->longitude,
                'accuracy' => $attendance->accuracy ? (float) $attendance->accuracy : null,
                'distance_meters' => $attendance->distance_meters ? (float) $attendance->distance_meters : null,
                'is_within_radius' => (bool) $attendance->is_within_radius,
                'clocked_at' => $attendance->clocked_at?->toIso8601String(),
            ],
            'complaint' => new ComplaintDetailResource($freshComplaint),
        ]);
    }

    /**
     * GET /api/teknisi/complaints/{complaint}/attendances
     */
    public function attendances(Request $request, Complaint $complaint): JsonResponse
    {
        if (! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Akses ditolak.');
        }

        $attendances = $complaint->attendances()->with('technician:id,name,phone')->get();
        $teamMembers = $complaint->assigned_team
            ? User::role('Teknisi')->where('team', $complaint->assigned_team)->where('status', 'active')->get(['id', 'name', 'phone'])
            : collect([]);

        return response()->json([
            'assigned_team' => $complaint->assigned_team,
            'all_team_members_attended' => $complaint->allTeamMembersAttended(),
            'team_members' => $teamMembers,
            'attendances' => $attendances->map(fn ($att) => [
                'id' => $att->id,
                'user_id' => $att->user_id,
                'technician_name' => $att->technician?->name,
                'technician_phone' => $att->technician?->phone,
                'selfie_url' => $att->selfie_url,
                'latitude' => (float) $att->latitude,
                'longitude' => (float) $att->longitude,
                'distance_meters' => $att->distance_meters ? (float) $att->distance_meters : null,
                'is_within_radius' => (bool) $att->is_within_radius,
                'clocked_at' => $att->clocked_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * PUT /api/teknisi/complaints/{complaint}/schedule-visit
     */
    public function scheduleVisit(Request $request, Complaint $complaint): JsonResponse
    {
        if (! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Anda tidak ditugaskan pada tiket ini.');
        }

        $data = $request->validate([
            'scheduled_visit_at' => 'required|date',
        ]);

        $assignment = $complaint->currentAssignment ?: $complaint->assignments()->latest('id')->firstOrFail();

        $assignment->update([
            'scheduled_visit_at' => $data['scheduled_visit_at'],
        ]);

        return response()->json([
            'message' => 'Jadwal kunjungan lapangan berhasil disimpan.',
        ]);
    }

    /**
     * PUT /api/teknisi/complaints/{complaint}/pending-customer
     */
    public function pendingCustomer(ComplaintReasonRequest $request, Complaint $complaint): JsonResponse
    {
        $assignment = $complaint->currentAssignment;

        if (! $assignment || ! $this->canTechnicianAccess($request, $complaint)) {
            abort(403, 'Anda tidak ditugaskan pada tiket ini.');
        }

        $pending = $this->complaintService->pauseForCustomer($complaint, $request->validated('reason'), $request->user());

        return response()->json([
            'message' => 'Status tiket diubah ke Menunggu Pelanggan (SLA timer dijeda).',
            'complaint' => new ComplaintDetailResource($pending),
        ]);
    }
}
