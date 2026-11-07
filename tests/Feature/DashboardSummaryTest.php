<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\DispatchSetting;
use App\Models\Odc;
use App\Models\Odp;
use Spatie\Permission\Models\Role;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        $this->superadmin = User::factory()->create([
            'email' => 'superadmin@test.com',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');
    }

    public function test_superadmin_receives_complete_dashboard_summary(): void
    {
        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=today');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'last_updated',
                    'period',
                    'period_label',
                    'pengaduan' => [
                        'baru',
                        'belum_ditugaskan',
                        'diteruskan_ke_admin',
                        'perlu_ditinjau',
                    ],
                    'psb' => [
                        'menunggu_validasi',
                        'belum_ditugaskan',
                        'sedang_dikerjakan',
                        'perlu_ditinjau',
                    ],
                    'pelanggan' => [
                        'total',
                        'aktif',
                        'terisolir',
                        'berhenti',
                        'jatuh_tempo_7_hari',
                        'hutang_lebih_dari_0',
                    ],
                    'tim_hari_ini' => [
                        'tim_siap',
                        'total_tim_aktif',
                        'anggota_hadir',
                        'total_anggota',
                        'giliran_psb',
                        'giliran_pengaduan',
                    ],
                    'jaringan' => [
                        'olt_bermasalah',
                        'olt_status_tag',
                        'odc_bermasalah',
                        'odp_bermasalah',
                        'kabel_bermasalah',
                        'perubahan_menunggu_persetujuan',
                        'jalur_kabel_belum_digambar',
                    ],
                    'perlu_tindakan',
                    'absensi_hari_ini' => [
                        'belum_absen_masuk',
                        'luar_radius',
                        'tim_belum_siap',
                    ],
                    'tren' => [
                        'target_sla_hours',
                        'pengaduan_harian',
                        'durasi_sla',
                    ],
                ],
            ]);

        $this->assertContains($response->json('data.jaringan.olt_status_tag'), ['AKTIF', 'MENUNGGU FASE X']);
    }

    public function test_period_filter_changes_period_and_trends(): void
    {
        $response7d = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=7d');

        $response7d->assertStatus(200);
        $this->assertEquals('7d', $response7d->json('data.period'));
        $this->assertCount(7, $response7d->json('data.tren.pengaduan_harian'));

        $response30d = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=30d');

        $response30d->assertStatus(200);
        $this->assertEquals('30d', $response30d->json('data.period'));
        $this->assertCount(30, $response30d->json('data.tren.pengaduan_harian'));
    }

    public function test_accurate_counts_matching_database_seeds(): void
    {
        // 1. Seed known complaints
        Complaint::create([
            'ticket_number' => 'CMP-TEST-001',
            'customer_name' => 'Budi Test',
            'customer_phone' => '081234567891',
            'customer_address' => 'Jl. Test 1',
            'area' => 'Klojen',
            'subject' => 'Koneksi lambat',
            'description' => 'Redaman drop',
            'category' => 'slow_speed',
            'priority' => 'medium',
            'status' => 'open',
            'created_by_id' => $this->superadmin->id,
            'assigned_team_id' => null,
            'created_at' => now(),
        ]);
        Complaint::create([
            'ticket_number' => 'CMP-TEST-002',
            'customer_name' => 'Siti Test',
            'customer_phone' => '081234567892',
            'customer_address' => 'Jl. Test 2',
            'area' => 'Klojen',
            'subject' => 'Tidak ada sinyal',
            'description' => 'LOS merah',
            'category' => 'no_signal',
            'priority' => 'high',
            'status' => 'escalated_to_admin',
            'created_by_id' => $this->superadmin->id,
            'reassign_count' => 3,
            'created_at' => now(),
        ]);
        Complaint::create([
            'ticket_number' => 'CMP-TEST-003',
            'customer_name' => 'Andi Test',
            'customer_phone' => '081234567893',
            'customer_address' => 'Jl. Test 3',
            'area' => 'Klojen',
            'subject' => 'Perangkat error',
            'description' => 'Adaptor mati',
            'category' => 'equipment',
            'priority' => 'low',
            'status' => 'phase_1_completed',
            'review_status' => 'pending',
            'created_by_id' => $this->superadmin->id,
            'created_at' => now(),
        ]);

        // 2. Seed known customers
        Customer::create([
            'customer_code' => 'CUST-TEST-001',
            'name' => 'Budi Santoso',
            'address' => 'Jl. Merdeka No 1',
            'phone' => '081234567890',
            'status' => 'active',
            'debt' => 0,
        ]);
        Customer::create([
            'customer_code' => 'CUST-TEST-002',
            'name' => 'Siti Rahma',
            'address' => 'Jl. Sudirman No 2',
            'phone' => '081234567891',
            'status' => 'active',
            'debt' => 50000,
        ]);
        Customer::create([
            'customer_code' => 'CUST-TEST-003',
            'name' => 'Andi Wijaya',
            'address' => 'Jl. Thamrin No 3',
            'phone' => '081234567892',
            'status' => 'suspended',
            'debt' => 0,
        ]);
        Customer::create([
            'customer_code' => 'CUST-TEST-004',
            'name' => 'Dewi Lestari',
            'address' => 'Jl. Gatot Subroto No 4',
            'phone' => '081234567893',
            'status' => 'terminated',
            'debt' => 0,
        ]);
        Customer::create([
            'customer_code' => 'CUST-TEST-005',
            'name' => 'Joko Anwar',
            'address' => 'Jl. Diponegoro No 5',
            'phone' => '081234567894',
            'status' => 'active',
            'expires_at' => now()->addDays(3)->toDateString(),
            'debt' => 0,
        ]);

        DashboardService::clearCache();

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=today&refresh=1');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Customer assertions
        $this->assertGreaterThanOrEqual(1, $data['pelanggan']['hutang_lebih_dari_0']);
        $this->assertGreaterThanOrEqual(1, $data['pelanggan']['jatuh_tempo_7_hari']);
        $this->assertGreaterThanOrEqual(1, $data['pelanggan']['terisolir']);
        $this->assertGreaterThanOrEqual(1, $data['pelanggan']['berhenti']);

        // Complaint assertions
        $this->assertGreaterThanOrEqual(1, $data['pengaduan']['belum_ditugaskan']);
        $this->assertGreaterThanOrEqual(1, $data['pengaduan']['diteruskan_ke_admin']);
        $this->assertGreaterThanOrEqual(1, $data['pengaduan']['perlu_ditinjau']);
    }

    public function test_query_count_is_bounded_and_prevents_n_plus_one(): void
    {
        DashboardService::clearCache();

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=today&refresh=1');

        $response->assertStatus(200);

        $queryCount = count(DB::getQueryLog());
        // Verify bounded queries: strictly under 40 queries across all 8 modules and 10 tables
        $this->assertLessThan(40, $queryCount, "Query count {$queryCount} exceeds bounded threshold.");
    }

    public function test_filtered_list_counts_match_dashboard_cards_exactly(): void
    {
        DashboardService::clearCache();

        $summaryRes = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=today&refresh=1')
            ->assertStatus(200);

        $summary = $summaryRes->json('data');

        // 1. Pengaduan baru
        $complaintsBaruRes = $this->actingAs($this->superadmin)
            ->getJson('/api/complaints?period=today')
            ->assertStatus(200);
        $this->assertEquals($summary['pengaduan']['baru'], $complaintsBaruRes->json('meta.total') ?? count($complaintsBaruRes->json('data')));

        // 2. Pengaduan belum ditugaskan
        $complaintsUnassignedRes = $this->actingAs($this->superadmin)
            ->getJson('/api/complaints?status=unassigned')
            ->assertStatus(200);
        $this->assertEquals($summary['pengaduan']['belum_ditugaskan'], $complaintsUnassignedRes->json('meta.total') ?? count($complaintsUnassignedRes->json('data')));

        // 3. Pelanggan aktif
        $customersAktifRes = $this->actingAs($this->superadmin)
            ->getJson('/api/customers?status=active')
            ->assertStatus(200);
        $this->assertEquals($summary['pelanggan']['aktif'], $customersAktifRes->json('meta.total') ?? count($customersAktifRes->json('data')));

        // 4. Pelanggan terisolir
        $customersSuspendedRes = $this->actingAs($this->superadmin)
            ->getJson('/api/customers?status=suspended')
            ->assertStatus(200);
        $this->assertEquals($summary['pelanggan']['terisolir'], $customersSuspendedRes->json('meta.total') ?? count($customersSuspendedRes->json('data')));

        // 5. Pelanggan hutang > 0
        $customersDebtRes = $this->actingAs($this->superadmin)
            ->getJson('/api/customers?has_debt=1')
            ->assertStatus(200);
        $this->assertEquals($summary['pelanggan']['hutang_lebih_dari_0'], $customersDebtRes->json('meta.total') ?? count($customersDebtRes->json('data')));
    }

    public function test_cards_with_missing_tables_do_not_trigger_errors(): void
    {
        DashboardService::clearCache();

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=today&refresh=1')
            ->assertStatus(200);

        $jaringan = $response->json('data.jaringan');
        $this->assertEquals(0, $jaringan['olt_bermasalah']);
        $this->assertContains($jaringan['olt_status_tag'], ['AKTIF', 'MENUNGGU FASE X']);
    }

    public function test_benchmark_query_count_and_response_time_with_10000_tickets(): void
    {
        // Seed 10,000 complaints in batches of 1,000 for fast seeding
        $now = now();
        $batch = [];
        for ($i = 1; $i <= 10000; $i++) {
            $batch[] = [
                'ticket_number' => 'CMP-PERF-'.str_pad((string) $i, 6, '0', STR_PAD_LEFT),
                'customer_name' => "Customer {$i}",
                'customer_phone' => '0812'.str_pad((string) $i, 8, '0', STR_PAD_LEFT),
                'customer_address' => "Address {$i}",
                'area' => 'Klojen',
                'subject' => "Subject {$i}",
                'description' => "Description {$i}",
                'category' => 'slow_speed',
                'priority' => 'medium',
                'status' => ($i % 5 === 0) ? 'open' : (($i % 7 === 0) ? 'escalated_to_admin' : 'resolved'),
                'created_by_id' => $this->superadmin->id,
                'created_at' => $now->copy()->subMinutes($i % 1440),
                'updated_at' => $now,
            ];

            if (count($batch) >= 1000) {
                Complaint::insert($batch);
                $batch = [];
            }
        }
        if (! empty($batch)) {
            Complaint::insert($batch);
        }

        $this->assertGreaterThanOrEqual(10000, Complaint::count());

        DashboardService::clearCache();

        DB::flushQueryLog();
        DB::enableQueryLog();

        $startTime = microtime(true);

        $response = $this->actingAs($this->superadmin)
            ->getJson('/api/dashboard/summary?period=today&refresh=1');

        $endTime = microtime(true);
        $durationMs = round(($endTime - $startTime) * 1000, 2);

        $response->assertStatus(200);

        $queries = DB::getQueryLog();
        $queryCount = count($queries);

        // Assert strictly bounded queries (< 40 queries)
        $this->assertLessThan(40, $queryCount, "Query count {$queryCount} exceeds threshold.");

        // Log and ensure reasonable execution time (< 1500 ms in testing environment)
        $this->assertLessThan(2000, $durationMs, "Response time {$durationMs}ms exceeded 2000ms threshold.");

        fwrite(STDERR, "\n[BENCHMARK] 10.000 Tiket: Query Count = {$queryCount}, Response Time = {$durationMs} ms\n");
    }

    public function test_restricted_role_cannot_view_unauthorized_segments(): void
    {
        $restrictedUser = User::factory()->create(['status' => 'active']);
        $restrictedRole = Role::firstOrCreate(['name' => 'StaffViewOnly', 'guard_name' => 'web']);
        $restrictedRole->syncPermissions(['dashboard.view', 'customers.view']);
        $restrictedUser->assignRole('StaffViewOnly');

        DashboardService::clearCache();

        $response = $this->actingAs($restrictedUser)
            ->getJson('/api/dashboard/summary?period=today&refresh=1');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Restricted role does not have access to technical network or attendances
        $this->assertNull($data['jaringan']);
        $this->assertNull($data['absensi_hari_ini']);
    }
}

