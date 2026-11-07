<?php

namespace App\Http\Controllers\Superadmin;

use App\Events\PermissionsChanged;
use App\Http\Controllers\Controller;
use App\Services\MenuService;
use App\Services\PermissionRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    protected PermissionRegistry $registry;

    protected MenuService $menuService;

    protected array $coreRoles = [
        'Superadmin',
        'superadmin',
        'Admin/CS',
        'Admin',
        'NOC/Dispatcher',
        'NOC',
        'Teknisi',
        'Sales',
        'Collector',
    ];

    public function __construct(PermissionRegistry $registry, MenuService $menuService)
    {
        $this->registry = $registry;
        $this->menuService = $menuService;
    }

    /**
     * GET /api/roles
     * Daftar semua role beserta deskripsi, status sistem/kustom, dan jumlah pengguna.
     */
    public function index(): JsonResponse
    {
        $userCounts = DB::table('model_has_roles')
            ->select('role_id', DB::raw('count(*) as count'))
            ->groupBy('role_id')
            ->pluck('count', 'role_id');

        $roles = Role::with('permissions')->get()->map(function ($role) use ($userCounts) {
            $isCore = in_array($role->name, $this->coreRoles, true);

            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? ($isCore ? $this->getCoreRoleDescription($role->name) : 'Peran kustom operasional'),
                'user_count' => (int) ($userCounts[$role->id] ?? 0),
                'permissions' => $role->permissions->pluck('name'),
                'is_system' => $isCore,
                'is_core_role' => $isCore,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    /**
     * GET /api/roles/{role}
     */
    public function show(Role $role): JsonResponse
    {
        $isCore = in_array($role->name, $this->coreRoles, true);
        $userCount = DB::table('model_has_roles')->where('role_id', $role->id)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? ($isCore ? $this->getCoreRoleDescription($role->name) : null),
                'user_count' => (int) $userCount,
                'permissions' => $role->permissions()->pluck('name'),
                'is_system' => $isCore,
                'is_core_role' => $isCore,
            ],
        ]);
    }

    /**
     * POST /api/roles
     * Tambah custom role baru (dengan opsi salin dari role lain).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'copy_from_id' => 'nullable|exists:roles,id',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (array_key_exists('description', $validated)) {
            $role->description = $validated['description'];
            $role->save();
        }

        $permissionsToAssign = $validated['permissions'] ?? [];

        // Bila ada permintaan salin izin dari role lain
        if (! empty($validated['copy_from_id'])) {
            $sourceRole = Role::find($validated['copy_from_id']);
            if ($sourceRole) {
                $sourcePerms = $sourceRole->permissions->pluck('name')->toArray();
                // Filter: role kustom tidak boleh menerima izin terkunci
                $filteredPerms = array_filter($sourcePerms, fn ($p) => ! $this->registry->isLocked($p));
                $permissionsToAssign = array_unique(array_merge($permissionsToAssign, $filteredPerms));
            }
        }

        if (! empty($permissionsToAssign)) {
            $role->syncPermissions($permissionsToAssign);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        activity('access_control')
            ->causedBy($request->user())
            ->performedOn($role)
            ->withProperties([
                'name' => $role->name,
                'description' => $role->description,
                'copied_from' => $validated['copy_from_id'] ?? null,
            ])
            ->log("Role kustom '{$role->name}' berhasil dibuat oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Role '{$role->name}' berhasil dibuat.",
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'user_count' => 0,
                'is_system' => false,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ], 201);
    }

    /**
     * PATCH /api/roles/{role} atau PUT /api/roles/{role}
     * Ubah nama dan deskripsi role.
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        $isCore = in_array($role->name, $this->coreRoles, true);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:50|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:255',
        ]);

        // Role sistem tidak dapat diganti namanya
        if ($isCore && isset($validated['name']) && $validated['name'] !== $role->name) {
            return response()->json([
                'message' => "Nama role sistem '{$role->name}' tidak dapat diubah.",
            ], 422);
        }

        if (isset($validated['name']) && ! $isCore) {
            $role->name = $validated['name'];
        }

        if (array_key_exists('description', $validated)) {
            $role->description = $validated['description'];
        }

        $role->save();

        activity('access_control')
            ->causedBy($request->user())
            ->performedOn($role)
            ->log("Role '{$role->name}' diperbarui oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Role '{$role->name}' berhasil diperbarui.",
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'is_system' => $isCore,
            ],
        ]);
    }

    /**
     * DELETE /api/roles/{role}
     * Hapus custom role yang tidak memiliki pengguna.
     */
    public function destroy(Request $request, Role $role): JsonResponse
    {
        if (in_array($role->name, $this->coreRoles, true)) {
            return response()->json([
                'message' => "Role sistem '{$role->name}' tidak boleh dihapus.",
            ], 403);
        }

        $userCount = DB::table('model_has_roles')->where('role_id', $role->id)->count();
        if ($userCount > 0) {
            return response()->json([
                'message' => "Tidak dapat menghapus role '{$role->name}' karena masih memiliki {$userCount} pengguna aktif.",
            ], 422);
        }

        $roleName = $role->name;
        $role->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        activity('access_control')
            ->causedBy($request->user())
            ->log("Role kustom '{$roleName}' dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Role '{$roleName}' berhasil dihapus.",
        ]);
    }

    /**
     * GET /api/permissions
     * Registri izin dikelompokkan per modul dengan metadata lengkap.
     */
    public function catalog(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'catalog' => $this->registry->getGroupedCatalog(),
        ]);
    }

    /**
     * GET /api/roles/{role}/permissions
     */
    public function permissions(Role $role): JsonResponse
    {
        return response()->json([
            'success' => true,
            'role_id' => $role->id,
            'role_name' => $role->name,
            'permissions' => $role->permissions->pluck('name'),
        ]);
    }

    /**
     * PUT /api/roles/{role}/permissions
     * Simpan matriks permissions untuk sebuah role.
     */
    public function updatePermissions(Request $request, Role $role): JsonResponse
    {
        if (strtolower($role->name) === 'superadmin') {
            return response()->json([
                'message' => 'Izin role Superadmin tidak dapat diubah.',
            ], 422);
        }

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
            'password' => 'nullable|string',
        ]);

        // Verifikasi konfirmasi sandi Superadmin (bawaan aktif)
        $passwordRequired = true;
        if ($passwordRequired) {
            $password = $request->input('password');
            if (empty($password) || ! Hash::check($password, $request->user()->password)) {
                return response()->json([
                    'message' => 'Konfirmasi kata sandi Superadmin salah atau belum diisi.',
                ], 422);
            }
        }

        $targetPermissions = $validated['permissions'];

        // Tolak izin yang terkunci untuk Superadmin
        foreach ($targetPermissions as $perm) {
            if ($this->registry->isLocked($perm)) {
                return response()->json([
                    'message' => "Izin '{$perm}' terkunci dan hanya dapat dimiliki oleh Superadmin.",
                ], 422);
            }
        }

        // Validasi prasyarat izin
        $prereqErrors = $this->registry->validatePrerequisites($targetPermissions);
        if (! empty($prereqErrors)) {
            return response()->json([
                'message' => implode(' ', $prereqErrors),
                'errors' => $prereqErrors,
            ], 422);
        }

        $oldPermissions = $role->permissions->pluck('name')->toArray();
        $added = array_values(array_diff($targetPermissions, $oldPermissions));
        $revoked = array_values(array_diff($oldPermissions, $targetPermissions));

        $role->syncPermissions($targetPermissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Rekam diff ke activity_log
        activity('access_control')
            ->causedBy($request->user())
            ->performedOn($role)
            ->withProperties([
                'role' => $role->name,
                'added' => $added,
                'revoked' => $revoked,
            ])
            ->log("Hak akses role '{$role->name}' diperbarui oleh {$request->user()->name}");

        // Siarkan event Reverb untuk pengguna terdampak
        $affectedUserIds = DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->pluck('model_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();
        try {
            broadcast(new PermissionsChanged($role->id, $affectedUserIds));
        } catch (\Throwable) {
            // Reverb opsional saat queue/driver belum running di dev
        }

        return response()->json([
            'success' => true,
            'message' => "Hak akses untuk Role '{$role->name}' berhasil diperbarui.",
            'role' => $role->name,
            'added' => $added,
            'revoked' => $revoked,
            'permissions' => $role->fresh()->permissions->pluck('name'),
        ]);
    }

    /**
     * GET /api/roles/{role}/menu-preview
     * Pratinjau pohon menu dan tab sidebar yang akan terlihat oleh role ini.
     */
    public function menuPreview(Request $request, Role $role): JsonResponse
    {
        $permissions = $request->has('permissions')
            ? (array) $request->input('permissions')
            : $role->permissions->pluck('name')->toArray();

        $previewTree = $this->menuService->getPreviewTree($permissions, strtolower($role->name) === 'superadmin');

        return response()->json([
            'success' => true,
            'role_name' => $role->name,
            'menu_tree' => $previewTree,
        ]);
    }

    /**
     * POST /api/roles/{role}/reset
     * Kembalikan hak akses role ke nilai bawaan registri modul.
     */
    public function reset(Request $request, Role $role): JsonResponse
    {
        if (strtolower($role->name) === 'superadmin') {
            return response()->json([
                'message' => 'Izin role Superadmin tidak dapat direset.',
            ], 422);
        }

        $registry = $this->registry->getAll();
        $defaultPerms = [];

        foreach ($registry as $key => $meta) {
            if (in_array($role->name, $meta['default_roles'] ?? [], true)) {
                $defaultPerms[] = $key;
            }
        }

        $oldPermissions = $role->permissions->pluck('name')->toArray();
        $added = array_values(array_diff($defaultPerms, $oldPermissions));
        $revoked = array_values(array_diff($oldPermissions, $defaultPerms));

        $role->syncPermissions($defaultPerms);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        activity('access_control')
            ->causedBy($request->user())
            ->performedOn($role)
            ->withProperties([
                'role' => $role->name,
                'reset_to_default' => true,
                'added' => $added,
                'revoked' => $revoked,
            ])
            ->log("Hak akses role '{$role->name}' dikembalikan ke bawaan registri oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Hak akses role '{$role->name}' berhasil dikembalikan ke bawaan registri.",
            'role' => $role->name,
            'permissions' => $role->fresh()->permissions->pluck('name'),
        ]);
    }

    protected function getCoreRoleDescription(string $roleName): string
    {
        return match (strtolower($roleName)) {
            'superadmin' => 'Pemegang wewenang penuh tanpa batas ke seluruh modul, konfigurasi, hak akses, dan audit sistem.',
            'admin/cs', 'admin' => 'Layanan pelanggan, penerimaan pengaduan, verifikasi pengajuan pasang baru, dan operasional kantor.',
            'noc/dispatcher', 'noc' => 'Monitoring jaringan FTTH, OLT, BRAS, peta jalur kabel, pemeliharaan, dan eskalasi teknis.',
            'teknisi' => 'Petugas instalasi dan perbaikan di lapangan melalui aplikasi PWA (tiket tim, bukti foto, usul ODP).',
            'sales' => 'Pemasar lapangan melalui aplikasi PWA (registrasi calon pelanggan baru, monitoring pengajuan sendiri).',
            'collector' => 'Petugas monitoring tagihan pelanggan dan koordinasi penagihan lapangan melalui aplikasi PWA.',
            default => 'Peran sistem bawaan.',
        };
    }
}
