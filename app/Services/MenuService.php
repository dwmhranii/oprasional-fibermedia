<?php

namespace App\Services;

use App\Models\Complaint;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class MenuService
{
    protected TeamReadinessService $teamReadinessService;

    public function __construct(TeamReadinessService $teamReadinessService)
    {
        $this->teamReadinessService = $teamReadinessService;
    }

    /**
     * Dapatkan pohon menu yang difilter sesuai izin pengguna.
     * Superadmin melihat semua menu yang modulnya ada.
     */
    public function getMenuTree(User $user): array
    {
        $isSuperadmin = $user->hasRole('Superadmin');
        $moduleDirs = glob(app_path('Modules/*'), GLOB_ONLYDIR);
        $rawItems = [];

        foreach ($moduleDirs as $dir) {
            $menuFile = $dir.DIRECTORY_SEPARATOR.'menu.php';
            if (file_exists($menuFile)) {
                $items = require $menuFile;
                if (is_array($items)) {
                    foreach ($items as $item) {
                        $permission = $item['permission'] ?? null;
                        if ($this->hasPermissionSafely($user, $permission ?? '', $isSuperadmin)) {
                            $rawItems[] = $item;
                        }
                    }
                }
            }
        }

        // Kelompokkan per grup
        $grouped = [];
        foreach ($rawItems as $item) {
            $groupName = $item['group'] ?? 'Lainnya';
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
     * Helper untuk memeriksa izin dengan aman tanpa melempar exception jika permission belum dibuat di DB.
     */
    private function hasPermissionSafely(User $user, string $permission, bool $isSuperadmin): bool
    {
        if ($isSuperadmin || empty($permission)) {
            return true;
        }

        try {
            return $user->hasPermissionTo($permission) || $user->can($permission);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Dapatkan angka badge yang di-cache beberapa detik.
     * Tidak membocorkan angka jika pengguna tidak memiliki izin.
     */
    public function getBadges(User $user): array
    {
        $cacheKey = 'menu_badges_user_'.$user->id;

        return Cache::remember($cacheKey, 10, function () use ($user) {
            $isSuperadmin = $user->hasRole('Superadmin');
            $badges = [];

            // 1. open_complaints (Izin: manage_complaints)
            if ($this->hasPermissionSafely($user, 'manage_complaints', $isSuperadmin)) {
                $badges['open_complaints'] = Complaint::whereNotIn('status', ['resolved', 'closed', 'cancelled'])->count();
            }

            // 2. pending_submissions (Izin: view_any_submissions)
            if ($this->hasPermissionSafely($user, 'view_any_submissions', $isSuperadmin)) {
                $badges['pending_submissions'] = Submission::where('status', 'pending')->count();
            }

            // 3. pending_provisionings (Izin: manage_provisioning)
            if ($this->hasPermissionSafely($user, 'manage_provisioning', $isSuperadmin)) {
                $badges['pending_provisionings'] = Task::where('type', 'psb')
                    ->whereIn('status', ['pending', 'assigned'])
                    ->count();
            }

            // 4. ready_teams (Izin: view_attendances atau manage_teams)
            if ($this->hasPermissionSafely($user, 'view_attendances', $isSuperadmin) || $this->hasPermissionSafely($user, 'manage_teams', $isSuperadmin)) {
                $badges['ready_teams'] = count($this->teamReadinessService->getReadyTeams());
            }

            // 5. operational_tickets = tiket belum ditugaskan + diteruskan ke admin
            if ($this->hasPermissionSafely($user, 'view_work_orders', $isSuperadmin)) {
                $unassignedComplaints = Complaint::where('status', 'unassigned')
                    ->orWhere(fn ($q) => $q->whereNull('assigned_team_id')->whereIn('status', ['open', 'unassigned']))
                    ->count();
                $escalatedComplaints = Complaint::where('status', 'escalated_to_admin')->count();

                $unassignedTasks = Task::where('status', 'unassigned')
                    ->orWhere(fn ($q) => $q->whereNull('assigned_team_id')->whereIn('status', ['pending', 'unassigned']))
                    ->count();
                $escalatedTasks = Task::where('status', 'escalated_to_admin')->count();

                $badges['operational_tickets'] = $unassignedComplaints + $escalatedComplaints + $unassignedTasks + $escalatedTasks;
            }

            return $badges;
        });
    }
}
