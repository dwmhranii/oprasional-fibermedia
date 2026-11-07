<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MenuService;
use App\Services\PermissionRegistry;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SuperadminMenuTreeAndTabsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Memverifikasi GET /api/menu untuk Superadmin mengembalikan tepat 14 menu tingkat atas dengan seluruh tabs.
     */
    public function test_superadmin_gets_exactly_14_top_level_menus_with_all_tabs(): void
    {
        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            ['name' => 'Super Administrator', 'password' => bcrypt('password')]
        );
        $superadmin->syncRoles(['Superadmin', 'superadmin']);

        $response = $this->actingAs($superadmin)->getJson('/api/menu');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertIsArray($data);

        // Kumpulkan seluruh item tingkat atas dari semua grup
        $allItems = [];
        foreach ($data as $group) {
            foreach ($group['items'] ?? [] as $item) {
                $allItems[] = $item;
            }
        }

        // Tepat 15 menu satu pintu
        $this->assertCount(15, $allItems, 'Menu untuk Superadmin harus tepat 15 menu tingkat atas.');

        // Verifikasi keberadaan 15 menu utama
        $expectedTitles = [
            'Dashboard',
            'Pelanggan',
            'Tiket Pengaduan',
            'Pemasangan (PSB)',
            'Work Order',
            'Peta Jaringan',
            'OLT, ODC, ODP & Kabel',
            'Absensi',
            'Tim dan Anggota',
            'KPI',
            'Katalog & Promo',
            'Laporan Sales & Revenue',
            'Pengguna & Hak Akses',
            'Pengaturan Sistem',
            'Pengaturan Operasional',
        ];

        $actualTitles = array_column($allItems, 'title');
        foreach ($expectedTitles as $title) {
            $this->assertContains($title, $actualTitles, "Menu '{$title}' harus ada di respons menu Superadmin.");
        }

        // Verifikasi tab-tab pada menu penting
        $itemMap = [];
        foreach ($allItems as $item) {
            $itemMap[$item['title']] = $item;
        }

        // 1. Pelanggan (2 tab: Daftar, Pengajuan)
        $customerTabs = array_column($itemMap['Pelanggan']['tabs'] ?? [], 'key');
        $this->assertContains('daftar', $customerTabs);
        $this->assertContains('pengajuan', $customerTabs);

        // 2. OLT, ODC, ODP & Kabel (6 tab: OLT, ODC, ODP, Kabel, BRAS, Persetujuan; 2 aksi: Impor & Ekspor KMZ)
        $networkTabs = array_column($itemMap['OLT, ODC, ODP & Kabel']['tabs'] ?? [], 'key');
        $this->assertContains('olt', $networkTabs);
        $this->assertContains('odc', $networkTabs);
        $this->assertContains('odp', $networkTabs);
        $this->assertContains('cable', $networkTabs);
        $this->assertContains('bras', $networkTabs);
        $this->assertContains('approvals', $networkTabs);

        $networkActions = array_column($itemMap['OLT, ODC, ODP & Kabel']['actions'] ?? [], 'key');
        $this->assertContains('import_kmz', $networkActions);
        $this->assertContains('export_kmz', $networkActions);

        // 3. Absensi (3 tab: Hari Ini, Rekap, Titik Kantor)
        $attendanceTabs = array_column($itemMap['Absensi']['tabs'] ?? [], 'key');
        $this->assertContains('today', $attendanceTabs);
        $this->assertContains('recap', $attendanceTabs);
        $this->assertContains('offices', $attendanceTabs);

        // 4. KPI (3 tab: Dasbor, Rating, Pengaturan)
        $kpiTabs = array_column($itemMap['KPI']['tabs'] ?? [], 'key');
        $this->assertContains('dashboard', $kpiTabs);
        $this->assertContains('ratings', $kpiTabs);
        $this->assertContains('settings', $kpiTabs);

        // 5. Pengguna & Hak Akses (5 tab: Pengguna, Role, Matriks Izin, Perangkat, Riwayat)
        $accessTabs = array_column($itemMap['Pengguna & Hak Akses']['tabs'] ?? [], 'key');
        $this->assertContains('users', $accessTabs);
        $this->assertContains('roles', $accessTabs);
        $this->assertContains('matrix', $accessTabs);
        $this->assertContains('devices', $accessTabs);
        $this->assertContains('history', $accessTabs);

        // 6. Pengaturan Sistem (5 tab: Target SLA, Jenis Gangguan, Lokasi Kantor, Hari Libur & Jeda, Keamanan 2FA)
        $systemSettingsTabs = array_column($itemMap['Pengaturan Sistem']['tabs'] ?? [], 'key');
        $this->assertContains('sla', $systemSettingsTabs);
        $this->assertContains('complaint_types', $systemSettingsTabs);
        $this->assertContains('offices', $systemSettingsTabs);
        $this->assertContains('holidays', $systemSettingsTabs);
        $this->assertContains('2fa', $systemSettingsTabs);

        // 7. Pengaturan Operasional (3 tab: Dispatch, Peta, Log Aktivitas)
        $opsSettingsTabs = array_column($itemMap['Pengaturan Operasional']['tabs'] ?? [], 'key');
        $this->assertContains('dispatch', $opsSettingsTabs);
        $this->assertContains('map', $opsSettingsTabs);
        $this->assertContains('activity_log', $opsSettingsTabs);
    }

    /**
     * Memverifikasi Gate::before memberikan akses langsung pada izin baru tanpa seeder tambahan.
     */
    public function test_superadmin_automatically_passes_newly_created_permissions(): void
    {

        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            ['name' => 'Super Administrator', 'password' => bcrypt('password')]
        );
        $superadmin->syncRoles(['Superadmin']);

        // Buat permission acak baru yang belum pernah di-assign ke role manapun
        $randomPermission = 'system.futuristic_quantum_feature_' . time();
        Permission::findOrCreate($randomPermission, 'web');

        // Superadmin harus otomatis diizinkan lewat Gate::before
        $this->assertTrue(
            $superadmin->can($randomPermission),
            'Superadmin harus otomatis memiliki izin baru lewat Gate::before tanpa perlu seeder tambahan.'
        );
    }

    /**
     * Memverifikasi GET /api/me mengembalikan status is_superadmin, permissions lengkap, dan menu.
     */
    public function test_get_api_me_returns_superadmin_details_and_full_menu(): void
    {

        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            ['name' => 'Super Administrator', 'password' => bcrypt('password')]
        );
        $superadmin->syncRoles(['Superadmin']);

        $response = $this->actingAs($superadmin)->getJson('/api/me');
        $response->assertStatus(200);

        $response->assertJson([
            'success' => true,
            'data' => [
                'is_superadmin' => true,
            ],
        ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data['permissions']);
        $this->assertNotEmpty($data['menus']);
    }

    /**
     * Memverifikasi seluruh endpoint GET API terproteksi dapat diakses (200 / valid json) oleh Superadmin.
     */
    public function test_superadmin_can_access_all_core_get_api_routes(): void
    {

        $superadmin = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            ['name' => 'Super Administrator', 'password' => bcrypt('password')]
        );
        $superadmin->syncRoles(['Superadmin']);

        $coreGetRoutes = [
            '/api/me',
            '/api/menu',
            '/api/menu/badges',
            '/api/dashboard/summary',
            '/api/customers',
            '/api/submissions',
            '/api/complaints',
            '/api/work-orders',
            '/api/network/stats',
            '/api/network/nodes',
            '/api/network/bras',
            '/api/attendances',
            '/api/attendances/recap',
            '/api/teams',
            '/api/kpi/dashboard',
            '/api/catalog/packages',
            '/api/catalog/promos',
            '/api/users',
            '/api/roles',
            '/api/permissions/catalog',
            '/api/devices',
            '/api/audit-logs',
            '/api/dispatch-settings',
            '/api/office-locations',
        ];

        foreach ($coreGetRoutes as $uri) {
            $resp = $this->actingAs($superadmin)->getJson($uri);
            $this->assertNotEquals(
                403,
                $resp->status(),
                "Superadmin tidak boleh menerima 403 Forbidden pada route '{$uri}'."
            );
        }
    }
}
