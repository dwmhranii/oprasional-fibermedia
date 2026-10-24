<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    /**
     * GET /api/superadmin/roles
     * Daftar semua role beserta permissions yang aktif dan jumlah usernya.
     */
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->get()->map(function ($role) {
            $permNames = $role->permissions->pluck('name');
            $menuPerms = $permNames->filter(fn ($p) => str_starts_with($p, 'menu.'))->values();

            return [
                'id' => $role->id,
                'name' => $role->name,
                'user_count' => $role->users()->count(),
                'permissions' => $permNames,
                'menu_permissions' => $menuPerms,
                'is_core_role' => in_array($role->name, ['Superadmin', 'Admin', 'Teknisi', 'Sales']),
            ];
        });

        return response()->json([
            'data' => $roles,
        ]);
    }

    /**
     * GET /api/superadmin/roles/{role}
     */
    public function show(Role $role): JsonResponse
    {
        $permNames = $role->permissions()->pluck('name');
        $menuPerms = $permNames->filter(fn ($p) => str_starts_with($p, 'menu.'))->values();

        return response()->json([
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'user_count' => $role->users()->count(),
                'permissions' => $permNames,
                'menu_permissions' => $menuPerms,
                'is_core_role' => in_array($role->name, ['Superadmin', 'Admin', 'Teknisi', 'Sales']),
            ],
        ]);
    }

    /**
     * POST /api/superadmin/roles
     * Tambah custom role baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        activity()->causedBy($request->user())->log("Role {$role->name} created by {$request->user()->name}");

        return response()->json([
            'message' => "Role '{$role->name}' berhasil dibuat.",
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ], 201);
    }

    /**
     * PUT /api/superadmin/roles/{role}/permissions
     * Simpan hasil centang menu & hak akses dari UI React Matrix.
     */
    public function updatePermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        // Proteksi: Role Superadmin harus selalu memiliki semua permission
        if ($role->name === 'Superadmin') {
            $allPerms = Permission::pluck('name')->toArray();
            $role->syncPermissions($allPerms);
        } else {
            $role->syncPermissions($validated['permissions']);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        activity()->causedBy($request->user())->log("Permissions for Role {$role->name} updated by {$request->user()->name}");

        return response()->json([
            'message' => "Hak akses untuk Role '{$role->name}' berhasil diperbarui.",
            'role' => $role->name,
            'permissions' => $role->fresh()->permissions->pluck('name'),
        ]);
    }

    /**
     * DELETE /api/superadmin/roles/{role}
     * Hapus custom role.
     */
    public function destroy(Request $request, Role $role): JsonResponse
    {
        $coreRoles = ['Superadmin', 'Admin', 'Teknisi', 'Sales'];
        if (in_array($role->name, $coreRoles)) {
            return response()->json([
                'message' => "Role sistem '{$role->name}' tidak boleh dihapus.",
            ], 403);
        }

        if ($role->users()->count() > 0) {
            return response()->json([
                'message' => "Tidak dapat menghapus role '{$role->name}' karena masih memiliki {$role->users()->count()} pengguna aktif.",
            ], 422);
        }

        $roleName = $role->name;
        $role->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        activity()->causedBy($request->user())->log("Role {$roleName} deleted by {$request->user()->name}");

        return response()->json([
            'message' => "Role '{$roleName}' berhasil dihapus.",
        ]);
    }

    /**
     * GET /api/superadmin/permissions
     * Katalog Master Permissions dikelompokkan per modul/menu (untuk render Matrix Checkbox di UI React).
     */
    public function catalog(): JsonResponse
    {
        $catalog = [
            [
                'module_key' => 'dashboard',
                'module_name' => 'Dashboard & Analitik',
                'description' => 'Halaman ringkasan statistik dan analitik sistem',
                'menu_permission' => 'menu.dashboard',
                'actions' => [
                    ['name' => 'view_analytics', 'label' => 'Melihat Analisis & KPI'],
                ],
            ],
            [
                'module_key' => 'sales_submissions',
                'module_name' => 'Pengajuan Registrasi Sales',
                'description' => 'Pendaftaran calon pelanggan oleh tim Sales',
                'menu_permission' => 'menu.sales_submissions',
                'actions' => [
                    ['name' => 'create_submissions', 'label' => 'Input Pendaftaran Baru'],
                    ['name' => 'edit_submissions', 'label' => 'Edit Draft Berkas'],
                    ['name' => 'view_own_submissions', 'label' => 'Lihat Pengajuan Sendiri'],
                    ['name' => 'view_any_submissions', 'label' => 'Lihat Semua Pengajuan Sales'],
                ],
            ],
            [
                'module_key' => 'submissions_validation',
                'module_name' => 'Validasi Berkas Admin',
                'description' => 'Pemeriksaan berkas dan approval registrasi',
                'menu_permission' => 'menu.submissions_validation',
                'actions' => [
                    ['name' => 'validate_submissions', 'label' => 'Proses Validasi Berkas'],
                    ['name' => 'approve_submissions', 'label' => 'Setujui (Approve) Berkas'],
                    ['name' => 'reject_submissions', 'label' => 'Tolak / Return Berkas'],
                ],
            ],
            [
                'module_key' => 'provisionings',
                'module_name' => 'Provisioning & OLT',
                'description' => 'Konfigurasi ONT, VLAN, dan aktivasi jaringan',
                'menu_permission' => 'menu.provisionings',
                'actions' => [
                    ['name' => 'manage_provisioning', 'label' => 'Proses Konfigurasi Provisioning'],
                    ['name' => 'provisioning.retry', 'label' => 'Retry Gagal Provisioning'],
                ],
            ],
            [
                'module_key' => 'tasks',
                'module_name' => 'Pemasangan / Tugas Teknisi',
                'description' => 'Tugas lapangan instalasi ONT dan aktivasi pelanggan baru',
                'menu_permission' => 'menu.tasks',
                'actions' => [
                    ['name' => 'assign_tasks', 'label' => 'Tugaskan Pemasangan ke Teknisi'],
                    ['name' => 'update_task_status', 'label' => 'Update Status & Bukti Lapangan'],
                    ['name' => 'view_assigned_tasks', 'label' => 'Lihat Daftar Tugas Milik Sendiri'],
                ],
            ],
            [
                'module_key' => 'complaints',
                'module_name' => 'Pengaduan & Gangguan',
                'description' => 'Penanganan laporan gangguan pelanggan dan perbaikan lapangan',
                'menu_permission' => 'menu.complaints',
                'actions' => [
                    ['name' => 'complaints.view', 'label' => 'Melihat Daftar Tiket'],
                    ['name' => 'complaints.create', 'label' => 'Buat Tiket Pengaduan Baru'],
                    ['name' => 'complaints.assign', 'label' => 'Tugaskan Teknisi (Round Robin / Manual)'],
                    ['name' => 'complaints.resolve_remote', 'label' => 'Selesai Remote Tanpa Teknisi'],
                    ['name' => 'complaints.verify_close', 'label' => 'Verifikasi Bukti Fisik & Tutup Tiket'],
                    ['name' => 'complaints.return', 'label' => 'Kembalikan Tiket ke Teknisi'],
                    ['name' => 'complaints.cancel', 'label' => 'Batalkan Tiket Pengaduan'],
                    ['name' => 'complaints.reopen', 'label' => 'Buka Kembali Tiket Ditutup'],
                ],
            ],
            [
                'module_key' => 'customers',
                'module_name' => 'Data Pelanggan',
                'description' => 'Kelola data pelanggan aktif dan status langganan',
                'menu_permission' => 'menu.customers',
                'actions' => [
                    ['name' => 'customers.manage', 'label' => 'Kelola & Edit Pelanggan'],
                ],
            ],
            [
                'module_key' => 'packages',
                'module_name' => 'Paket & Kode Promo',
                'description' => 'Daftar paket internet dan promo diskon',
                'menu_permission' => 'menu.packages',
                'actions' => [
                    ['name' => 'packages.manage', 'label' => 'Kelola Paket & Promo'],
                ],
            ],
            [
                'module_key' => 'reports',
                'module_name' => 'Laporan & Audit Log',
                'description' => 'Ekspor data transaksi dan riwayat aktivitas user',
                'menu_permission' => 'menu.reports',
                'actions' => [
                    ['name' => 'view_audit_logs', 'label' => 'Melihat Riwayat Audit Log'],
                    ['name' => 'reports.export', 'label' => 'Ekspor Dokumen Excel & PDF'],
                ],
            ],
            [
                'module_key' => 'sla',
                'module_name' => 'SLA Breaches',
                'description' => 'Monitoring keterlambatan respon dan resolusi SLA',
                'menu_permission' => 'menu.sla',
                'actions' => [],
            ],
            [
                'module_key' => 'settings',
                'module_name' => 'Panel Pengaturan Superadmin',
                'description' => 'Konfigurasi akun user, role, team, dan sistem',
                'menu_permission' => 'menu.settings',
                'actions' => [
                    ['name' => 'manage_users', 'label' => 'Kelola User & Akun'],
                    ['name' => 'manage_roles', 'label' => 'Kelola Role & Hak Akses'],
                    ['name' => 'manage_teams', 'label' => 'Kelola Struktur Team'],
                ],
            ],
        ];

        $permissions = Permission::select(['id', 'name'])->get();

        return response()->json([
            'data' => $permissions->isNotEmpty() ? $permissions : $catalog,
            'catalog' => $catalog,
        ]);
    }
}
