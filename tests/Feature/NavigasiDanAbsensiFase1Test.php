<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\Submission;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\AttendanceRecapService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NavigasiDanAbsensiFase1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles & permissions
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
    }

    public function test_superadmin_sees_all_menus_of_existing_modules()
    {
        $superadmin = User::factory()->create([
            'email' => 'superadmin@test.com',
            'status' => 'active',
        ]);
        $superadmin->assignRole('Superadmin');

        Sanctum::actingAs($superadmin);

        $response = $this->getJson('/api/menu');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $groups = collect($response->json('data'))->pluck('group')->all();

        // Pastikan kelompok-kelompok menu standar muncul
        $this->assertContains('Dashboard', $groups);
        $this->assertContains('Pelanggan', $groups);
        $this->assertContains('Operasional', $groups);
        $this->assertContains('Jaringan', $groups);
        $this->assertContains('Tim & Absensi', $groups);
        $this->assertContains('KPI', $groups);
        $this->assertContains('Produk & Penjualan', $groups);
        $this->assertContains('Pengaturan', $groups);

        // Kumpulkan semua rute item
        $routes = collect($response->json('data'))
            ->pluck('items')
            ->flatten(1)
            ->pluck('route')
            ->all();

        $this->assertContains('/dashboard', $routes);
        $this->assertContains('/admin/customers', $routes);
        $this->assertContains('/admin/complaints', $routes);
        $this->assertContains('/admin/attendances/daily', $routes);
        $this->assertContains('/admin/attendances/recap', $routes);
        $this->assertContains('/superadmin/teams', $routes);
        $this->assertContains('/superadmin/users', $routes);
    }

    public function test_unpermitted_user_cannot_see_restricted_menus_and_routes_are_rejected_with_403()
    {
        // User Teknisi tanpa izin manajerial
        $teknisi = User::factory()->create([
            'email' => 'teknisi@test.com',
            'status' => 'active',
        ]);
        $teknisi->assignRole('Teknisi');

        Sanctum::actingAs($teknisi);

        // 1. Menu pohon yang terlihat oleh Teknisi tidak boleh berisi menu superadmin/pengaturan user
        $menuResponse = $this->getJson('/api/menu');
        $menuResponse->assertStatus(200);

        $routes = collect($menuResponse->json('data'))
            ->pluck('items')
            ->flatten(1)
            ->pluck('route')
            ->all();

        $this->assertNotContains('/superadmin/users', $routes);
        $this->assertNotContains('/superadmin/audit-logs', $routes);
        $this->assertNotContains('/admin/dispatch-settings', $routes);

        // 2. Akses rute admin/superadmin langsung harus ditolak (403)
        $unauthorizedResponse = $this->getJson('/api/superadmin/users');
        $unauthorizedResponse->assertStatus(403);
    }

    private function createComplaint(string $status, string $number): Complaint
    {
        $creator = User::factory()->create(['status' => 'active']);

        return Complaint::create([
            'ticket_number' => $number,
            'created_by_id' => $creator->id,
            'customer_name' => 'Pelanggan Gangguan Test',
            'customer_phone' => '08123456789',
            'customer_address' => 'Jl. Merdeka No 1',
            'area' => 'Wilayah Barat',
            'subject' => 'Internet Mati Total',
            'description' => 'Lampu indikator modem LOS merah',
            'category' => 'no_signal',
            'status' => $status,
        ]);
    }

    public function test_badge_endpoint_does_not_leak_numbers_without_permission()
    {
        // Buat data uji
        $this->createComplaint('open', 'TCK-TEST-001');
        $this->createComplaint('assigned', 'TCK-TEST-002');

        Submission::factory()->create([
            'status' => 'pending',
            'customer_name' => 'Andi Wijaya',
        ]);
        Submission::factory()->create([
            'status' => 'pending',
            'customer_name' => 'Rina Marlina',
        ]);

        // 1. User Teknisi (tidak punya izin manage_complaints atau view_any_submissions)
        $teknisi = User::factory()->create([
            'email' => 'teknisi2@test.com',
            'status' => 'active',
        ]);
        $teknisi->assignRole('Teknisi');

        Sanctum::actingAs($teknisi);
        $badgeResponse = $this->getJson('/api/menu/badges');
        $badgeResponse->assertStatus(200);

        $badgeData = $badgeResponse->json('data');
        // Angka pengaduan dan pengajuan tidak boleh bocor
        $this->assertArrayNotHasKey('open_complaints', $badgeData);
        $this->assertArrayNotHasKey('pending_submissions', $badgeData);

        // 2. Superadmin (memiliki semua akses)
        $superadmin = User::factory()->create([
            'email' => 'superadmin2@test.com',
            'status' => 'active',
        ]);
        $superadmin->assignRole('Superadmin');

        Sanctum::actingAs($superadmin);
        $saBadgeResponse = $this->getJson('/api/menu/badges');
        $saBadgeResponse->assertStatus(200);

        $saBadgeData = $saBadgeResponse->json('data');
        $this->assertArrayHasKey('open_complaints', $saBadgeData);
        $this->assertArrayHasKey('pending_submissions', $saBadgeData);
        $this->assertEquals(2, $saBadgeData['open_complaints']);
        $this->assertEquals(2, $saBadgeData['pending_submissions']);
    }

    public function test_monthly_attendance_recap_matches_manual_calculation_from_test_data()
    {
        $currentMonth = Carbon::today()->format('Y-m');

        $team = Team::create([
            'name' => 'Alpha Team',
            'order_index' => 1,
            'is_active' => true,
        ]);

        $user1 = User::factory()->create(['name' => 'Teknisi Satu', 'status' => 'active']);
        $user2 = User::factory()->create(['name' => 'Teknisi Dua', 'status' => 'active']);

        TeamMember::create(['team_id' => $team->id, 'user_id' => $user1->id, 'left_at' => null]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $user2->id, 'left_at' => null]);

        // Buat absensi bulan ini untuk User 1: 3 hadir, 1 izin, 1 sakit
        DailyAttendance::create([
            'user_id' => $user1->id,
            'work_date' => Carbon::parse($currentMonth.'-02')->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::parse($currentMonth.'-02 08:00:00'),
        ]);
        DailyAttendance::create([
            'user_id' => $user1->id,
            'work_date' => Carbon::parse($currentMonth.'-03')->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::parse($currentMonth.'-03 08:10:00'),
        ]);
        DailyAttendance::create([
            'user_id' => $user1->id,
            'work_date' => Carbon::parse($currentMonth.'-04')->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::parse($currentMonth.'-04 08:05:00'),
        ]);
        DailyAttendance::create([
            'user_id' => $user1->id,
            'work_date' => Carbon::parse($currentMonth.'-05')->toDateString(),
            'status' => 'izin',
            'note' => 'Izin keperluan keluarga',
        ]);
        DailyAttendance::create([
            'user_id' => $user1->id,
            'work_date' => Carbon::parse($currentMonth.'-06')->toDateString(),
            'status' => 'sakit',
            'note' => 'Surat dokter',
        ]);

        // Buat absensi bulan ini untuk User 2: 2 hadir, 1 alpa
        DailyAttendance::create([
            'user_id' => $user2->id,
            'work_date' => Carbon::parse($currentMonth.'-02')->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::parse($currentMonth.'-02 08:15:00'),
        ]);
        DailyAttendance::create([
            'user_id' => $user2->id,
            'work_date' => Carbon::parse($currentMonth.'-03')->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::parse($currentMonth.'-03 08:20:00'),
        ]);
        DailyAttendance::create([
            'user_id' => $user2->id,
            'work_date' => Carbon::parse($currentMonth.'-04')->toDateString(),
            'status' => 'alpa',
            'note' => 'Tanpa keterangan',
        ]);

        $recapService = app(AttendanceRecapService::class);
        $recap = $recapService->getMonthlyRecap($currentMonth, $team->id);

        $people = collect($recap['people']);
        $p1 = $people->firstWhere('user_id', $user1->id);
        $p2 = $people->firstWhere('user_id', $user2->id);

        // Verifikasi kecocokan 100% dengan hitungan manual
        $this->assertEquals(3, $p1['hadir']);
        $this->assertEquals(1, $p1['izin']);
        $this->assertEquals(1, $p1['sakit']);

        $this->assertEquals(2, $p2['hadir']);

        // Verifikasi rekap tim
        $teamRecap = collect($recap['teams'])->firstWhere('team_id', $team->id);
        $this->assertEquals(2, $teamRecap['total_members']);
        $this->assertEquals(5, $teamRecap['total_hadir']); // 3 + 2 = 5
    }

    public function test_manual_attendance_input_without_reason_is_rejected()
    {
        $admin = User::factory()->create([
            'email' => 'admin_attend@test.com',
            'status' => 'active',
        ]);
        $admin->assignRole('Admin');

        $staff = User::factory()->create(['status' => 'active']);

        Sanctum::actingAs($admin);

        // 1. Tanpa alasan (reason kosong) -> HARUS 422
        $responseFail = $this->postJson('/api/admin/attendances/manual', [
            'user_id' => $staff->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'hadir',
            'reason' => '', // Kosong
        ]);

        $responseFail->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        // 2. Alasan kurang dari 5 karakter -> HARUS 422
        $responseShort = $this->postJson('/api/admin/attendances/manual', [
            'user_id' => $staff->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'hadir',
            'reason' => 'abc', // Terlalu pendek
        ]);

        $responseShort->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        // 3. Dengan alasan valid -> 200 OK
        $responseSuccess = $this->postJson('/api/admin/attendances/manual', [
            'user_id' => $staff->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'hadir',
            'reason' => 'Dispensasi tugas mendadak di gardu transmisi',
        ]);

        $responseSuccess->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('daily_attendances', [
            'user_id' => $staff->id,
            'status' => 'hadir',
            'is_manual' => true,
            'note' => 'Dispensasi tugas mendadak di gardu transmisi',
            'set_by_id' => $admin->id,
        ]);
    }

    public function test_today_attendance_endpoint_returns_ready_teams_and_next_queue_pointers()
    {
        $admin = User::factory()->create([
            'email' => 'admin_queue@test.com',
            'status' => 'active',
        ]);
        $admin->assignRole('Admin');

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/attendances/today');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'date',
                    'attendances',
                    'team_panel' => [
                        'min_members_present',
                        'total_ready_teams',
                        'teams',
                    ],
                    'next_queue' => [
                        'psb',
                        'complaint',
                    ],
                ],
            ]);

        // Karena belum ada tim siap, next_queue harus 'belum tersedia'
        $this->assertEquals('belum tersedia', $response->json('data.next_queue.psb'));
        $this->assertEquals('belum tersedia', $response->json('data.next_queue.complaint'));
    }
}
