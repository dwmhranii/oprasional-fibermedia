<?php

namespace App\Services;

use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\DispatchSetting;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\RoundRobinPointer;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardService
{
    public function __construct(
        protected TeamReadinessService $teamReadinessService
    ) {}

    /**
     * Cache key helper.
     */
    public static function getCacheKey(int $userId, string $role, string $period): string
    {
        return "dashboard_summary_{$role}_{$userId}_{$period}";
    }

    /**
     * Clear all dashboard summary caches.
     */
    public static function clearCache(): void
    {
        Cache::forget('dashboard_summary_superadmin');
        // Clear common pattern or increment version
        $version = (int) Cache::get('dashboard_summary_version', 1);
        Cache::put('dashboard_summary_version', $version + 1, 86400);
    }

    /**
     * Get summary payload with caching and authorization.
     */
    public function getSummary(User $user, string $period = 'today', bool $forceRefresh = false): array
    {
        $validPeriods = ['today', '7d', '30d'];
        if (! in_array($period, $validPeriods)) {
            $period = 'today';
        }

        $version = Cache::get('dashboard_summary_version', 1);
        $cacheKey = "dashboard_summary_v{$version}_{$user->id}_{$period}";

        if ($forceRefresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, 45, function () use ($user, $period) {
            return $this->buildSummaryPayload($user, $period);
        });
    }

    /**
     * Internal builder for summary payload.
     */
    protected function buildSummaryPayload(User $user, string $period): array
    {
        $now = Carbon::now();
        [$startDate, $endDate] = $this->resolveDateRange($period, $now);

        // Effective settings
        $settings = DispatchSetting::getEffective();
        $maxOper = (int) ($settings->max_oper ?? 3);
        $acceptTimeoutMenit = (int) ($settings->accept_timeout_menit ?? 15);

        $payload = [
            'last_updated' => $now->toIso8601String(),
            'period' => $period,
            'period_label' => match ($period) {
                '7d' => '7 Hari Terakhir',
                '30d' => '30 Hari Terakhir',
                default => 'Hari Ini',
            },
        ];

        // 1. Pengaduan (Complaints)
        if ($this->hasAccess($user, ['complaints.view', 'view_complaints', 'workorders.view', 'view_work_orders'])) {
            $payload['pengaduan'] = $this->getPengaduanStats($startDate, $endDate, $maxOper);
        } else {
            $payload['pengaduan'] = null;
        }

        // 2. Pemasangan (PSB)
        if ($this->hasAccess($user, ['psb.view', 'manage_provisioning', 'submissions.view', 'view_any_submissions'])) {
            $payload['psb'] = $this->getPsbStats();
        } else {
            $payload['psb'] = null;
        }

        // 3. Pelanggan (Customers)
        if ($this->hasAccess($user, ['customers.view', 'view_customers'])) {
            $payload['pelanggan'] = $this->getPelangganStats($now);
        } else {
            $payload['pelanggan'] = null;
        }

        // 4. Tim Hari Ini
        if ($this->hasAccess($user, ['attendance.view', 'view_attendances', 'teams.manage', 'manage_teams'])) {
            $payload['tim_hari_ini'] = $this->getTimHariIniStats($now->toDateString());
        } else {
            $payload['tim_hari_ini'] = null;
        }

        // 5. Jaringan
        if ($this->hasAccess($user, ['network.view', 'view_network'])) {
            $payload['jaringan'] = $this->getJaringanStats();
        } else {
            $payload['jaringan'] = null;
        }

        // 6. Panel "Perlu Tindakan Sekarang"
        if ($this->hasAccess($user, ['dispatch.manage', 'manage_dispatch', 'workorders.view', 'view_work_orders', 'psb.view', 'manage_provisioning'])) {
            $payload['perlu_tindakan'] = $this->getPerluTindakanList($now, $maxOper, $acceptTimeoutMenit);
        } else {
            $payload['perlu_tindakan'] = [];
        }

        // 7. Panel "Absensi Hari Ini"
        if ($this->hasAccess($user, ['attendance.view', 'view_attendances'])) {
            $payload['absensi_hari_ini'] = $this->getAbsensiHariIni($now->toDateString());
        } else {
            $payload['absensi_hari_ini'] = null;
        }

        // 8. Tren (2 charts)
        if ($this->hasAccess($user, ['analytics.view', 'view_analytics', 'complaints.view', 'view_complaints'])) {
            $payload['tren'] = $this->getTrenStats($startDate, $endDate, $period);
        } else {
            $payload['tren'] = null;
        }

        return $payload;
    }

    /**
     * Resolve date range based on period.
     */
    protected function resolveDateRange(string $period, Carbon $now): array
    {
        return match ($period) {
            '7d' => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
            '30d' => [$now->copy()->subDays(29)->startOfDay(), $now->copy()->endOfDay()],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
        };
    }

    /**
     * Permission checking helper.
     */
    protected function hasAccess(User $user, array $permissions): bool
    {
        foreach ($permissions as $perm) {
            try {
                if ($user->can($perm)) {
                    return true;
                }
            } catch (\Throwable) {
                // If permission table isn't seeded or check fails, fall back safely
            }
        }

        return false;
    }

    /**
     * 1. Pengaduan: 1 aggregated query.
     */
    protected function getPengaduanStats(Carbon $startDate, Carbon $endDate, int $maxOper): array
    {
        $raw = Complaint::selectRaw("
            SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as baru,
            SUM(CASE WHEN status = 'unassigned' OR (assigned_team_id IS NULL AND status IN ('open', 'unassigned')) THEN 1 ELSE 0 END) as belum_ditugaskan,
            SUM(CASE WHEN status = 'escalated_to_admin' OR (reassign_count >= ? AND status NOT IN ('resolved', 'closed', 'cancelled')) THEN 1 ELSE 0 END) as diteruskan_ke_admin,
            SUM(CASE WHEN status = 'phase_1_completed' OR review_status = 'pending' THEN 1 ELSE 0 END) as perlu_ditinjau
        ", [$startDate, $endDate, $maxOper])->first();

        return [
            'baru' => (int) ($raw->baru ?? 0),
            'belum_ditugaskan' => (int) ($raw->belum_ditugaskan ?? 0),
            'diteruskan_ke_admin' => (int) ($raw->diteruskan_ke_admin ?? 0),
            'perlu_ditinjau' => (int) ($raw->perlu_ditinjau ?? 0),
        ];
    }

    /**
     * 2. Pemasangan (PSB): 1 query for submissions + 1 query for tasks.
     */
    protected function getPsbStats(): array
    {
        $menungguValidasi = Submission::whereIn('status', ['pending', 'pending_validation'])->count();

        $taskRaw = Task::selectRaw("
                SUM(CASE WHEN status = 'unassigned' OR (assigned_team_id IS NULL AND status IN ('pending', 'unassigned')) THEN 1 ELSE 0 END) as belum_ditugaskan,
                SUM(CASE WHEN status IN ('in_progress', 'on_the_way') THEN 1 ELSE 0 END) as sedang_dikerjakan,
                SUM(CASE WHEN status = 'phase_1_submitted' THEN 1 ELSE 0 END) as perlu_ditinjau
            ")->first();

        return [
            'menunggu_validasi' => (int) $menungguValidasi,
            'belum_ditugaskan' => (int) ($taskRaw->belum_ditugaskan ?? 0),
            'sedang_dikerjakan' => (int) ($taskRaw->sedang_dikerjakan ?? 0),
            'perlu_ditinjau' => (int) ($taskRaw->perlu_ditinjau ?? 0),
        ];
    }

    /**
     * 3. Pelanggan: 1 aggregated query.
     */
    protected function getPelangganStats(Carbon $now): array
    {
        $next7Days = $now->copy()->addDays(7)->endOfDay()->toDateString();
        $todayStr = $now->toDateString();

        $raw = Customer::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as aktif,
            SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as terisolir,
            SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as berhenti,
            SUM(CASE WHEN expires_at IS NOT NULL AND expires_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as jatuh_tempo_7_hari,
            SUM(CASE WHEN debt > 0 THEN 1 ELSE 0 END) as hutang_lebih_dari_0
        ", [$todayStr, $next7Days])->first();

        return [
            'total' => (int) ($raw->total ?? 0),
            'aktif' => (int) ($raw->aktif ?? 0),
            'terisolir' => (int) ($raw->terisolir ?? 0),
            'berhenti' => (int) ($raw->berhenti ?? 0),
            'jatuh_tempo_7_hari' => (int) ($raw->jatuh_tempo_7_hari ?? 0),
            'hutang_lebih_dari_0' => (int) ($raw->hutang_lebih_dari_0 ?? 0),
        ];
    }

    protected ?array $memoizedReadiness = null;

    /**
     * Compute team readiness in bulk without N+1 queries.
     */
    protected function getTeamsReadinessData(string $date): array
    {
        if ($this->memoizedReadiness !== null && ($this->memoizedReadiness['_date'] ?? null) === $date) {
            return $this->memoizedReadiness;
        }

        $allActiveTeams = Team::where('is_active', true)->orderBy('order_index')->get();
        $minMembers = $this->teamReadinessService->getMinMembersPresent();

        $activeTeamMembers = DB::table('team_members')
            ->whereNull('left_at')
            ->get(['team_id', 'user_id']);

        $teamMemberUserIds = $activeTeamMembers->pluck('user_id')->unique()->toArray();

        $presentUserMap = DailyAttendance::whereIn('user_id', $teamMemberUserIds)
            ->whereDate('work_date', $date)
            ->where('status', 'hadir')
            ->whereNotNull('check_in_at')
            ->whereNull('check_out_at')
            ->pluck('user_id')
            ->flip()
            ->toArray();

        $teamMembersGrouped = $activeTeamMembers->groupBy('team_id');

        $readyTeams = [];
        $unreadyTeams = [];
        $readyTeamMap = [];

        foreach ($allActiveTeams as $team) {
            $members = $teamMembersGrouped->get($team->id, collect());
            $presentCount = 0;
            foreach ($members as $m) {
                if (isset($presentUserMap[$m->user_id])) {
                    $presentCount++;
                }
            }

            $isReady = $presentCount >= $minMembers;
            if ($isReady) {
                $readyTeams[] = $team;
                $readyTeamMap[$team->id] = $team;
            } else {
                $unreadyTeams[] = [
                    'id' => $team->id,
                    'name' => $team->name,
                    'present_count' => $presentCount,
                    'min_required' => $minMembers,
                    'reason' => "{$presentCount} dari minimal {$minMembers} anggota hadir",
                ];
            }
        }

        $readiness = [
            '_date' => $date,
            'all_teams' => $allActiveTeams,
            'ready_teams' => $readyTeams,
            'unready_teams' => $unreadyTeams,
            'ready_team_map' => $readyTeamMap,
            'total_active_members' => count($teamMemberUserIds),
            'present_members_count' => count($presentUserMap),
        ];

        return $this->memoizedReadiness = $readiness;
    }

    /**
     * 4. Tim Hari Ini.
     */
    protected function getTimHariIniStats(string $date): array
    {
        $readiness = $this->getTeamsReadinessData($date);

        // Round robin next queue (load pointers in single query)
        $pointers = RoundRobinPointer::whereIn('queue_type', ['psb', 'complaint'])->get()->keyBy('queue_type');

        $giliranPsb = $this->calculateNextQueueTeam('psb', $readiness['all_teams'], $readiness['ready_team_map'], $pointers->get('psb'));
        $giliranPengaduan = $this->calculateNextQueueTeam('complaint', $readiness['all_teams'], $readiness['ready_team_map'], $pointers->get('complaint'));

        return [
            'tim_siap' => count($readiness['ready_teams']),
            'total_tim_aktif' => $readiness['all_teams']->count(),
            'anggota_hadir' => $readiness['present_members_count'],
            'total_anggota' => $readiness['total_active_members'],
            'giliran_psb' => $giliranPsb,
            'giliran_pengaduan' => $giliranPengaduan,
        ];
    }

    /**
     * Round Robin helper for next queue team.
     */
    protected function calculateNextQueueTeam(string $queueType, $allTeams, array $readyTeamMap, ?RoundRobinPointer $pointer = null): string
    {
        if (empty($readyTeamMap) || $allTeams->isEmpty()) {
            return 'Belum tersedia';
        }

        $pointer = $pointer ?? RoundRobinPointer::where('queue_type', $queueType)->first();
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

        return 'Belum tersedia';
    }

    /**
     * 5. Jaringan: OLT (MENUNGGU FASE X), ODC, ODP, CableTrack.
     */
    protected function getJaringanStats(): array
    {
        // OLT: check if table exists
        $oltBermasalah = 0;
        $oltStatusTag = 'MENUNGGU FASE X';
        if (Schema::hasTable('olts')) {
            $oltBermasalah = (int) DB::table('olts')
                ->whereIn('status', ['disrupted', 'cut'])
                ->count();
            $oltStatusTag = 'AKTIF';
        }

        // ODC bermasalah
        $odcBermasalah = (int) Odc::whereIn('operational_status', ['disrupted', 'cut'])->count();

        // ODP bermasalah
        $odpBermasalah = (int) Odp::whereIn('operational_status', ['disrupted', 'cut'])->count();

        // Kabel bermasalah
        $kabelBermasalah = (int) CableTrack::whereIn('operational_status', ['disrupted', 'cut'])->count();

        // Perubahan lapangan menunggu persetujuan (relokasi ODP / unapproved)
        $perubahanMenunggu = (int) Odp::where(function ($q) {
            $q->where('is_approved', false)
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('proposed_latitude')
                        ->whereNotNull('proposed_longitude')
                        ->whereColumn('proposed_latitude', '!=', 'latitude');
                });
        })->count();

        // Jalur kabel belum digambar
        $jalurKabelBelumDigambar = (int) CableTrack::where(function ($q) {
            $q->whereNull('coordinates')
                ->orWhere('coordinates', '[]')
                ->orWhere('simplified_points_count', '<', 2);
        })->count();

        // Gangguan Massal Aktif (Fase N1)
        $activeIncidents = 0;
        $affectedCustomersCount = 0;
        if (Schema::hasTable('incidents')) {
            $activeIncidents = (int) DB::table('incidents')->where('status', 'open')->count();
            if (Schema::hasTable('incident_customers')) {
                $affectedCustomersCount = (int) DB::table('incident_customers')
                    ->join('incidents', 'incident_customers.incident_id', '=', 'incidents.id')
                    ->where('incidents.status', 'open')
                    ->where('incident_customers.state', 'affected')
                    ->count();
            }
        }

        return [
            'olt_bermasalah' => $oltBermasalah,
            'olt_status_tag' => $oltStatusTag,
            'odc_bermasalah' => $odcBermasalah,
            'odp_bermasalah' => $odpBermasalah,
            'kabel_bermasalah' => $kabelBermasalah,
            'perubahan_menunggu_persetujuan' => $perubahanMenunggu,
            'jalur_kabel_belum_digambar' => $jalurKabelBelumDigambar,
            'gangguan_massal_aktif' => [
                'total_insiden' => $activeIncidents,
                'total_pelanggan_terdampak' => $affectedCustomersCount,
            ],
        ];
    }

    /**
     * 6. Panel "Perlu Tindakan Sekarang" (Top 10 teratas).
     */
    protected function getPerluTindakanList(Carbon $now, int $maxOper, int $acceptTimeoutMenit): array
    {
        $items = [];
        $overdueThreshold = $now->copy()->subMinutes($acceptTimeoutMenit);

        // a. Tiket Diteruskan ke Admin (Critical)
        $escalatedComplaints = Complaint::where(function ($q) use ($maxOper) {
            $q->where('status', 'escalated_to_admin')
                ->orWhere(fn ($sub) => $sub->where('reassign_count', '>=', $maxOper)->whereNotIn('status', ['resolved', 'closed', 'cancelled']));
        })->latest('updated_at')->take(5)->get();

        foreach ($escalatedComplaints as $c) {
            $items[] = [
                'id' => "complaint-{$c->id}",
                'entity_type' => 'complaint',
                'raw_id' => $c->id,
                'title' => "Pengaduan #{$c->ticket_number} - {$c->customer_name}",
                'type_label' => 'Diteruskan ke Admin',
                'urgency' => 'critical',
                'urgent_reason' => "Batas oper terlewati ({$c->reassign_count}x)",
                'created_at' => $c->created_at?->toIso8601String(),
                'action_url' => "/admin/complaints/{$c->id}",
                'action_label' => 'Tugaskan Manual',
            ];
        }

        // b. Tiket Belum Ditugaskan > 15 Menit (Critical)
        $unassignedComplaints = Complaint::where(function ($q) {
            $q->where('status', 'unassigned')
                ->orWhere(fn ($sub) => $sub->whereNull('assigned_team_id')->whereIn('status', ['open', 'unassigned']));
        })
            ->where(function ($q) use ($overdueThreshold) {
                $q->where('unassigned_since', '<=', $overdueThreshold)
                    ->orWhere(fn ($sub) => $sub->whereNull('unassigned_since')->where('created_at', '<=', $overdueThreshold));
            })
            ->latest('created_at')
            ->take(5)
            ->get();

        foreach ($unassignedComplaints as $c) {
            $minutes = max(15, (int) ($c->created_at ? $c->created_at->diffInMinutes($now) : 15));
            $items[] = [
                'id' => "complaint-unassigned-{$c->id}",
                'entity_type' => 'complaint',
                'raw_id' => $c->id,
                'title' => "Pengaduan #{$c->ticket_number} - {$c->customer_name}",
                'type_label' => 'Belum Ditugaskan (>15m)',
                'urgency' => 'critical',
                'urgent_reason' => "Menunggu antrean ({$minutes} menit)",
                'created_at' => $c->created_at?->toIso8601String(),
                'action_url' => "/admin/dispatch",
                'action_label' => 'Tugaskan Cepat',
            ];
        }

        // c. Konflik Port ODP (Critical)
        $portConflictTasks = Task::where('has_port_conflict', true)
            ->whereNotIn('status', ['completed', 'failed'])
            ->latest('updated_at')
            ->take(3)
            ->get();

        foreach ($portConflictTasks as $t) {
            $items[] = [
                'id' => "task-conflict-{$t->id}",
                'entity_type' => 'task',
                'raw_id' => $t->id,
                'title' => "Pemasangan #{$t->task_number} - Konflik Port ODP",
                'type_label' => 'Konflik Port ODP',
                'urgency' => 'critical',
                'urgent_reason' => 'Port telah digunakan instalasi lain',
                'created_at' => $t->created_at?->toIso8601String(),
                'action_url' => "/admin/tasks/{$t->id}",
                'action_label' => 'Selesaikan Konflik',
            ];
        }

        // d. Tiket Perlu Ditinjau (High)
        $reviewComplaints = Complaint::where(function ($q) {
            $q->where('status', 'phase_1_completed')
                ->orWhere('review_status', 'pending');
        })->latest('phase_1_completed_at')->take(4)->get();

        foreach ($reviewComplaints as $c) {
            $items[] = [
                'id' => "complaint-review-{$c->id}",
                'entity_type' => 'complaint',
                'raw_id' => $c->id,
                'title' => "Pengaduan #{$c->ticket_number} - {$c->customer_name}",
                'type_label' => 'Perlu Ditinjau',
                'urgency' => 'high',
                'urgent_reason' => 'Bukti fase pekerjaan siap diperiksa',
                'created_at' => $c->phase_1_completed_at?->toIso8601String() ?? $c->updated_at?->toIso8601String(),
                'action_url' => "/admin/evidence-review",
                'action_label' => 'Tinjau Bukti',
            ];
        }

        // e. Pengajuan Menunggu Validasi (High)
        $pendingSubmissions = Submission::whereIn('status', ['pending', 'pending_validation'])
            ->latest('created_at')
            ->take(4)
            ->get();

        foreach ($pendingSubmissions as $s) {
            $items[] = [
                'id' => "submission-{$s->id}",
                'entity_type' => 'submission',
                'raw_id' => $s->id,
                'title' => "Pengajuan PSB: {$s->customer_name}",
                'type_label' => 'Menunggu Validasi',
                'urgency' => 'high',
                'urgent_reason' => 'Berkas pendaftaran sales baru',
                'created_at' => $s->created_at?->toIso8601String(),
                'action_url' => "/admin/submissions/{$s->id}",
                'action_label' => 'Validasi Sekarang',
            ];
        }

        // f. Perubahan Jaringan Menunggu Persetujuan (Medium)
        $pendingOdps = Odp::where(function ($q) {
            $q->where('is_approved', false)
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('proposed_latitude')
                        ->whereNotNull('proposed_longitude')
                        ->whereColumn('proposed_latitude', '!=', 'latitude');
                });
        })->latest('updated_at')->take(3)->get();

        foreach ($pendingOdps as $odp) {
            $odpCode = $odp->code ?? $odp->odp_code ?? ('ODP-'.$odp->id);
            $items[] = [
                'id' => "odp-approval-{$odp->id}",
                'entity_type' => 'odp',
                'raw_id' => $odp->id,
                'title' => "ODP {$odp->name} ({$odpCode})",
                'type_label' => 'Perubahan Jaringan',
                'urgency' => 'medium',
                'urgent_reason' => 'Perubahan koordinat lapangan menunggu verifikasi',
                'created_at' => $odp->updated_at?->toIso8601String(),
                'action_url' => "/admin/network/odps",
                'action_label' => 'Tinjau Lapangan',
            ];
        }

        // Urgency rank: critical (1) > high (2) > medium (3)
        $urgencyWeight = ['critical' => 1, 'high' => 2, 'medium' => 3];
        usort($items, function ($a, $b) use ($urgencyWeight) {
            $wA = $urgencyWeight[$a['urgency']] ?? 9;
            $wB = $urgencyWeight[$b['urgency']] ?? 9;
            if ($wA !== $wB) {
                return $wA <=> $wB;
            }

            return ($b['created_at'] ?? '') <=> ($a['created_at'] ?? '');
        });

        return array_slice($items, 0, 10);
    }

    /**
     * 7. Panel "Absensi Hari Ini".
     */
    protected function getAbsensiHariIni(string $date): array
    {
        // Ambil semua anggota tim aktif
        $activeMembers = DB::table('team_members')
            ->join('users', 'team_members.user_id', '=', 'users.id')
            ->join('teams', 'team_members.team_id', '=', 'teams.id')
            ->whereNull('team_members.left_at')
            ->where('teams.is_active', true)
            ->select('users.id as user_id', 'users.name as user_name', 'teams.id as team_id', 'teams.name as team_name')
            ->get();

        $attendances = DailyAttendance::with(['office'])
            ->whereDate('work_date', $date)
            ->get()
            ->keyBy('user_id');

        $belumAbsenMasuk = [];
        $luarRadius = [];

        foreach ($activeMembers as $m) {
            $att = $attendances->get($m->user_id);
            if (! $att || ! $att->check_in_at || $att->status !== 'hadir') {
                $belumAbsenMasuk[] = [
                    'id' => $m->user_id,
                    'name' => $m->user_name,
                    'team' => $m->team_name,
                    'status' => $att?->status ?? 'belum_absen',
                ];
            } else {
                $allowedRadius = $att->office ? max(50, $att->office->radius_meters ?: 50) : 50;
                if ($att->office_distance_meters !== null && $att->office_distance_meters > $allowedRadius) {
                    $luarRadius[] = [
                        'id' => $m->user_id,
                        'name' => $m->user_name,
                        'team' => $m->team_name,
                        'distance_meters' => (int) $att->office_distance_meters,
                        'allowed_radius' => $allowedRadius,
                        'check_in_at' => $att->check_in_at?->format('H:i'),
                    ];
                }
            }
        }

        // Tim belum siap
        $readiness = $this->getTeamsReadinessData($date);
        $timBelumSiap = $readiness['unready_teams'];

        return [
            'belum_absen_masuk' => $belumAbsenMasuk,
            'luar_radius' => $luarRadius,
            'tim_belum_siap' => $timBelumSiap,
        ];
    }

    /**
     * 8. Tren: (a) Pengaduan Masuk vs Selesai; (b) Durasi vs Target SLA.
     */
    protected function getTrenStats(Carbon $startDate, Carbon $endDate, string $period): array
    {
        $targetSlaHours = (float) (config('sla.hours.high') ?? 4.0);

        // Agregasi harian masuk
        $masukPerHari = Complaint::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date')
            ->toArray();

        $driver = DB::connection()->getDriverName();
        $diffMinutesExpr = match ($driver) {
            'sqlite' => "((strftime('%s', resolved_at) - strftime('%s', created_at)) / 60)",
            'pgsql' => "(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)",
            default => 'TIMESTAMPDIFF(MINUTE, created_at, resolved_at)',
        };

        // Agregasi harian selesai & rata-rata durasi jam
        $selesaiPerHari = Complaint::whereBetween('resolved_at', [$startDate, $endDate])
            ->selectRaw("DATE(resolved_at) as date, COUNT(*) as count, AVG({$diffMinutesExpr}) as avg_minutes")
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        // Bentuk deret tanggal
        $pengaduanHarian = [];
        $durasiSla = [];

        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $dateStr = $current->toDateString();
            $label = $current->isoFormat('D MMM');

            $countMasuk = (int) ($masukPerHari[$dateStr] ?? 0);
            $selesaiRecord = $selesaiPerHari->get($dateStr);
            $countSelesai = (int) ($selesaiRecord->count ?? 0);
            $avgHours = $selesaiRecord && $selesaiRecord->avg_minutes !== null
                ? round($selesaiRecord->avg_minutes / 60, 1)
                : null;

            $pengaduanHarian[] = [
                'tanggal' => $label,
                'raw_date' => $dateStr,
                'masuk' => $countMasuk,
                'selesai' => $countSelesai,
            ];

            $durasiSla[] = [
                'tanggal' => $label,
                'raw_date' => $dateStr,
                'rata_rata_jam' => $avgHours,
                'target_sla_jam' => $targetSlaHours,
            ];

            $current->addDay();
        }

        return [
            'target_sla_hours' => $targetSlaHours,
            'pengaduan_harian' => $pengaduanHarian,
            'durasi_sla' => $durasiSla,
        ];
    }
}
