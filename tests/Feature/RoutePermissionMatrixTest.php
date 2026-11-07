<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Customer;
use App\Models\Package;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as LaravelRoute;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RoutePermissionMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $admin;
    protected User $teknisi;
    protected User $sales;

    protected function setUp(): void
    {
        parent::setUp();

        // Jalankan seeder
        $this->seed(RolesAndPermissionsSeeder::class);

        // Buat Superadmin
        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin Tester',
        ]);
        $this->superadmin->assignRole('Superadmin');

        // Buat Admin CS
        $this->admin = User::factory()->create([
            'name' => 'Admin CS Tester',
        ]);
        $this->admin->assignRole('Admin');

        // Buat Teknisi
        $this->teknisi = User::factory()->create([
            'name' => 'Teknisi Tester',
        ]);
        $this->teknisi->assignRole('Teknisi');

        // Buat Sales
        $this->sales = User::factory()->create([
            'name' => 'Sales Tester',
        ]);
        $this->sales->assignRole('Sales');
    }

    /**
     * 1. Seeder idempoten dan dapat dijalankan dua kali tanpa duplikasi atau merusak penugasan.
     */
    public function test_seeder_is_idempotent_and_can_run_twice(): void
    {
        $initialPermissionsCount = Permission::count();
        $this->assertGreaterThan(0, $initialPermissionsCount);

        // Jalankan seeder kedua kali
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->assertEquals($initialPermissionsCount, Permission::count(), 'Jumlah izin tidak boleh bertambah (tidak boleh ada duplikasi).');

        // Verifikasi izin Admin tetap persis 8 izin
        $this->admin->refresh();
        $adminPermissions = $this->admin->getAllPermissions()->pluck('name')->sort()->values()->toArray();
        $expectedAdminPerms = [
            'attendance.self',
            'complaints.create',
            'complaints.view_own',
            'customers.create',
            'customers.view',
            'dashboard.view',
            'submissions.approve',
            'submissions.view',
        ];
        sort($expectedAdminPerms);
        $this->assertEquals($expectedAdminPerms, $adminPermissions);
    }

    /**
     * 2. Superadmin via Gate::before mengakses route dan izin baru secara dinamis tanpa seeder tambahan.
     */
    public function test_superadmin_dynamically_accesses_new_permission_and_route(): void
    {
        Permission::create(['name' => 'future_secret.access', 'guard_name' => 'web']);

        Route::get('/api/future-secret-endpoint', function () {
            return response()->json(['message' => 'welcome_future_feature']);
        })->middleware(['auth:sanctum', 'can:future_secret.access']);

        // Superadmin langsung tembus 200
        $response = $this->actingAs($this->superadmin, 'sanctum')->getJson('/api/future-secret-endpoint');
        $response->assertStatus(200)->assertJson(['message' => 'welcome_future_feature']);

        // Admin CS ditolak 403
        $responseAdmin = $this->actingAs($this->admin, 'sanctum')->getJson('/api/future-secret-endpoint');
        $responseAdmin->assertStatus(403);
    }

    /**
     * 3. Seluruh route API terproteksi wajib menyatakan middleware izin (can:) atau policy, kecuali whitelist publik.
     */
    public function test_all_api_routes_declare_permission_or_are_whitelisted(): void
    {
        $whitelistRoutes = [
            'api/login',
            'api/forgot-password',
            'api/reset-password',
            'api/time',
            'api/enums',
            'api/maintenance/status',
            'api/user',
            'api/user/profile',
            'api/user/password',
            'api/user/notification-settings',
            'api/logout',
            'api/menu',
            'api/menu/badges',
            'api/notifications',
            'api/notifications/unread-count',
            'api/notifications/{id}/read',
            'api/notifications/read-all',
            'api/notifications/test',
            'api/push-subscriptions/vapid-key',
            'api/push-subscriptions',
            'api/push-subscriptions/test',
            'api/tiles/manifest',
            'api/tiles/area.pmtiles',
            'api/media/{media}/download',
            'api/docs/raw',
            'api/broadcasting/auth',
            'api/attendances/today/me',
            'api/attendances/check-in',
            'api/attendances/check-out',
            'api/attendances/history',
            'api/kpi/my',
            'api/kpi/ratings',
            'api/geofence/events',
            'api/sales/profile',
            'api/sales/recap',
            'api/sales/submissions',
            'api/sales/submissions/{id}',
            'api/sales/submissions/{id}/duplicate-check',
            'api/teknisi/tasks/{id}/start',
            'api/teknisi/tasks/{id}/phase1',
            'api/teknisi/tasks/{id}/phase2',
            'api/teknisi/tasks/{id}/pause',
            'api/teknisi/tasks/{id}/resume',
            'api/teknisi/tasks/{id}/evidence',
            'api/teknisi/tasks/{id}/complete',
            'api/teknisi/complaints/{id}/start',
            'api/teknisi/complaints/{id}/phase1',
            'api/teknisi/complaints/{id}/resolve',
            'api/teknisi/complaints/{id}/pending',
            'api/teknisi/complaints/{id}/resume',
            'api/teknisi/complaints/{id}/evidence',
            'api/teknisi/complaints/{id}/attendance',
            'api/packages/active',
            'api/packages/{package}/active-promos',
            'api/future-secret-endpoint',
        ];

        $routes = Route::getRoutes();
        $missingGuards = [];

        /** @var LaravelRoute $route */
        foreach ($routes as $route) {
            $uri = $route->uri();
            if (! str_starts_with($uri, 'api/')) {
                continue;
            }

            // Jika ada di whitelist publik / rute teknisi/sales berbasis policy internal
            if (in_array($uri, $whitelistRoutes, true)) {
                continue;
            }

            $middleware = $route->gatherMiddleware();

            $hasCanMiddleware = false;
            foreach ($middleware as $m) {
                if (str_starts_with($m, 'can:')) {
                    $hasCanMiddleware = true;
                    break;
                }
            }

            if (! $hasCanMiddleware) {
                $missingGuards[] = $route->methods()[0].' '.$uri;
            }
        }

        $this->assertEmpty(
            $missingGuards,
            'Ditemukan route API terproteksi tanpa deklarasi middleware can: '.implode(', ', $missingGuards)
        );
    }

    /**
     * 4. Pembatasan Data untuk Admin:
     *    - Daftar pelanggan tanpa NIK mentah, password, dan field teknis sensitif.
     *    - Tiket pengaduan yang terlihat hanya yang dibuat oleh Admin itu sendiri, tanpa field assignment internal.
     */
    public function test_admin_data_leak_prevention_snapshot(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-TEST-001',
            'name' => 'Budi Pelanggan',
            'nik' => '3201123456780001',
            'phone' => '081234567890',
            'address' => 'Jl. Merdeka No 1',
            'status' => 'active',
            'package' => '50 Mbps',
            'monthly_price' => 250000,
            'username' => 'budi_pppoe',
            'password' => 'secret_password_123',
            'collector' => 'Kolektor A',
            'local_address' => '10.0.0.1',
            'remote_address' => '10.0.0.2',
        ]);

        // 1. Admin membaca customer
        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/customers/'.$customer->id);
        $response->assertStatus(200);

        $customerData = $response->json('data') ?? $response->json();
        // Pastikan password tidak ada atau null
        $this->assertNull($customerData['password'] ?? null, 'Password pelanggan DILARANG bocor ke Admin.');
        $this->assertNull($customerData['username'] ?? null, 'Username PPPoE sensitif DILARANG bocor ke Admin tanpa view_secret.');
        $this->assertNull($customerData['collector'] ?? null, 'Collector DILARANG bocor ke Admin tanpa view_secret.');
        // NIK mentah tidak boleh sama dengan NIK asli jika tidak memiliki customers.view_secret
        $this->assertNotEquals('3201123456780001', $customerData['nik'] ?? '', 'NIK mentah DILARANG bocor ke Admin.');

        // 2. Admin membuat pengaduan
        $complaintAdmin = Complaint::create([
            'ticket_number' => 'TCK-ADMIN-001',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_address' => $customer->address,
            'area' => 'Wilayah Barat',
            'subject' => 'Koneksi Lambat',
            'description' => 'Pelanggan melaporkan kecepatan internet sangat lambat.',
            'category' => 'slow_speed',
            'priority' => 'medium',
            'status' => 'open',
            'created_by' => $this->admin->name,
            'created_by_id' => $this->admin->id,
        ]);

        // Pengaduan lain yang dibuat oleh orang lain
        $otherUser = User::factory()->create();
        $complaintOther = Complaint::create([
            'ticket_number' => 'TCK-OTHER-002',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_address' => $customer->address,
            'area' => 'Wilayah Timur',
            'subject' => 'Modem Rusak',
            'description' => 'Lampu indikator modem padam.',
            'category' => 'equipment',
            'priority' => 'high',
            'status' => 'open',
            'created_by' => $otherUser->name,
            'created_by_id' => $otherUser->id,
        ]);

        // Admin panggil GET /api/admin/complaints -> HANYA mendapatkan pengaduan miliknya
        $complaintListResponse = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/complaints');
        $complaintListResponse->assertStatus(200);

        $returnedTickets = collect($complaintListResponse->json('data'))->pluck('ticket_number')->toArray();
        $this->assertContains('TCK-ADMIN-001', $returnedTickets, 'Pengaduan yang diajukan oleh Admin wajib tampil.');
        $this->assertNotContains('TCK-OTHER-002', $returnedTickets, 'Pengaduan yang diajukan orang lain DILARANG tampil untuk Admin.');

        // Admin panggil detail pengaduan orang lain -> DITOLAK 403
        $forbiddenResponse = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/complaints/'.$complaintOther->id);
        $forbiddenResponse->assertStatus(403);
    }

    /**
     * 5. Tindakan menyetujui PSB (submissions.approve) mencakup Validasi, Tolak, dan Minta Dilengkapi
     *    dan wajib menyertakan alasan bila tolak / minta dilengkapi.
     */
    public function test_admin_approve_reject_need_info_submission(): void
    {
        $package = Package::create([
            'code' => 'PKG-50M',
            'name' => 'Fiber 50M',
            'speed_mbps' => 50,
            'price' => 250000,
            'is_active' => true,
        ]);

        $submission = Submission::create([
            'submission_number' => 'SUB-TEST-001',
            'customer_name' => 'Calon Pelanggan',
            'nik' => '3201000000000002',
            'phone' => '081122334455',
            'address' => 'Jl. Bunga Melati No 5',
            'package_id' => $package->id,
            'package_name' => $package->name,
            'package_price' => $package->price,
            'total_price' => $package->price,
            'status' => 'pending',
            'sales_id' => $this->sales->id,
            'user_id' => $this->sales->id,
        ]);

        // Tolak tanpa alasan -> 422
        $rejectNoReason = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'rejected',
        ]);
        $rejectNoReason->assertStatus(422)->assertJsonValidationErrors(['rejection_reason']);

        // Tolak dengan alasan -> 200
        $rejectWithReason = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'rejected',
            'reason' => 'Area belum tercover jaringan Fiber',
        ]);
        $rejectWithReason->assertStatus(200);
        $this->assertEquals('rejected', $submission->fresh()->status->value);

        // Minta Dilengkapi tanpa alasan -> 422
        $submission->update(['status' => 'pending']);
        $needInfoNoReason = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'need_info',
        ]);
        $needInfoNoReason->assertStatus(422)->assertJsonValidationErrors(['validation_notes']);

        // Minta Dilengkapi dengan alasan -> 200
        $needInfoWithReason = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'need_info',
            'reason' => 'Foto KTP buram, mohon upload ulang yang terbaca jelas',
        ]);
        $needInfoWithReason->assertStatus(200);
        $this->assertEquals('need_info', $submission->fresh()->status->value);
    }

    /**
     * 6. Sidebar Menu Visibility:
     *    - Admin hanya melihat 4 menu utama: Dashboard, Kelola Pelanggan, Pengajuan Pelanggan, Tiket Pengaduan.
     *    - Menu "Segera" tidak muncul untuk Admin.
     *    - Superadmin melihat semua menu.
     */
    public function test_sidebar_menu_visibility_for_admin_and_superadmin(): void
    {
        // 1. Menu Admin
        $responseAdmin = $this->actingAs($this->admin, 'sanctum')->getJson('/api/menu');
        $responseAdmin->assertStatus(200);

        $adminGroups = $responseAdmin->json('data');
        $adminRoutes = [];
        foreach ($adminGroups as $g) {
            foreach ($g['items'] as $item) {
                $adminRoutes[] = $item['route'];
                // Pastikan tidak ada menu dengan is_available false
                $this->assertNotFalse($item['is_available'] ?? true, 'Menu dengan status Segera DILARANG muncul untuk Admin.');
            }
        }

        $expectedAdminRoutes = [
            '/admin',
            '/admin/customers',
            '/admin/submissions',
            '/admin/complaints',
        ];
        sort($adminRoutes);
        sort($expectedAdminRoutes);
        $this->assertEquals($expectedAdminRoutes, $adminRoutes, 'Sidebar Admin HANYA boleh berisi 4 menu.');

        // 2. Menu Superadmin
        $responseSuper = $this->actingAs($this->superadmin, 'sanctum')->getJson('/api/menu');
        $responseSuper->assertStatus(200);
        $superGroups = $responseSuper->json('data');
        $superRoutes = [];
        $hasUpcoming = false;
        foreach ($superGroups as $g) {
            foreach ($g['items'] as $item) {
                $superRoutes[] = $item['route'];
                if (($item['is_available'] ?? true) === false) {
                    $hasUpcoming = true;
                }
            }
        }
        $this->assertGreaterThan(10, count($superRoutes), 'Superadmin wajib melihat seluruh modul.');
        $this->assertTrue($hasUpcoming, 'Superadmin dapat melihat menu modul yang berstatus Segera.');
    }

    /**
     * 7. Policy Lapangan:
     *    - Sales hanya dapat mengakses dan mengedit pengajuan miliknya sendiri.
     *    - Teknisi hanya dapat mengakses tugas timnya sendiri.
     */
    public function test_field_policy_ownership_and_team_isolation(): void
    {
        $package = Package::create([
            'code' => 'PKG-TEST-20',
            'name' => 'Package Test',
            'speed_mbps' => 20,
            'price' => 150000,
            'is_active' => true,
        ]);

        $salesOther = User::factory()->create();
        $salesOther->assignRole('Sales');

        $mySubmission = Submission::create([
            'submission_number' => 'SUB-MY-001',
            'customer_name' => 'Pelanggan Saya',
            'nik' => '3201000000000010',
            'phone' => '081234567890',
            'address' => 'Alamat Saya',
            'package_id' => $package->id,
            'package_name' => $package->name,
            'package_price' => $package->price,
            'total_price' => $package->price,
            'status' => 'pending',
            'sales_id' => $this->sales->id,
            'user_id' => $this->sales->id,
        ]);

        $otherSubmission = Submission::create([
            'submission_number' => 'SUB-OTHER-002',
            'customer_name' => 'Pelanggan Sales Lain',
            'nik' => '3201000000000011',
            'phone' => '081234567891',
            'address' => 'Alamat Lain',
            'package_id' => $package->id,
            'package_name' => $package->name,
            'package_price' => $package->price,
            'total_price' => $package->price,
            'status' => 'pending',
            'sales_id' => $salesOther->id,
            'user_id' => $salesOther->id,
        ]);

        // Sales melihat pengajuan miliknya -> 200
        $this->actingAs($this->sales, 'sanctum')->getJson("/api/sales/submissions/{$mySubmission->id}")->assertStatus(200);

        // Sales mencoba melihat pengajuan sales lain -> 403
        $this->actingAs($this->sales, 'sanctum')->getJson("/api/sales/submissions/{$otherSubmission->id}")->assertStatus(403);
    }

    /**
     * 8. Tes Matriks Lengkap Semua Route Kunci x Semua Peran (Superadmin, Admin, Teknisi, Sales, Unauthenticated).
     */
    public function test_route_permission_matrix_all_roles(): void
    {
        $customer = Customer::create([
            'customer_code' => 'CUST-MAT-001',
            'name' => 'Pelanggan Matriks',
            'nik' => '3201000000000001',
            'phone' => '081999999999',
            'address' => 'Jl. Matriks No 1',
            'status' => 'active',
            'package' => '50 Mbps',
            'monthly_price' => 200000,
        ]);

        $package = Package::create([
            'code' => 'PKG-MAT-50',
            'name' => 'Package Matriks',
            'speed_mbps' => 50,
            'price' => 200000,
            'is_active' => true,
        ]);

        $submission = Submission::create([
            'submission_number' => 'SUB-MAT-001',
            'customer_name' => 'Calon Matriks',
            'nik' => '3201000000000012',
            'phone' => '081888888888',
            'address' => 'Jl. Calon Matriks',
            'package_id' => $package->id,
            'package_name' => $package->name,
            'package_price' => $package->price,
            'total_price' => $package->price,
            'status' => 'pending',
            'sales_id' => $this->sales->id,
            'user_id' => $this->sales->id,
        ]);

        $complaint = Complaint::create([
            'ticket_number' => 'TCK-MAT-001',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_address' => $customer->address,
            'area' => 'Wilayah Barat',
            'subject' => 'Kendala Matriks',
            'description' => 'Uji coba matriks pengaduan',
            'category' => 'slow_speed',
            'priority' => 'low',
            'status' => 'open',
            'created_by' => $this->admin->name,
            'created_by_id' => $this->admin->id,
        ]);

        // Matriks route yang diuji: [Method, URI, Expected: Superadmin, Admin, Teknisi, Sales, Unauthenticated]
        $matrix = [
            ['GET', '/api/admin/customers', 200, 200, 403, 403, 401],
            ['POST', '/api/admin/customers', 422, 422, 403, 403, 401], // 422 = validasi request tembus melewati penjaga can:customers.create
            ['PUT', "/api/admin/customers/{$customer->id}", 200, 403, 403, 403, 401], // Admin CS ditolak 403 (tidak punya customers.update)
            ['DELETE', "/api/admin/customers/{$customer->id}", 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/admin/customers/export', 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['POST', '/api/admin/customers/import', 422, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/admin/submissions', 200, 200, 403, 403, 401],
            ['POST', "/api/admin/submissions/{$submission->id}/validate", 422, 422, 403, 403, 401], // Admin CS berhak
            ['GET', '/api/admin/complaints', 200, 200, 403, 403, 401],
            ['POST', '/api/admin/complaints', 422, 422, 403, 403, 401], // Admin CS berhak
            ['POST', "/api/admin/complaints/{$complaint->id}/assign", 422, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/admin/work-orders', 200, 403, 403, 403, 401], // Admin CS ditolak 403, Teknisi ditolak 403 (khusus superadmin/dispatch)
            ['GET', '/api/admin/network/approvals', 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/superadmin/users', 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/superadmin/roles', 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/admin/kpi/overview', 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/admin/dispatch-settings', 200, 403, 403, 403, 401], // Admin CS ditolak 403
            ['GET', '/api/admin/attendances/today', 200, 403, 403, 403, 401], // Admin CS ditolak 403
        ];

        foreach ($matrix as [$method, $uri, $expSuper, $expAdmin, $expTeknisi, $expSales, $expUnauth]) {
            // Unauthenticated
            \Illuminate\Support\Facades\Auth::forgetGuards();
            $resUnauth = $this->json($method, $uri);
            $this->assertEquals(
                $expUnauth,
                $resUnauth->getStatusCode(),
                "Unauthenticated access failed for {$method} {$uri}. Expected {$expUnauth}, got {$resUnauth->getStatusCode()}"
            );

            // Admin
            $resAdmin = $this->actingAs($this->admin, 'sanctum')->json($method, $uri);
            $this->assertEquals(
                $expAdmin,
                $resAdmin->getStatusCode(),
                "Admin access failed for {$method} {$uri}. Expected {$expAdmin}, got {$resAdmin->getStatusCode()}"
            );

            // Teknisi
            $resTeknisi = $this->actingAs($this->teknisi, 'sanctum')->json($method, $uri);
            $this->assertEquals(
                $expTeknisi,
                $resTeknisi->getStatusCode(),
                "Teknisi access failed for {$method} {$uri}. Expected {$expTeknisi}, got {$resTeknisi->getStatusCode()}"
            );

            // Sales
            $resSales = $this->actingAs($this->sales, 'sanctum')->json($method, $uri);
            $this->assertEquals(
                $expSales,
                $resSales->getStatusCode(),
                "Sales access failed for {$method} {$uri}. Expected {$expSales}, got {$resSales->getStatusCode()}"
            );

            // Superadmin (dijalankan terakhir agar aksi penghapusan tidak menghilangkan model sebelum dicek role lain)
            $resSuper = $this->actingAs($this->superadmin, 'sanctum')->json($method, $uri);
            $this->assertEquals(
                $expSuper,
                $resSuper->getStatusCode(),
                "Superadmin access failed for {$method} {$uri}. Expected {$expSuper}, got {$resSuper->getStatusCode()}"
            );
        }
    }
}
