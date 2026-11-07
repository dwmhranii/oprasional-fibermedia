<?php

namespace App\Services;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionRegistry
{
    protected ?array $cachedDefinitions = null;

    /**
     * Memuat seluruh definisi permission dari berkas modul app/Modules/{Modul}/permissions.php.
     */
    public function getAll(): array
    {
        if ($this->cachedDefinitions !== null) {
            return $this->cachedDefinitions;
        }

        $definitions = [];
        $files = glob(app_path('Modules/*/permissions.php'));

        foreach ($files as $file) {
            $items = require $file;
            if (is_array($items)) {
                foreach ($items as $item) {
                    if (isset($item['key'])) {
                        $definitions[$item['key']] = [
                            'key' => $item['key'],
                            'module' => $item['module'] ?? 'general',
                            'module_name' => $item['module_name'] ?? ucfirst($item['module'] ?? 'Umum'),
                            'label' => $item['label'] ?? $item['key'],
                            'description' => $item['description'] ?? '',
                            'is_locked' => (bool) ($item['is_locked'] ?? false),
                            'is_sensitive' => (bool) ($item['is_sensitive'] ?? false),
                            'default_roles' => $item['default_roles'] ?? ['Superadmin'],
                            'prerequisites' => $item['prerequisites'] ?? [],
                        ];
                    }
                }
            }
        }

        $this->cachedDefinitions = $definitions;

        return $this->cachedDefinitions;
    }

    /**
     * Mengambil katalog terstruktur dikelompokkan per modul untuk UI Matriks Hak Akses.
     */
    public function getGroupedCatalog(): array
    {
        $all = $this->getAll();
        $modules = [];

        foreach ($all as $item) {
            $moduleKey = $item['module'];
            if (! isset($modules[$moduleKey])) {
                $modules[$moduleKey] = [
                    'module_key' => $moduleKey,
                    'module_name' => $item['module_name'],
                    'actions' => [],
                ];
            }

            $modules[$moduleKey]['actions'][] = [
                'name' => $item['key'],
                'label' => $item['label'],
                'description' => $item['description'],
                'is_locked' => $item['is_locked'],
                'is_sensitive' => $item['is_sensitive'],
                'prerequisites' => $item['prerequisites'],
            ];
        }

        return array_values($modules);
    }

    /**
     * Periksa apakah permission terkunci untuk selain Superadmin.
     */
    public function isLocked(string $key): bool
    {
        $all = $this->getAll();

        return (bool) ($all[$key]['is_locked'] ?? false);
    }

    /**
     * Dapatkan daftar prasyarat untuk suatu permission.
     */
    public function getPrerequisites(string $key): array
    {
        $all = $this->getAll();

        return $all[$key]['prerequisites'] ?? [];
    }

    /**
     * Dapatkan semua permission yang bergantung pada key ini.
     */
    public function getDependents(string $key): array
    {
        $all = $this->getAll();
        $dependents = [];

        foreach ($all as $item) {
            if (in_array($key, $item['prerequisites'], true)) {
                $dependents[] = $item['key'];
            }
        }

        return $dependents;
    }

    /**
     * Validasi pemenuhan prasyarat pada kumpulan permissions.
     * Mengembalikan daftar error atau array kosong bila valid.
     */
    public function validatePrerequisites(array $permissions): array
    {
        $errors = [];
        $permissionSet = array_flip($permissions);

        foreach ($permissions as $perm) {
            $prereqs = $this->getPrerequisites($perm);
            foreach ($prereqs as $req) {
                if (! isset($permissionSet[$req])) {
                    $errors[] = "Izin '{$perm}' mensyaratkan izin '{$req}' untuk diaktifkan.";
                }
            }
        }

        return $errors;
    }

    /**
     * Sinkronkan registri dengan tabel basis data.
     * Aturan Baku:
     * 1. Membuat permission yang belum ada di basis data.
     * 2. Menetapkan default_roles HANYA untuk permission baru.
     * 3. Tidak pernah mencabut atau menimpa perubahan manual Superadmin pada permission yang sudah ada.
     * 4. Melaporkan permission baru dan permission usang di database yang tidak ada di registri.
     */
    public function sync(): array
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $registry = $this->getAll();
        $created = [];
        $existing = Permission::pluck('name')->toArray();

        foreach ($registry as $key => $meta) {
            $isNew = ! in_array($key, $existing, true);

            $perm = Permission::firstOrCreate([
                'name' => $key,
                'guard_name' => 'web',
            ]);

            if ($isNew) {
                $created[] = $key;
                // Tetapkan default_roles HANYA untuk permission yang baru dibuat
                foreach ($meta['default_roles'] as $roleName) {
                    $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
                    $role->givePermissionTo($perm);
                }
            }
        }

        // Pastikan Superadmin selalu memiliki semua permission aktif
        $roleSuperadmin = Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        $roleSuperadmin->givePermissionTo(Permission::all());

        $roleSuperadminLower = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $roleSuperadminLower->givePermissionTo(Permission::all());

        // Cari permission usang di basis data (tidak ada di registri dan bukan alias kompatibilitas lama)
        $knownAliases = [
            'view_dashboard', 'view_any_submissions', 'view_own_submissions', 'create_submissions',
            'edit_submissions', 'validate_submissions', 'approve_submissions', 'reject_submissions',
            'manage_provisioning', 'assign_tasks', 'view_assigned_tasks', 'update_task_status',
            'manage_users', 'manage_roles', 'view_audit_logs', 'view_sla', 'view_analytics',
            'manage_customers', 'view_customers', 'manage_complaints', 'view_work_orders',
            'manage_network', 'view_attendances', 'manage_attendances', 'manage_teams',
            'manage_devices', 'manage_office_locations', 'manage_kpi_settings', 'manage_ratings',
            'manage_packages', 'view_sales_reports', 'manage_dispatch_settings',
        ];

        $registryKeys = array_keys($registry);
        $obsolete = array_values(array_filter($existing, function ($name) use ($registryKeys, $knownAliases) {
            return ! in_array($name, $registryKeys, true) && ! in_array($name, $knownAliases, true);
        }));

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return [
            'created' => $created,
            'total_registered' => count($registry),
            'obsolete' => $obsolete,
        ];
    }
}
