<?php

namespace Tests\Feature\Sla;

use App\Enums\ComplaintPriority;
use App\Enums\ComplaintStatus;
use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\Holiday;
use App\Models\OfficeLocation;
use App\Models\PauseReason;
use App\Models\RoundRobinPointer;
use App\Models\SlaSetting;
use App\Models\Team;
use App\Models\User;
use App\Services\ComplaintSlaService;
use App\Services\SlaOperatingHoursService;
use App\Services\TeamDispatchService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SlaAndDispatchEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $superadmin;
    protected User $technician;
    protected Team $teamA;
    protected Team $teamB;
    protected SlaOperatingHoursService $operatingHoursService;
    protected ComplaintSlaService $slaService;
    protected TeamDispatchService $dispatchService;

    protected function setUp(): void
    {
        parent::setUp();

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder'])->run();
        $this->artisan('db:seed', ['--class' => 'OperationSeeder'])->run();

        $this->operatingHoursService = app(SlaOperatingHoursService::class);
        $this->slaService = app(ComplaintSlaService::class);
        $this->dispatchService = app(TeamDispatchService::class);

        // Superadmin
        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin Sla',
            'email' => 'superadmin.sla@fibermedia.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        // Admin
        $this->admin = User::factory()->create([
            'name' => 'Admin Sla',
            'email' => 'admin.sla@fibermedia.id',
            'status' => 'active',
        ]);
        $this->admin->assignRole('Admin');

        // Teknisi 1 (Tim Alpha)
        $this->technician = User::factory()->create([
            'name' => 'Teknisi Alpha',
            'email' => 'tech.alpha@fibermedia.id',
            'status' => 'active',
        ]);
        $this->technician->assignRole('Teknisi');

        // Teams
        $this->teamA = Team::create([
            'name' => 'Tim Alpha',
            'order_index' => 1,
            'is_active' => true,
        ]);
        $this->teamA->users()->attach($this->technician->id, ['joined_at' => now()]);

        $techB = User::factory()->create([
            'name' => 'Teknisi Bravo',
            'email' => 'tech.bravo@fibermedia.id',
            'status' => 'active',
        ]);
        $techB->assignRole('Teknisi');

        $this->teamB = Team::create([
            'name' => 'Tim Bravo',
            'order_index' => 2,
            'is_active' => true,
        ]);
        $this->teamB->users()->attach($techB->id, ['joined_at' => now()]);
    }

    /**
     * Test 1: Sesuai contoh persis di PRD Final v1.2 Bab 3:
     * Penugasan Sabtu 18.00 dengan durasi 24 jam operasional (1.440 menit)
     * - Sabtu: 2 jam operasional terpakai (18.00 - 20.00)
     * - Minggu: 0 jam (libur dilompati)
     * - Senin: 12 jam operasional terpakai (08.00 - 20.00)
     * - Sisa 10 jam jatuh tepat Selasa 18.00 WIB
     */
    public function test_operating_window_saturday_evening_due_tuesday_evening()
    {
        $sat = Carbon::parse('2026-11-07 18:00:00', SlaOperatingHoursService::TIMEZONE);
        $due = $this->operatingHoursService->addOperatingMinutes($sat, 1440);

        $this->assertEquals('2026-11-10 18:00:00', $due->format('Y-m-d H:i:s'));
        $this->assertEquals('Tuesday', $due->format('l'));
    }

    /**
     * Test 2: Jika hari Senin adalah hari libur nasional di tabel holidays,
     * jadwal melompati hari Senin dan target jatuh hari Rabu 18.00 WIB.
     */
    public function test_operating_window_skips_national_holidays()
    {
        Holiday::create([
            'name' => 'Hari Libur Nasional Uji',
            'holiday_date' => '2026-11-09', // Senin
        ]);

        $sat = Carbon::parse('2026-11-07 18:00:00', SlaOperatingHoursService::TIMEZONE);
        $due = $this->operatingHoursService->addOperatingMinutes($sat, 1440);

        $this->assertEquals('2026-11-11 18:00:00', $due->format('Y-m-d H:i:s'));
        $this->assertEquals('Wednesday', $due->format('l'));
    }

    /**
     * Test 3: Tiket yang masuk pukul 21.00 WIB dinormalisasi mulai dihitung pukul 08.00 WIB hari kerja berikutnya.
     */
    public function test_ticket_assigned_after_hours_starts_next_operating_morning()
    {
        $night = Carbon::parse('2026-11-09 21:30:00', SlaOperatingHoursService::TIMEZONE); // Senin 21:30
        $normalized = $this->operatingHoursService->normalizeToNextOperatingStart($night);

        $this->assertEquals('2026-11-10 08:00:00', $normalized->format('Y-m-d H:i:s'));
        $this->assertEquals('Tuesday', $normalized->format('l'));
    }

    /**
     * Test 4: Response SLA pengaduan adalah 2 jam operasional (120 menit)
     * dan SLA penyelesaian disalin dari sla_settings (Kritis 3 jam / 180m, Tinggi 6 jam / 360m).
     */
    public function test_complaint_sla_timers_copied_from_settings()
    {
        $morning = Carbon::parse('2026-11-09 09:00:00', SlaOperatingHoursService::TIMEZONE); // Senin 09.00
        Carbon::setTestNow($morning);

        $complaint = Complaint::create([
            'ticket_number' => 'COMP-SLA-001',
            'customer_name' => 'Budi Santoso',
            'customer_phone' => '081234567890',
            'customer_address' => 'Jl. Merdeka No. 10',
            'area' => 'Kepanjen',
            'category' => 'no_signal',
            'subject' => 'Internet Mati Total',
            'description' => 'Lampu LOS merah berkedip',
            'priority' => 'critical',
            'created_by_id' => $this->admin->id,
            'status' => 'open',
        ]);

        $this->slaService->setTimers($complaint);

        $this->assertEquals(180, $complaint->sla_target_minutes);
        // Response SLA: 09:00 + 2 jam operasional = 11:00 WIB
        $this->assertEquals('2026-11-09 11:00:00', $complaint->sla_response_due_at->format('Y-m-d H:i:s'));
        // Resolve SLA: 09:00 + 3 jam operasional = 12:00 WIB
        $this->assertEquals('2026-11-09 12:00:00', $complaint->sla_resolve_due_at->format('Y-m-d H:i:s'));
        $this->assertFalse($complaint->is_sla_breached);
    }

    /**
     * Test 5: Pause SLA hanya bisa dilakukan Admin/NOC dengan salah satu 5 alasan baku,
     * dan saat di-resume, deadline SLA dimundurkan sesuai durasi operasional jeda.
     */
    public function test_pause_and_resume_sla_with_standard_reason()
    {
        $start = Carbon::parse('2026-11-09 10:00:00', SlaOperatingHoursService::TIMEZONE);
        Carbon::setTestNow($start);

        $complaint = Complaint::create([
            'ticket_number' => 'COMP-PAUSE-001',
            'customer_name' => 'Iwan Fals',
            'customer_phone' => '081234567899',
            'customer_address' => 'Jl. Sudirman 45',
            'area' => 'Singosari',
            'category' => 'no_signal',
            'subject' => 'Kabel Drop Putus',
            'description' => 'Kabel tersangkut truk',
            'priority' => 'high', // 6 jam operasional (360m) -> due at 16:00
            'created_by_id' => $this->admin->id,
            'status' => 'assigned',
            'assigned_at' => $start,
        ]);
        $this->slaService->setTimers($complaint);

        $originalDue = $complaint->sla_resolve_due_at->copy();
        $this->assertEquals('2026-11-09 16:00:00', $originalDue->format('Y-m-d H:i:s'));

        // Pause oleh Admin pukul 11:00 (1 jam berjalan) dengan alasan baku
        $pauseTime = Carbon::parse('2026-11-09 11:00:00', SlaOperatingHoursService::TIMEZONE);
        Carbon::setTestNow($pauseTime);

        $reason = PauseReason::first(); // e.g. Hujan Lebat / Akses Ditolak
        $response = $this->actingAs($this->admin)->postJson("/api/complaints/{$complaint->id}/pause", [
            'pause_reason_id' => $reason->id,
            'notes' => 'Hujan badai petir di lokasi pelanggan',
            'latitude' => -8.1132,
            'longitude' => 112.6415,
        ]);
        $response->assertStatus(200);

        $complaint->refresh();
        $this->assertEquals(ComplaintStatus::PENDING_CUSTOMER, $complaint->status);
        $this->assertNotNull($complaint->sla_paused_at);

        // Resume 2 jam kemudian pada pukul 13:00 (jeda selama 2 jam operasional)
        $resumeTime = Carbon::parse('2026-11-09 13:00:00', SlaOperatingHoursService::TIMEZONE);
        Carbon::setTestNow($resumeTime);

        $resumeRes = $this->actingAs($this->admin)->postJson("/api/complaints/{$complaint->id}/resume");
        $resumeRes->assertStatus(200);

        $complaint->refresh();
        $this->assertEquals(ComplaintStatus::IN_PROGRESS, $complaint->status);
        $this->assertNull($complaint->sla_paused_at);

        // Batas waktu SLA harus dimundurkan 2 jam dari 16:00 menjadi 18:00 WIB
        $this->assertEquals('2026-11-09 18:00:00', $complaint->sla_resolve_due_at->format('Y-m-d H:i:s'));
    }

    /**
     * Test 6: Teknisi dilarang melakukan pause tiket (hanya Admin/NOC yang diizinkan).
     */
    public function test_technician_cannot_pause_sla()
    {
        $complaint = Complaint::create([
            'ticket_number' => 'COMP-FORBIDDEN-001',
            'customer_name' => 'Siti Aminah',
            'customer_phone' => '081299998888',
            'customer_address' => 'Jl. Veteran 1',
            'area' => 'Kepanjen',
            'category' => 'no_signal',
            'subject' => 'LOS',
            'description' => 'LOS Merah',
            'priority' => 'critical',
            'created_by_id' => $this->admin->id,
            'status' => 'in_progress',
        ]);

        $reason = PauseReason::first();
        $response = $this->actingAs($this->technician)->postJson("/api/complaints/{$complaint->id}/pause", [
            'pause_reason_id' => $reason->id,
            'notes' => 'Teknisi mencoba jeda sendiri',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 7: Reopen tiket maksimal 3 x 24 jam (72 jam kalender) sejak selesai.
     * Jika <= 72 jam: berhasil dan SLA dihitung ulang dari awal.
     * Jika > 72 jam: ditolak HTTP 422.
     */
    public function test_reopen_ticket_window_and_sla_recalculation()
    {
        $closedAt = Carbon::parse('2026-11-09 10:00:00', SlaOperatingHoursService::TIMEZONE);
        Carbon::setTestNow($closedAt);

        $complaint = Complaint::create([
            'ticket_number' => 'COMP-REOPEN-001',
            'customer_name' => 'Pak Joko',
            'customer_phone' => '081333444555',
            'customer_address' => 'Jl. Kaliurang No. 5',
            'area' => 'Lowokwaru',
            'category' => 'no_signal',
            'subject' => 'LOS',
            'description' => 'Selesai disambung',
            'priority' => 'medium',
            'created_by_id' => $this->admin->id,
            'status' => 'closed',
            'closed_at' => $closedAt,
        ]);

        // 1. Reopen dalam 48 jam (masih dalam batas 72 jam) -> SUKSES
        $reopenTime = $closedAt->copy()->addHours(48); // Rabu 10:00
        Carbon::setTestNow($reopenTime);

        $responseSuccess = $this->actingAs($this->admin)->postJson("/api/complaints/{$complaint->id}/reopen", [
            'reason' => 'Pelanggan melaporkan koneksi kembali putus',
            'priority' => 'critical', // Dinaikkan ke kritis (180 menit operasional)
        ]);
        $responseSuccess->assertStatus(200);

        $complaint->refresh();
        $this->assertEquals(ComplaintStatus::REOPENED, $complaint->status);
        $this->assertEquals(1, $complaint->reopen_count);
        $this->assertEquals(ComplaintPriority::CRITICAL, $complaint->priority);
        $this->assertEquals(180, $complaint->sla_target_minutes);
        // SLA baru dihitung dari Rabu 10:00 + 3 jam operasional = Rabu 13:00 WIB
        $this->assertEquals('2026-11-11 13:00:00', $complaint->sla_resolve_due_at->format('Y-m-d H:i:s'));

        // 2. Jika tiket selesai ditutup kembali, dan dicoba reopen setelah 73 jam -> DITOLAK 422
        $complaint->update(['status' => 'closed', 'closed_at' => Carbon::now()]);

        $tooLate = Carbon::now()->addHours(73);
        Carbon::setTestNow($tooLate);

        $responseFail = $this->actingAs($this->admin)->postJson("/api/complaints/{$complaint->id}/reopen", [
            'reason' => 'Mencoba buka kembali setelah 73 jam',
        ]);
        $responseFail->assertStatus(422);
    }

    /**
     * Test 8: Round-robin dispatch hanya memilih tim yang berstatus SIAP
     * (teknisi hadir kantor hari ini) dan tim memegang maksimal 1 tiket aktif pada satu waktu (FIFO).
     */
    public function test_round_robin_dispatch_respects_attendance_readiness_and_single_active_ticket()
    {
        $today = Carbon::today()->toDateString();
        $office = OfficeLocation::create([
            'name' => 'Kantor Pusat Malang',
            'latitude' => -7.9826,
            'longitude' => 112.6308,
            'radius_meters' => 50,
            'valid_wifi_ips' => ['192.168.1.100'],
            'is_active' => true,
        ]);

        // Anggap Teknisi Tim Alpha hadir sah di kantor hari ini
        DailyAttendance::create([
            'user_id' => $this->technician->id,
            'work_date' => $today,
            'track' => 'office',
            'status' => 'hadir',
            'check_in_at' => now()->setTime(7, 50),
            'check_in_lat' => -7.9826,
            'check_in_lng' => 112.6308,
            'office_id' => $office->id,
            'office_distance_meters' => 5,
        ]);

        // Teknisi Tim Bravo BELUM hadir (tidak absen) -> Tim Bravo BELUM SIAP

        // Tiket 1 dibuat
        $complaint1 = Complaint::create([
            'ticket_number' => 'COMP-DISPATCH-001',
            'customer_name' => 'Pelanggan 1',
            'customer_phone' => '081234567801',
            'customer_address' => 'Alamat 1',
            'area' => 'Malang',
            'category' => 'no_signal',
            'subject' => 'Komplain 1',
            'description' => 'LOS 1',
            'priority' => 'critical',
            'created_by_id' => $this->admin->id,
            'status' => 'open',
        ]);

        // Jalankan dispatch round-robin untuk Tiket 1
        $result1 = $this->dispatchService->assign($complaint1, 'complaint');
        $this->assertTrue($result1['assigned']);
        $complaint1->refresh();
        $this->assertEquals($this->teamA->id, $complaint1->assigned_team_id);
        $this->assertEquals('assigned', $complaint1->status->value);

        // Sekarang Tim Alpha sedang memegang 1 tiket aktif.
        // Jika tiket 2 masuk, dan Tim Bravo belum hadir (belum siap), tiket 2 harus antre unassigned (tidak menumpuk ke Alpha).
        $complaint2 = Complaint::create([
            'ticket_number' => 'COMP-DISPATCH-002',
            'customer_name' => 'Pelanggan 2',
            'customer_phone' => '081234567802',
            'customer_address' => 'Alamat 2',
            'area' => 'Malang',
            'category' => 'slow_speed',
            'subject' => 'Komplain 2',
            'description' => 'Lambat 2',
            'priority' => 'high',
            'created_by_id' => $this->admin->id,
            'status' => 'open',
        ]);

        $result2 = $this->dispatchService->assign($complaint2, 'complaint');
        // Karena Tim Alpha sudah sibuk dan Tim Bravo belum hadir, tiket 2 tidak ditugaskan (antre)
        $this->assertFalse($result2['assigned']);
        $complaint2->refresh();
        $this->assertNull($complaint2->assigned_team_id);
    }
}
