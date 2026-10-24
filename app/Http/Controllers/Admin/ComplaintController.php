<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ComplaintStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Complaint\ComplaintAssignRequest;
use App\Http\Requests\Complaint\ComplaintCreateRequest;
use App\Http\Requests\Complaint\ComplaintReasonRequest;
use App\Http\Requests\Complaint\ComplaintVerifyRequest;
use App\Http\Resources\ComplaintDetailResource;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\User;
use App\Services\ComplaintAssignmentService;
use App\Services\ComplaintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ComplaintController extends Controller
{
    public function __construct(
        private ComplaintService $complaintService,
        private ComplaintAssignmentService $assignmentService
    ) {}

    /**
     * GET /api/admin/complaints
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $complaints = Complaint::with(['createdBy', 'currentAssignment.technician'])
            ->filter($request->all())
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return ComplaintResource::collection($complaints);
    }

    /**
     * GET /api/admin/complaints/stats
     */
    public function stats(): JsonResponse
    {
        $now = now();
        $startOfDay = $now->copy()->startOfDay();

        $stats = [
            'total' => Complaint::count(),
            'open' => Complaint::where('status', ComplaintStatus::OPEN->value)->count(),
            'assigned' => Complaint::where('status', ComplaintStatus::ASSIGNED->value)->count(),
            'in_progress' => Complaint::where('status', ComplaintStatus::IN_PROGRESS->value)->count(),
            'pending_customer' => Complaint::where('status', ComplaintStatus::PENDING_CUSTOMER->value)->count(),
            'resolved' => Complaint::where('status', ComplaintStatus::RESOLVED->value)->count(),
            'resolved_today' => Complaint::where('status', ComplaintStatus::RESOLVED->value)->where('resolved_at', '>=', $startOfDay)->count(),
            'closed' => Complaint::where('status', ComplaintStatus::CLOSED->value)->count(),
            'sla_breached' => Complaint::where('is_sla_breached', true)->count(),
            'avg_resolve_hours' => round(Complaint::whereNotNull('resolved_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
                ->value('avg_hours') ?? 0, 1),
        ];

        return response()->json(['data' => $stats]);
    }

    /**
     * GET /api/admin/areas
     */
    public function areas(): JsonResponse
    {
        $hierarchy = config('regions.hierarchy', []);
        $districts = [];
        foreach ($hierarchy as $city => $kecamatans) {
            foreach (array_keys($kecamatans) as $kecamatan) {
                $districts[] = "{$kecamatan} ({$city})";
            }
        }

        return response()->json([
            'data' => $districts,
            'default_city' => config('regions.default_city', 'Kota Malang'),
        ]);
    }

    /**
     * GET /api/admin/areas/hierarchy
     * Struktur berjenjang: Kab/Kota -> Kecamatan -> Desa/Kelurahan
     */
    public function areaHierarchy(): JsonResponse
    {
        $hierarchy = config('regions.hierarchy', []);
        $cities = config('regions.cities', ['Kota Malang', 'Kabupaten Malang']);

        $result = [];
        foreach ($cities as $city) {
            $city = trim($city);
            $districtsData = [];
            if (isset($hierarchy[$city])) {
                foreach ($hierarchy[$city] as $districtName => $villages) {
                    $districtsData[] = [
                        'name' => $districtName,
                        'villages' => $villages,
                    ];
                }
            }
            $result[] = [
                'city' => $city,
                'districts' => $districtsData,
            ];
        }

        return response()->json([
            'data' => $result,
            'default_city' => config('regions.default_city', 'Kota Malang'),
            'province' => config('regions.province', 'Jawa Timur'),
        ]);
    }

    /**
     * GET /api/admin/teams/available
     */
    public function availableTeams(Request $request): JsonResponse
    {
        $teams = $this->assignmentService->getAvailableTeams($request->query('area'));

        return response()->json(['data' => $teams]);
    }

    /**
     * GET /api/admin/technicians/available
     */
    public function availableTechnicians(Request $request): JsonResponse
    {
        $area = $request->query('area');

        $technicians = User::role('Teknisi')
            ->when($area, function ($q) use ($area) {
                $q->where(function ($sub) use ($area) {
                    $sub->whereJsonContains('coverage_areas', $area)
                        ->orWhereNull('coverage_areas');
                });
            })
            ->get()
            ->map(function ($tech) {
                $activeCount = ComplaintAssignment::where('technician_id', $tech->id)
                    ->whereIn('status', ['assigned', 'in_progress'])
                    ->count();
                $max = $tech->max_active_complaints ?? 5;
                $isAvail = $tech->availability === 'active' && $activeCount < $max;

                return [
                    'id' => $tech->id,
                    'name' => $tech->name,
                    'email' => $tech->email,
                    'phone' => $tech->phone,
                    'team' => $tech->team,
                    'coverage_areas' => $tech->coverage_areas,
                    'active_complaints_count' => $activeCount,
                    'max_active_complaints' => $max,
                    'availability' => $tech->availability ?? 'active',
                    'is_available' => $isAvail,
                ];
            });

        return response()->json(['data' => $technicians]);
    }

    /**
     * GET /api/admin/complaints/check-duplicate
     */
    public function checkDuplicate(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'nullable|string',
            'customer_code' => 'nullable|string',
        ]);

        $phone = $request->query('phone');
        $code = $request->query('customer_code');

        if (! $phone && ! $code) {
            return response()->json([
                'has_duplicate' => false,
                'existing_ticket' => null,
            ]);
        }

        $activeValues = array_map(fn ($s) => $s->value, ComplaintStatus::activeStatuses());

        $existing = Complaint::where(function ($q) use ($phone, $code) {
            if ($phone) {
                $q->orWhere('customer_phone', $phone);
            }
            if ($code) {
                $q->orWhere('customer_code', $code);
            }
        })
            ->whereIn('status', $activeValues)
            ->latest('id')
            ->first();

        return response()->json([
            'has_duplicate' => (bool) $existing,
            'existing_ticket' => $existing ? new ComplaintResource($existing) : null,
        ]);
    }

    /**
     * POST /api/admin/complaints
     */
    public function store(ComplaintCreateRequest $request): JsonResponse
    {
        $complaint = $this->complaintService->create($request->validated(), $request->user());

        return (new ComplaintDetailResource($complaint->load(['customer', 'createdBy'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/admin/complaints/{complaint}
     */
    public function show(Complaint $complaint): ComplaintDetailResource
    {
        $complaint->load([
            'customer',
            'createdBy',
            'verifiedBy',
            'currentAssignment.technician',
            'assignments.technician',
            'evidence',
            'logs.actor',
            'attendances.technician',
        ]);

        return new ComplaintDetailResource($complaint);
    }

    /**
     * POST /api/admin/complaints/{complaint}/assign
     */
    public function assign(ComplaintAssignRequest $request, Complaint $complaint): JsonResponse
    {
        $user = $request->user();
        $team = $request->validated('team');
        $technicianId = $request->validated('technician_id');

        // RBAC Enforcement: Admin DILARANG memilih manual!
        if (! $user->hasRole('Superadmin') && ($team || $technicianId)) {
            return response()->json([
                'message' => 'Hak akses ditolak: Role Admin wajib menggunakan penugasan otomatis Round Robin Antar Tim.',
            ], 403);
        }

        $assignment = $user->hasRole('Superadmin')
            ? $this->assignmentService->assignAsSuperadmin($complaint, $team, $technicianId, $request->validated('notes'), $user)
            : $this->assignmentService->assignAsAdmin($complaint, $request->validated('notes'), $user);

        return response()->json([
            'message' => "Tiket berhasil ditugaskan ke {$assignment->assigned_team}.",
            'assignment' => $assignment->load('technician'),
            'complaint' => new ComplaintDetailResource($complaint->fresh(['currentAssignment.technician', 'teamMembers'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/resolve-remote
     */
    public function resolveRemote(Request $request, Complaint $complaint): JsonResponse
    {
        $data = $request->validate([
            'resolution_category' => 'required|in:cable_broken,ont_faulty,ont_reset,splitter_odp_issue,config_issue,customer_side,billing_resolved,other',
            'notes' => 'nullable|string|max:1000',
        ]);

        $resolved = $this->complaintService->resolveRemote($complaint, $data, $request->user());

        return response()->json([
            'message' => 'Pengaduan berhasil diselesaikan secara remote.',
            'complaint' => new ComplaintDetailResource($resolved->load(['verifiedBy', 'logs.actor'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/verify-close
     */
    public function verifyClose(ComplaintVerifyRequest $request, Complaint $complaint): JsonResponse
    {
        $closed = $this->complaintService->verifyAndClose($complaint, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Bukti fisik telah diverifikasi dan tiket resmi ditutup.',
            'complaint' => new ComplaintDetailResource($closed->load(['verifiedBy', 'evidence', 'logs.actor'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/return
     */
    public function returnToTechnician(ComplaintReasonRequest $request, Complaint $complaint): JsonResponse
    {
        $returned = $this->complaintService->returnToTechnician($complaint, $request->validated('reason'), $request->user());

        return response()->json([
            'message' => 'Tiket dikembalikan ke teknisi untuk perbaikan.',
            'complaint' => new ComplaintDetailResource($returned->load(['currentAssignment.technician', 'logs.actor'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/cancel
     */
    public function cancel(ComplaintReasonRequest $request, Complaint $complaint): JsonResponse
    {
        $cancelled = $this->complaintService->cancel($complaint, $request->validated('reason'), $request->user());

        return response()->json([
            'message' => 'Tiket pengaduan telah dibatalkan.',
            'complaint' => new ComplaintDetailResource($cancelled->load(['logs.actor'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/reopen
     */
    public function reopen(ComplaintReasonRequest $request, Complaint $complaint): JsonResponse
    {
        $reopened = $this->complaintService->reopen($complaint, $request->validated('reason'), $request->user());

        return response()->json([
            'message' => 'Tiket pengaduan dibuka kembali.',
            'complaint' => new ComplaintDetailResource($reopened->load(['logs.actor'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/pending-customer
     */
    public function pendingCustomer(ComplaintReasonRequest $request, Complaint $complaint): JsonResponse
    {
        $pending = $this->complaintService->pauseForCustomer($complaint, $request->validated('reason'), $request->user());

        return response()->json([
            'message' => 'Status diubah ke Menunggu Pelanggan (SLA timer dijeda).',
            'complaint' => new ComplaintDetailResource($pending->load(['logs.actor'])),
        ]);
    }

    /**
     * PUT /api/admin/complaints/{complaint}/resume
     */
    public function resumeFromPending(Request $request, Complaint $complaint): JsonResponse
    {
        $resumed = $this->complaintService->resumeFromPending($complaint, $request->user());

        return response()->json([
            'message' => 'Penanganan tiket dilanjutkan (SLA timer diteruskan).',
            'complaint' => new ComplaintDetailResource($resumed->load(['logs.actor'])),
        ]);
    }
}
