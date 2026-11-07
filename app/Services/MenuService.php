<?php

namespace App\Services;

use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Odp;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class MenuService
{
    protected TeamReadinessService $teamReadinessService;

    /**
     * Pemetaan izin baru ke izin lama (fallback/kompatibilitas).
     */
    protected array $permissionAliases = [
        'dashboard.view' => ['dashboard.view', 'view_dashboard'],
        'customers.view' => ['customers.view', 'manage_customers'],
        'submissions.view' => ['submissions.view', 'view_any_submissions'],
        'complaints.view' => ['complaints.view', 'complaints.view_own', 'manage_complaints'],
        'psb.view' => ['psb.view', 'manage_provisioning'],
        'workorders.view' => ['workorders.view', 'view_work_orders'],
        'network.view' => ['network.view', 'manage_network', 'view_network'],
        'network.approve' => ['network.approve', 'manage_network'],
        'network.manage' => ['network.manage', 'manage_network'],
        'attendance.view' => ['attendance.view', 'view_attendances'],
        'teams.view' => ['teams.view', 'manage_teams'],
        'devices.view' => ['devices.view', 'manage_devices'],
        'kpi.view' => ['kpi.view', 'view_kpi'],
        'kpi.manage' => ['kpi.manage', 'manage_kpi_settings'],
        'catalog.view' => ['catalog.view', 'manage_packages'],
        'reports.view' => ['reports.view', 'view_sales_reports'],
        'settings.manage' => ['settings.manage', 'manage_dispatch_settings', 'manage_office_locations'],
        'users.view' => ['users.view', 'manage_users'],
        'audit.view' => ['audit.view', 'view_audit_logs'],
    ];

    public function __construct(TeamReadinessService $teamReadinessService)
    {
        $this->teamReadinessService = $teamReadinessService;
    }

    /**
     * Dapatkan pohon menu yang difilter sesuai izin pengguna.
     * Superadmin melihat semua menu dan seluruh tab yang modulnya ada.
     */
    public function getMenuTree(User $user): array
    {
        $isSuperadmin = (bool) ($user->hasRole('Superadmin') || $user->hasRole('superadmin'));
        $moduleDirs = glob(app_path('Modules/*'), GLOB_ONLYDIR);
        $rawItems = [];

        foreach ($moduleDirs as $dir) {
            $menuFile = $dir.DIRECTORY_SEPARATOR.'menu.php';
            if (file_exists($menuFile)) {
                $items = require $menuFile;
                if (is_array($items)) {
                    foreach ($items as $item) {
                        $isAvailable = $item['is_available'] ?? true;
                        if (! $isSuperadmin && ! $isAvailable) {
                            continue;
                        }

                        // Filter tabs
                        $allowedTabs = [];
                        if (! empty($item['tabs']) && is_array($item['tabs'])) {
                            foreach ($item['tabs'] as $tab) {
                                $tabAvailable = $tab['is_available'] ?? true;
                                if (! $isSuperadmin && ! $tabAvailable) {
                                    continue;
                                }
                                $tabPerm = $tab['permission'] ?? null;
                                if ($isSuperadmin || empty($tabPerm) || $this->hasPermissionSafely($user, $tabPerm, $isSuperadmin)) {
                                    $allowedTabs[] = [
                                        'key' => $tab['key'] ?? strtolower($tab['title']),
                                        'title' => $tab['title'],
                                        'route' => $tab['route'],
                                        'permission' => $tabPerm,
                                        'badge_key' => $tab['badge_key'] ?? null,
                                        'is_available' => $tabAvailable,
                                        'available_from_phase' => $tab['available_from_phase'] ?? null,
                                    ];
                                }
                            }
                        }

                        // Filter actions
                        $allowedActions = [];
                        if (! empty($item['actions']) && is_array($item['actions'])) {
                            foreach ($item['actions'] as $act) {
                                $actPerm = $act['permission'] ?? null;
                                if ($isSuperadmin || empty($actPerm) || $this->hasPermissionSafely($user, $actPerm, $isSuperadmin)) {
                                    $allowedActions[] = [
                                        'key' => $act['key'],
                                        'title' => $act['title'],
                                        'permission' => $actPerm,
                                        'action' => $act['action'] ?? null,
                                    ];
                                }
                            }
                        }

                        $permission = $item['permission'] ?? null;
                        $hasMenuPermission = $this->hasPermissionSafely($user, $permission ?? '', $isSuperadmin);
                        $hasAnyTabAllowed = ! empty($allowedTabs);

                        // Menu tampil bila pengguna boleh melihat menu atau minimal satu tabnya
                        if ($hasMenuPermission || $hasAnyTabAllowed) {
                            $itemCopy = $item;
                            $itemCopy['tabs'] = $allowedTabs;
                            $itemCopy['actions'] = $allowedActions;

                            // Jika menu punya tab, rute awal mengarah ke tab pertama yang boleh dibuka
                            if (! empty($allowedTabs) && ! empty($allowedTabs[0]['route'])) {
                                $itemCopy['route'] = $allowedTabs[0]['route'];
                            }

                            $rawItems[] = $itemCopy;
                        }
                    }
                }
            }
        }

        // Kelompokkan per grup
        $grouped = [];
        foreach ($rawItems as $item) {
            $groupName = $item['group'] ?? '';
            $groupOrder = $item['group_order'] ?? 99;

            if (! isset($grouped[$groupName])) {
                $grouped[$groupName] = [
                    'group' => $groupName,
                    'group_order' => $groupOrder,
                    'items' => [],
                ];
            }

            $grouped[$groupName]['items'][] = [
                'title' => $item['title'],
                'icon' => $item['icon'] ?? 'Circle',
                'route' => $item['route'],
                'permission' => $item['permission'] ?? null,
                'order' => $item['order'] ?? 99,
                'badge_key' => $item['badge_key'] ?? null,
                'is_available' => $item['is_available'] ?? true,
                'available_from_phase' => $item['available_from_phase'] ?? null,
                'tabs' => $item['tabs'] ?? [],
                'actions' => $item['actions'] ?? [],
            ];
        }

        // Urutkan item di dalam grup
        foreach ($grouped as &$group) {
            usort($group['items'], fn ($a, $b) => $a['order'] <=> $b['order']);
        }
        unset($group);

        // Urutkan grup berdasarkan group_order
        usort($grouped, fn ($a, $b) => $a['group_order'] <=> $b['group_order']);

        return array_values($grouped);
    }

    /**
     * Dapatkan simulasi pohon menu berdasarkan himpunan izin (untuk UI Pratinjau Hak Akses).
     */
    public function getPreviewTree(array $permissions, bool $isSuperadmin = false): array
    {
        $permSet = array_flip($permissions);
        $moduleDirs = glob(app_path('Modules/*'), GLOB_ONLYDIR);
        $rawItems = [];

        foreach ($moduleDirs as $dir) {
            $menuFile = $dir.DIRECTORY_SEPARATOR.'menu.php';
            if (file_exists($menuFile)) {
                $items = require $menuFile;
                if (is_array($items)) {
                    foreach ($items as $item) {
                        $isAvailable = $item['is_available'] ?? true;
                        if (! $isSuperadmin && ! $isAvailable) {
                            continue;
                        }

                        $allowedTabs = [];
                        if (! empty($item['tabs']) && is_array($item['tabs'])) {
                            foreach ($item['tabs'] as $tab) {
                                $tabAvailable = $tab['is_available'] ?? true;
                                if (! $isSuperadmin && ! $tabAvailable) {
                                    continue;
                                }
                                $tabPerm = $tab['permission'] ?? null;
                                $hasTabPerm = $isSuperadmin || empty($tabPerm) || isset($permSet[$tabPerm]);
                                if (! $hasTabPerm && $tabPerm && isset($this->permissionAliases[$tabPerm])) {
                                    foreach ($this->permissionAliases[$tabPerm] as $alias) {
                                        if (isset($permSet[$alias])) {
                                            $hasTabPerm = true;
                                            break;
                                        }
                                    }
                                }
                                if ($hasTabPerm) {
                                    $allowedTabs[] = [
                                        'key' => $tab['key'] ?? strtolower($tab['title']),
                                        'title' => $tab['title'],
                                        'route' => $tab['route'],
                                        'permission' => $tabPerm,
                                        'badge_key' => $tab['badge_key'] ?? null,
                                        'is_available' => $tabAvailable,
                                        'available_from_phase' => $tab['available_from_phase'] ?? null,
                                    ];
                                }
                            }
                        }

                        $allowedActions = [];
                        if (! empty($item['actions']) && is_array($item['actions'])) {
                            foreach ($item['actions'] as $act) {
                                $actPerm = $act['permission'] ?? null;
                                $hasActPerm = $isSuperadmin || empty($actPerm) || isset($permSet[$actPerm]);
                                if (! $hasActPerm && $actPerm && isset($this->permissionAliases[$actPerm])) {
                                    foreach ($this->permissionAliases[$actPerm] as $alias) {
                                        if (isset($permSet[$alias])) {
                                            $hasActPerm = true;
                                            break;
                                        }
                                    }
                                }
                                if ($hasActPerm) {
                                    $allowedActions[] = [
                                        'key' => $act['key'],
                                        'title' => $act['title'],
                                        'permission' => $actPerm,
                                        'action' => $act['action'] ?? null,
                                    ];
                                }
                            }
                        }

                        $permission = $item['permission'] ?? null;
                        $hasPerm = $isSuperadmin || empty($permission) || isset($permSet[$permission]);

                        if (! $hasPerm && $permission && isset($this->permissionAliases[$permission])) {
                            foreach ($this->permissionAliases[$permission] as $alias) {
                                if (isset($permSet[$alias])) {
                                    $hasPerm = true;
                                    break;
                                }
                            }
                        }

                        if ($hasPerm || ! empty($allowedTabs)) {
                            $itemCopy = $item;
                            $itemCopy['tabs'] = $allowedTabs;
                            $itemCopy['actions'] = $allowedActions;
                            if (! empty($allowedTabs) && ! empty($allowedTabs[0]['route'])) {
                                $itemCopy['route'] = $allowedTabs[0]['route'];
                            }
                            $rawItems[] = $itemCopy;
                        }
                    }
                }
            }
        }

        $grouped = [];
        foreach ($rawItems as $item) {
            $groupName = $item['group'] ?? '';
            $groupOrder = $item['group_order'] ?? 99;

            if (! isset($grouped[$groupName])) {
                $grouped[$groupName] = [
                    'group' => $groupName,
                    'group_order' => $groupOrder,
                    'items' => [],
                ];
            }

            $grouped[$groupName]['items'][] = [
                'title' => $item['title'],
                'icon' => $item['icon'] ?? 'Circle',
                'route' => $item['route'],
                'permission' => $item['permission'] ?? null,
                'order' => $item['order'] ?? 99,
                'badge_key' => $item['badge_key'] ?? null,
                'is_available' => $item['is_available'] ?? true,
                'available_from_phase' => $item['available_from_phase'] ?? null,
                'tabs' => $item['tabs'] ?? [],
                'actions' => $item['actions'] ?? [],
            ];
        }

        foreach ($grouped as &$group) {
            usort($group['items'], fn ($a, $b) => $a['order'] <=> $b['order']);
        }
        unset($group);

        usort($grouped, fn ($a, $b) => $a['group_order'] <=> $b['group_order']);

        return array_values($grouped);
    }

    /**
     * Helper untuk memeriksa izin dengan aman tanpa melempar exception jika permission belum dibuat di DB.
     */
    public function hasPermissionSafely(User $user, string $permission, bool $isSuperadmin): bool
    {
        if ($isSuperadmin || empty($permission)) {
            return true;
        }

        $checkList = $this->permissionAliases[$permission] ?? [$permission];

        foreach ($checkList as $perm) {
            try {
                if ($user->hasPermissionTo($perm) || $user->can($perm)) {
                    return true;
                }
            } catch (\Throwable) {
                // Lanjut cek alias berikutnya
            }
        }

        return false;
    }

    /**
     * Dapatkan angka badge yang di-cache 30 detik.
     * Tidak membocorkan angka jika pengguna tidak memiliki izin.
     */
    public function getBadges(User $user): array
    {
        $cacheKey = 'menu_badges_user_'.$user->id;

        return Cache::remember($cacheKey, 30, function () use ($user) {
            $isSuperadmin = $user->hasRole('Superadmin') || $user->hasRole('superadmin');
            $badges = [];

            // 1. pengajuan = menunggu validasi (Izin: submissions.view)
            if ($this->hasPermissionSafely($user, 'submissions.view', $isSuperadmin)) {
                $pendingSubmissions = Submission::whereIn('status', ['pending', 'pending_validation'])->count();
                $badges['pending_submissions'] = $pendingSubmissions;
            }

            // 2. pengaduan butuh tindakan = belum ditugaskan + diteruskan ke admin + perlu ditinjau (Izin: complaints.view)
            if ($this->hasPermissionSafely($user, 'complaints.view', $isSuperadmin)) {
                $complaintsCount = Complaint::where(function ($q) {
                    $q->whereIn('status', ['unassigned', 'escalated_to_admin', 'phase_1_completed'])
                        ->orWhere(fn ($sub) => $sub->where('status', 'open')->whereNull('assigned_team_id'));
                })->count();
                $badges['complaints_action_needed'] = $complaintsCount;
                // Kompatibilitas mundur
                $badges['open_complaints'] = $complaintsCount;
            }

            // 3. PSB butuh tindakan = belum ditugaskan + diteruskan ke admin + perlu ditinjau (Izin: psb.view)
            if ($this->hasPermissionSafely($user, 'psb.view', $isSuperadmin)) {
                $psbCount = Task::where(function ($q) {
                    $q->whereIn('status', ['unassigned', 'escalated_to_admin', 'phase_1_submitted'])
                        ->orWhere(fn ($sub) => $sub->where('status', 'pending')->whereNull('assigned_team_id'));
                })->count();
                $badges['psb_action_needed'] = $psbCount;
                // Kompatibilitas mundur
                $badges['pending_provisionings'] = $psbCount;
            }

            // 4. Work Order = perlu ditinjau (Izin: workorders.view)
            if ($this->hasPermissionSafely($user, 'workorders.view', $isSuperadmin)) {
                $taskReviewCount = Task::where(function ($q) {
                    $q->where('status', 'phase_1_submitted')
                        ->orWhere('review_status', 'needs_review');
                })->count();

                $complaintReviewCount = Complaint::where(function ($q) {
                    $q->where('status', 'phase_1_completed')
                        ->orWhere('review_status', 'needs_review');
                })->count();

                $badges['workorders_review'] = $taskReviewCount + $complaintReviewCount;
                // Kompatibilitas mundur
                $badges['operational_tickets'] = $badges['workorders_review'];
            }

            // 5. persetujuan jaringan = perubahan needs_review (Izin: network.approve)
            if ($this->hasPermissionSafely($user, 'network.approve', $isSuperadmin)) {
                $unapprovedOdps = Odp::where('is_approved', false)
                    ->orWhereNotNull('proposed_latitude')
                    ->count();
                $proposedCables = CableTrack::where('status', 'proposed')->count();

                $badges['network_approvals'] = $unapprovedOdps + $proposedCables;
            }

            // Ready teams (tetap disediakan untuk komponen yang memerlukannya)
            if ($this->hasPermissionSafely($user, 'attendance.view', $isSuperadmin) || $this->hasPermissionSafely($user, 'teams.view', $isSuperadmin)) {
                $badges['ready_teams'] = count($this->teamReadinessService->getReadyTeams());
            }

            return $badges;
        });
    }

    /**
     * Bersihkan cache badge (dipanggil oleh event bila ada perubahan data).
     */
    public static function clearCache(?int $userId = null): void
    {
        if ($userId) {
            Cache::forget('menu_badges_user_'.$userId);
        } else {
            // Bersihkan semua badge user bila tidak spesifik
            Cache::flush();
        }
    }
}
