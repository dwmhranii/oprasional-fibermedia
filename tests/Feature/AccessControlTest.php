<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PermissionRegistry;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected User $admin;

    protected User $sales;

    protected User $teknisi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin User',
            'email' => 'superadmin@fibermedia.id',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->admin = User::factory()->create([
            'name' => 'Admin CS',
            'email' => 'admin@fibermedia.id',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->admin->assignRole('Admin');

        $this->sales = User::factory()->create([
            'name' => 'Sales Agent',
            'email' => 'sales@fibermedia.id',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->sales->assignRole('Sales');

        $this->teknisi = User::factory()->create([
            'name' => 'Teknisi Field',
            'email' => 'teknisi@fibermedia.id',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);
        $this->teknisi->assignRole('Teknisi');
    }

    /**
     * 1. Superadmin dapat membuat custom role dan menyalin wewenang dari role lain.
     */
    public function test_superadmin_can_create_custom_role_and_copy_permissions(): void
    {
        Sanctum::actingAs($this->superadmin);

        $teknisiRole = Role::where('name', 'Teknisi')->firstOrFail();

        $response = $this->postJson('/api/roles', [
            'name' => 'Supervisor Lapangan',
            'description' => 'Mengoordinasi teknisi di area selatan',
            'copy_from_id' => $teknisiRole->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Supervisor Lapangan')
            ->assertJsonPath('data.is_system', false);

        $this->assertDatabaseHas('roles', [
            'name' => 'Supervisor Lapangan',
            'description' => 'Mengoordinasi teknisi di area selatan',
        ]);

        $createdRole = Role::where('name', 'Supervisor Lapangan')->firstOrFail();
        $this->assertTrue($createdRole->hasPermissionTo('complaints.view_assigned', 'web'));
    }

    /**
     * 2. Non-superadmin tidak dapat membuka API access.manage (403).
     */
    public function test_non_superadmin_cannot_access_access_manage_endpoints(): void
    {
        // Admin
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/roles')->assertStatus(403);
        $this->postJson('/api/roles', ['name' => 'Test'])->assertStatus(403);
        $this->getJson('/api/permissions')->assertStatus(403);

        // Sales
        Sanctum::actingAs($this->sales);
        $this->getJson('/api/roles')->assertStatus(403);

        // Teknisi
        Sanctum::actingAs($this->teknisi);
        $this->getJson('/api/roles')->assertStatus(403);
    }

    /**
     * 3. Izin terkunci tidak dapat diberikan ke role selain superadmin.
     */
    public function test_locked_permissions_cannot_be_granted_to_non_superadmin(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        // Coba berikan 'access.manage' (terkunci) ke Admin
        $response = $this->putJson("/api/roles/{$adminRole->id}/permissions", [
            'permissions' => ['dashboard.view', 'access.manage'],
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => "Izin 'access.manage' terkunci dan hanya dapat dimiliki oleh Superadmin.",
            ]);
    }

    /**
     * 4. Role sistem tidak dapat diganti namanya atau dihapus.
     */
    public function test_system_roles_cannot_be_renamed_or_deleted(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        // Ganti nama role sistem -> ditolak 422
        $response = $this->patchJson("/api/roles/{$adminRole->id}", [
            'name' => 'Customer Service Master',
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('message', "Nama role sistem 'Admin' tidak dapat diubah.");

        // Hapus role sistem -> ditolak 403
        $delResponse = $this->deleteJson("/api/roles/{$adminRole->id}");
        $delResponse->assertStatus(403)
            ->assertJsonPath('message', "Role sistem 'Admin' tidak boleh dihapus.");
    }

    /**
     * 5. Role kustom dengan pengguna aktif tidak dapat dihapus.
     */
    public function test_custom_role_with_users_cannot_be_deleted(): void
    {
        Sanctum::actingAs($this->superadmin);

        $customRole = Role::create(['name' => 'Staf Gudang', 'guard_name' => 'web']);
        $this->admin->assignRole('Staf Gudang');

        $response = $this->deleteJson("/api/roles/{$customRole->id}");
        $response->assertStatus(422);

        // Hapus penugasan pengguna
        $this->admin->removeRole('Staf Gudang');

        $successResponse = $this->deleteJson("/api/roles/{$customRole->id}");
        $successResponse->assertStatus(200);
        $this->assertDatabaseMissing('roles', ['name' => 'Staf Gudang']);
    }

    /**
     * 6. Superadmin terakhir tidak dapat diturunkan jabatannya atau dinonaktifkan.
     */
    public function test_last_superadmin_cannot_be_demoted_or_deactivated(): void
    {
        Sanctum::actingAs($this->superadmin);

        // Coba ubah role Superadmin terakhir menjadi Admin
        $response = $this->patchJson("/api/users/{$this->superadmin->id}/role", [
            'role' => 'Admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Tidak dapat menurunkan role pengguna Superadmin terakhir di sistem.');

        // Coba nonaktifkan status Superadmin terakhir
        $statusResponse = $this->patchJson("/api/users/{$this->superadmin->id}/status", [
            'status' => 'inactive',
        ]);

        $statusResponse->assertStatus(400);
    }

    /**
     * 7. Konfirmasi sandi Superadmin diverifikasi saat memperbarui hak akses role.
     */
    public function test_password_confirmation_required_and_validated_on_permissions_update(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        // Sandi salah
        $failResponse = $this->putJson("/api/roles/{$adminRole->id}/permissions", [
            'permissions' => ['dashboard.view', 'customers.view'],
            'password' => 'WrongPassword',
        ]);
        $failResponse->assertStatus(422)
            ->assertJsonPath('message', 'Konfirmasi kata sandi Superadmin salah atau belum diisi.');

        // Sandi benar
        $okResponse = $this->putJson("/api/roles/{$adminRole->id}/permissions", [
            'permissions' => ['dashboard.view', 'customers.view'],
            'password' => 'Secret123!',
        ]);
        $okResponse->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    /**
     * 8. Prasyarat izin ditegakkan (customers.update butuh customers.view).
     */
    public function test_prerequisites_enforced_when_updating_role_permissions(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        // customers.update tanpa customers.view
        $response = $this->putJson("/api/roles/{$adminRole->id}/permissions", [
            'permissions' => ['dashboard.view', 'customers.update'],
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'errors' => ["Izin 'customers.update' mensyaratkan izin 'customers.view' untuk diaktifkan."],
            ]);
    }

    /**
     * 9. Perubahan izin tercatat di activity_log dengan diff (added & revoked).
     */
    public function test_diff_is_recorded_in_activity_log(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();
        $adminRole->syncPermissions(['dashboard.view', 'customers.view']);

        $response = $this->putJson("/api/roles/{$adminRole->id}/permissions", [
            'permissions' => ['dashboard.view', 'complaints.create'],
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200);

        $activity = Activity::where('log_name', 'access_control')->latest()->first();
        $this->assertNotNull($activity);
        $this->assertEquals(['complaints.create'], $activity->properties['added']);
        $this->assertEquals(['customers.view'], $activity->properties['revoked']);
    }

    /**
     * 10. permissions:sync bersifat idempoten dan tidak menimpa penyesuaian manual Superadmin.
     */
    public function test_permissions_sync_is_idempotent_and_preserves_customizations(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();
        // Kustomisasi manual: berikan kpi.view ke Admin
        $adminRole->givePermissionTo('kpi.view');

        $registry = app(PermissionRegistry::class);
        $res1 = $registry->sync();
        $this->assertEmpty($res1['created']);

        // Pastikan kpi.view masih dipegang Admin (tidak ditimpa/dicabut)
        $this->assertTrue($adminRole->fresh()->hasPermissionTo('kpi.view', 'web'));

        $res2 = $registry->sync();
        $this->assertEmpty($res2['created']);
    }

    /**
     * 11. Mencabut pwa.access dari role langsung memblokir akses ke /pwa.
     */
    public function test_revoking_pwa_access_immediately_denies_pwa_operations(): void
    {
        $salesRole = Role::where('name', 'Sales')->firstOrFail();
        $this->assertTrue($this->sales->hasPermissionTo('pwa.access', 'web'));

        // Cabut pwa.access dari role Sales
        $salesRole->revokePermissionTo('pwa.access');
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->assertFalse($this->sales->fresh()->hasPermissionTo('pwa.access', 'web'));

        // Permintaan endpoint lapangan langsung ditolak 403
        Sanctum::actingAs($this->sales->fresh());
        $response = $this->getJson('/api/attendance/today');
        $response->assertStatus(403);
    }

    /**
     * 12. Pratinjau menu sidebar mensimulasikan menu sesuai himpunan izin yang diajukan.
     */
    public function test_menu_preview_reflects_granted_permissions(): void
    {
        Sanctum::actingAs($this->superadmin);

        $adminRole = Role::where('name', 'Admin')->firstOrFail();

        $response = $this->getJson("/api/roles/{$adminRole->id}/menu-preview?permissions[]=customers.view");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $tree = $response->json('menu_tree');
        $this->assertIsArray($tree);
        // Pastikan menu Pelanggan muncul
        $groups = array_column($tree, 'group');
        $this->assertContains('Pelanggan', $groups);
    }

    /**
     * 13. Reset role mengembalikan ke nilai bawaan registri.
     */
    public function test_role_reset_restores_registry_defaults(): void
    {
        Sanctum::actingAs($this->superadmin);

        $salesRole = Role::where('name', 'Sales')->firstOrFail();
        $salesRole->syncPermissions(['dashboard.view']); // Hapus izin asli

        $response = $this->postJson("/api/roles/{$salesRole->id}/reset");
        $response->assertStatus(200);

        // Nilai bawaan sales harus kembali
        $this->assertTrue($salesRole->fresh()->hasPermissionTo('pwa.access', 'web'));
        $this->assertTrue($salesRole->fresh()->hasPermissionTo('submissions.create', 'web'));
    }

    /**
     * 14. Endpoint role-agnostic (/api/roles, /api/permissions/catalog, /api/roles/catalog) berfungsi.
     */
    public function test_legacy_hak_akses_and_catalog_aliases_work(): void
    {
        Sanctum::actingAs($this->superadmin);

        $resRoles = $this->getJson('/api/roles');
        $resRoles->assertStatus(200)
            ->assertJsonPath('success', true);

        $resKatalog = $this->getJson('/api/permissions/catalog');
        $resKatalog->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['catalog']);

        $resCatalog = $this->getJson('/api/roles/catalog');
        $resCatalog->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['catalog']);
    }
}

