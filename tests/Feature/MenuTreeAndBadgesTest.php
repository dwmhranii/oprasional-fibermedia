<?php

namespace Tests\Feature;

use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Odp;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use App\Services\MenuService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MenuTreeAndBadgesTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $admin;
    protected User $sales;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles & permissions
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->superadmin = User::factory()->create();
        $this->superadmin->assignRole('Superadmin');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $this->sales = User::factory()->create();
        $this->sales->assignRole('Sales');
    }

    public function test_superadmin_receives_exactly_14_single_door_menus_in_exact_order(): void
    {
        $response = $this->actingAs($this->superadmin)->getJson('/api/menu');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $menu = $response->json('data');

        // Pastikan grup pertama adalah grup tanpa nama / Dashboard
        $this->assertNotEmpty($menu);
        $firstGroup = $menu[0];
        $this->assertEquals('', $firstGroup['group']);
        $this->assertEquals('Dashboard', $firstGroup['items'][0]['title']);
        $this->assertEquals('/dashboard', $firstGroup['items'][0]['route']);

        // Pastikan nama grup terdaftar sesuai spesifikasi
        $groupNames = array_map(fn ($g) => $g['group'], $menu);
        $this->assertEquals([
            '',
            'Pelanggan',
            'Operasional',
            'Jaringan',
            'Absensi & Tim',
            'KPI',
            'Produk & Penjualan',
            'Pengaturan',
        ], $groupNames);

        // Kumpulkan semua item menu Superadmin
        $allItems = [];
        foreach ($menu as $group) {
            foreach ($group['items'] as $item) {
                $allItems[] = [
                    'title' => $item['title'],
                    'route' => $item['route'],
                ];
            }
        }

        // Tepat 15 menu satu pintu
        $this->assertCount(15, $allItems, 'Jumlah menu Superadmin harus tepat 15 menu satu pintu.');

        $expectedMenus = [
            ['title' => 'Dashboard', 'route' => '/dashboard'],
            ['title' => 'Pelanggan', 'route' => '/customers'],
            ['title' => 'Tiket Pengaduan', 'route' => '/complaints'],
            ['title' => 'Pemasangan (PSB)', 'route' => '/psb'],
            ['title' => 'Work Order', 'route' => '/work-orders'],
            ['title' => 'Peta Jaringan', 'route' => '/network/map'],
            ['title' => 'OLT, ODC, ODP & Kabel', 'route' => '/network/olt'],
            ['title' => 'Absensi', 'route' => '/attendance/today'],
            ['title' => 'Tim dan Anggota', 'route' => '/teams'],
            ['title' => 'KPI', 'route' => '/kpi'],
            ['title' => 'Katalog & Promo', 'route' => '/catalog'],
            ['title' => 'Laporan Sales & Revenue', 'route' => '/reports'],
            ['title' => 'Pengguna & Hak Akses', 'route' => '/access/users'],
            ['title' => 'Pengaturan Sistem', 'route' => '/settings/sla'],
            ['title' => 'Pengaturan Operasional', 'route' => '/settings/dispatch'],
        ];

        $this->assertEquals($expectedMenus, $allItems);
    }

    public function test_admin_cs_only_sees_permitted_core_menus_and_no_empty_groups(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/menu');

        $response->assertStatus(200);
        $menu = $response->json('data');

        // Pastikan semua grup yang dikembalikan memiliki setidaknya 1 item
        foreach ($menu as $group) {
            $this->assertNotEmpty($group['items'], "Grup {$group['group']} tidak boleh kosong.");
        }

        // Admin CS hanya melihat menu inti yang diizinkan (Dashboard, Pelanggan, Tiket Pengaduan)
        $adminRoutes = [];
        foreach ($menu as $group) {
            foreach ($group['items'] as $item) {
                $adminRoutes[] = $item['route'];
            }
        }

        $this->assertContains('/dashboard', $adminRoutes);
        $this->assertContains('/customers', $adminRoutes);
        $this->assertContains('/complaints', $adminRoutes);
        $this->assertNotContains('/access/users', $adminRoutes);
        $this->assertNotContains('/settings/dispatch', $adminRoutes);
        $this->assertNotContains('/network/odp', $adminRoutes);
    }

    public function test_badges_endpoint_returns_exact_actionable_counts(): void
    {
        // 1. Pending submission
        Submission::factory()->create(['status' => 'pending']);
        Submission::factory()->create(['status' => 'approved']);

        // 2. Complaints butuh tindakan (unassigned, escalated, phase_1_completed)
        Complaint::create([
            'ticket_number' => 'CMP-TEST-BADGE-1',
            'customer_name' => 'Budi Test',
            'customer_phone' => '081234567891',
            'customer_address' => 'Jl. Test 1',
            'area' => 'Klojen',
            'subject' => 'Koneksi lambat',
            'description' => 'Redaman drop',
            'category' => 'slow_speed',
            'priority' => 'medium',
            'status' => 'unassigned',
            'created_by_id' => $this->superadmin->id,
            'assigned_team_id' => null,
        ]);
        Complaint::create([
            'ticket_number' => 'CMP-TEST-BADGE-2',
            'customer_name' => 'Siti Test',
            'customer_phone' => '081234567892',
            'customer_address' => 'Jl. Test 2',
            'area' => 'Klojen',
            'subject' => 'Selesai',
            'description' => 'Sudah beres',
            'category' => 'slow_speed',
            'priority' => 'low',
            'status' => 'resolved',
            'created_by_id' => $this->superadmin->id,
        ]);

        // 3. Odp belum disetujui (network approvals)
        $odc = \App\Models\Odc::create([
            'code' => 'ODC-TEST-01',
            'name' => 'ODC Test 1',
            'latitude' => -7.9800,
            'longitude' => 112.6300,
            'port_capacity' => 144,
        ]);

        \App\Models\Odp::create([
            'odc_id' => $odc->id,
            'code' => 'ODP-TEST-01',
            'name' => 'ODP Tiang Test',
            'latitude' => -7.9800,
            'longitude' => 112.6300,
            'port_capacity' => 8,
            'operational_status' => 'normal',
            'is_approved' => false,
        ]);

        $response = $this->actingAs($this->superadmin)->getJson('/api/menu/badges');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $badges = $response->json('data');

        $this->assertArrayHasKey('pending_submissions', $badges);
        $this->assertArrayHasKey('complaints_action_needed', $badges);
        $this->assertArrayHasKey('network_approvals', $badges);

        $this->assertGreaterThanOrEqual(1, $badges['pending_submissions']);
        $this->assertGreaterThanOrEqual(1, $badges['complaints_action_needed']);
        $this->assertGreaterThanOrEqual(1, $badges['network_approvals']);
    }

    public function test_badges_cache_cleared_properly(): void
    {
        $response1 = $this->actingAs($this->superadmin)->getJson('/api/menu/badges');
        $response1->assertStatus(200);

        MenuService::clearCache($this->superadmin->id);

        $response2 = $this->actingAs($this->superadmin)->getJson('/api/menu/badges');
        $response2->assertStatus(200);
    }
}
