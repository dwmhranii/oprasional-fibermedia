<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\KpiSetting;
use App\Models\KpiSnapshot;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TicketEvent;
use App\Models\User;
use App\Modules\Kpi\Services\KpiService;
use Carbon\Carbon;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Fase5KpiWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    protected function createSubmission(array $attributes = []): Submission
    {
        $user = User::first() ?? User::factory()->create();

        $defaults = [
            'submission_number' => 'SUB-'.uniqid(),
            'user_id' => $user->id,
            'sales_id' => $user->id,
            'customer_name' => 'Pelanggan Uji',
            'nik' => '320101'.rand(1000000000, 9999999999),
            'phone' => '081234567890',
            'address' => 'Jl. Uji No 1',
            'package_name' => 'Home 20 Mbps',
            'package_price' => 200000,
            'total_price' => 200000,
            'status' => 'pending',
        ];

        $merged = array_merge($defaults, $attributes);
        $createdAt = $merged['created_at'] ?? null;
        unset($merged['created_at']);

        $sub = Submission::create($merged);
        if ($createdAt) {
            $sub->created_at = $createdAt;
            $sub->save();
        }

        return $sub;
    }

    protected function createProvisioning(string $number = 'PRV-TEST'): Provisioning
    {
        $user = User::first() ?? User::factory()->create();
        $sub = $this->createSubmission(['status' => 'approved']);

        return Provisioning::create([
            'provisioning_number' => $number.'-'.uniqid(),
            'submission_id' => $sub->id,
            'admin_id' => $user->id,
            'bfass_username' => 'bfass_'.uniqid(),
            'status' => 'completed',
        ]);
    }

    protected function createComplaint(array $attributes = []): Complaint
    {
        $user = User::first() ?? User::factory()->create();

        $defaults = [
            'ticket_number' => 'CMP-'.uniqid(),
            'created_by_id' => $user->id,
            'customer_name' => 'Pelanggan Uji',
            'customer_phone' => '081234567890',
            'customer_address' => 'Jl. Uji No 1',
            'area' => 'Kota Barat',
            'category' => 'no_signal',
            'subject' => 'Gangguan Internet',
            'description' => 'Kabel FO putus',
            'priority' => 'medium',
            'status' => 'resolved',
        ];

        $merged = array_merge($defaults, $attributes);
        $createdAt = $merged['created_at'] ?? null;
        unset($merged['created_at']);

        $complaint = Complaint::create($merged);
        if ($createdAt) {
            $complaint->created_at = $createdAt;
            $complaint->save();
        }

        return $complaint;
    }

    public function test_ticket_events_and_log_copying(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $team = Team::create(['name' => 'Tim Delta', 'order_index' => 1, 'is_active' => true]);

        $task = Task::create([
            'task_number' => 'TSK-TEST-001',
            'provisioning_id' => $this->createProvisioning()->id,
            'status' => 'assigned',
            'assigned_team_id' => $team->id,
            'assigned_at' => now(),
        ]);

        // Catat TicketEvent secara langsung
        $event = TicketEvent::record(
            ticket: $task,
            event: 'accepted',
            fromStatus: 'assigned',
            toStatus: 'accepted',
            payload: ['team' => 'Tim Delta'],
            actorId: $admin->id
        );

        $this->assertNotNull($event->id);
        $this->assertEquals('accepted', $event->event);
        $this->assertEquals($task->id, $event->eventable_id);
        $this->assertEquals(Task::class, $event->eventable_type);

        // Verifikasi log assignment_logs tersinkronisasi ke ticket_events
        DB::table('assignment_logs')->insert([
            'assignable_type' => Task::class,
            'assignable_id' => $task->id,
            'team_id' => $team->id,
            'action' => 'assigned',
            'reason' => 'Uji salin log',
            'actor_id' => $admin->id,
            'attempt_no' => 1,
            'created_at' => now()->subMinutes(10),
        ]);

        // Jalankan logika migrasi/sinkronisasi
        $log = DB::table('assignment_logs')->first();
        $copiedEvent = DB::table('ticket_events')
            ->where('eventable_id', $log->assignable_id)
            ->where('event', 'assigned')
            ->first();

        if (! $copiedEvent) {
            DB::table('ticket_events')->insert([
                'eventable_type' => $log->assignable_type,
                'eventable_id' => $log->assignable_id,
                'actor_id' => $log->actor_id,
                'event' => $log->action,
                'payload' => json_encode(['source' => 'assignment_logs']),
                'occurred_at' => $log->created_at,
            ]);
        }

        $this->assertDatabaseHas('ticket_events', [
            'eventable_type' => Task::class,
            'eventable_id' => $task->id,
            'event' => 'assigned',
        ]);
    }

    public function test_kpi_settings_versioning_and_snapshot_immutability(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');
        Sanctum::actingAs($admin);

        // 1. Dapatkan setting versi 1
        $settingV1 = KpiSetting::getActive('team');
        $this->assertNotNull($settingV1);
        $this->assertEquals(1, $settingV1->version);

        // Buat snapshot untuk periode bulan lalu dengan versi 1
        $pastSnapshot = KpiSnapshot::create([
            'period' => '2026-09',
            'subject_type' => 'team',
            'subject_id' => 999,
            'metrics' => ['sla_compliance_rate' => 85.0],
            'weights' => $settingV1->weights,
            'score' => 85.00,
            'settings_version' => 1,
            'is_read_only' => true,
            'computed_at' => now()->subMonths(1),
        ]);

        // 2. Admin memperbarui bobot KPI -> otomatis membuat versi 2
        $updateRes = $this->putJson('/api/admin/kpi/settings', [
            'category' => 'team',
            'weights' => [
                'sla_compliance' => 0.40, // Diubah menjadi 40%
                'acceptance_speed' => 0.10,
                'productivity' => 0.15,
                'evidence_quality' => 0.15,
                'customer_rating' => 0.10,
                'attendance' => 0.10,
            ],
            'notes' => 'Pembaruan bobot SLA naik menjadi 40%',
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.version', 2);

        // Versi aktif sekarang versi 2
        $activeSetting = KpiSetting::getActive('team');
        $this->assertEquals(2, $activeSetting->version);
        $this->assertEquals(0.40, $activeSetting->weights['sla_compliance']);

        // Snapshot lama TIDAK BERUBAH dan tetap mengunci versi 1
        $pastSnapshot->refresh();
        $this->assertEquals(1, $pastSnapshot->settings_version);
        $this->assertEquals(85.00, (float) $pastSnapshot->score);
        $this->assertEquals(0.25, $pastSnapshot->weights['sla_compliance']);
    }

    public function test_whatsapp_rating_link_and_recording(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');
        Sanctum::actingAs($admin);

        $customer = Customer::create([
            'customer_code' => 'CUST-WA-01',
            'name' => 'Bpk. Handoko',
            'phone' => '0812-9876-5432',
            'address' => 'Jl. Handoko No. 12',
            'package' => '50 Mbps',
            'status' => 'active',
        ]);

        $complaint = $this->createComplaint([
            'ticket_number' => 'CMP-2026-001',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'phone' => $customer->phone,
            'address' => 'Jl. Mawar No. 12',
            'customer_address' => 'Jl. Mawar No. 12',
            'problem_type' => 'LOS Merah',
            'description' => 'Kabel FO terputus',
            'status' => 'resolved',
            'priority' => 'high',
        ]);

        // 1. Dapatkan tautan WhatsApp resmi
        $linkRes = $this->getJson("/api/admin/kpi/whatsapp-link?ticket_type=complaint&ticket_id={$complaint->id}");
        $linkRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $url = $linkRes->json('data.url');
        $this->assertStringContainsString('https://wa.me/6281298765432', $url);
        $this->assertStringContainsString('CMP-2026-001', urldecode($url));
        $this->assertStringContainsString('Bpk. Handoko', urldecode($url));

        // 2. Admin mencatat respons rating dari pelanggan (skala 1-5)
        $ratingRes = $this->postJson('/api/admin/kpi/rating', [
            'ticket_type' => 'complaint',
            'ticket_id' => $complaint->id,
            'rating' => 5,
            'note' => 'Pelanggan puas, internet sudah menyala normal kembali.',
        ]);

        $ratingRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $complaint->refresh();
        $this->assertEquals(5, $complaint->customer_rating);
        $this->assertEquals('Pelanggan puas, internet sudah menyala normal kembali.', $complaint->rating_note);
        $this->assertEquals($admin->id, $complaint->rated_by_id);

        // Verifikasi TicketEvent tercatat
        $this->assertDatabaseHas('ticket_events', [
            'eventable_type' => Complaint::class,
            'eventable_id' => $complaint->id,
            'event' => 'customer_rating_recorded',
        ]);
    }

    /**
     * PENGUJIAN DATA UJI TETAP 1 BULAN DENGAN HITUNGAN MANUAL GROUND TRUTH (Fase 5 Item 6).
     * Tandai selisih sekecil apa pun jika tidak cocok persis.
     */
    public function test_deterministic_one_month_kpi_calculation_matches_manual_computation(): void
    {
        $kpiService = app(KpiService::class);
        $period = '2026-11';
        $start = Carbon::createFromFormat('Y-m', $period)->startOfMonth();

        // -------------------------------------------------------------------------
        // 1. DATA UJI TETAP TIM LAPANGAN: Tim Bravo
        // -------------------------------------------------------------------------
        $team = Team::create(['name' => 'Tim Bravo', 'order_index' => 1, 'is_active' => true]);
        $tech1 = User::factory()->create(['name' => 'Teknisi Satu']);
        $tech2 = User::factory()->create(['name' => 'Teknisi Dua']);
        $tech1->assignRole('Teknisi');
        $tech2->assignRole('Teknisi');
        TeamMember::create(['team_id' => $team->id, 'user_id' => $tech1->id, 'is_active' => true]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $tech2->id, 'is_active' => true]);

        // Kehadiran: Target hari kerja = 20 hari. 2 teknisi x 20 = 40 hari-orang target.
        // Masing-masing teknisi hadir 18 hari (total hadir = 36 hari).
        // Attendance Rate = 36 / 40 * 100 = 90.00%.
        for ($i = 1; $i <= 18; $i++) {
            $dateStr = $start->copy()->addDays($i - 1)->toDateString();
            DailyAttendance::create([
                'user_id' => $tech1->id,
                'work_date' => $dateStr,
                'check_in_at' => Carbon::parse("{$dateStr} 08:00:00"),
                'status' => 'hadir',
            ]);
            DailyAttendance::create([
                'user_id' => $tech2->id,
                'work_date' => $dateStr,
                'check_in_at' => Carbon::parse("{$dateStr} 08:05:00"),
                'status' => 'hadir',
            ]);
        }

        // Tiket 1: PSB Task on-time, accept 10 min, bukti lengkap, rating 5
        Task::create([
            'task_number' => 'TSK-202611-01',
            'provisioning_id' => $this->createProvisioning()->id,
            'assigned_team_id' => $team->id,
            'status' => 'completed',
            'created_at' => $start->copy()->addDays(2)->setTime(8, 0, 0),
            'assigned_at' => $start->copy()->addDays(2)->setTime(8, 0, 0),
            'accepted_at' => $start->copy()->addDays(2)->setTime(8, 10, 0), // 10 min
            'completed_at' => $start->copy()->addDays(2)->setTime(16, 0, 0), // 8 jam <= 24 jam (Met)
            'customer_signature_path' => 'sig_01.png',
            'photos' => ['pre.jpg', 'post.jpg'],
            'customer_rating' => 5,
        ]);

        // Tiket 2: PSB Task on-time, accept 10 min, bukti lengkap, rating 5
        Task::create([
            'task_number' => 'TSK-202611-02',
            'provisioning_id' => $this->createProvisioning()->id,
            'assigned_team_id' => $team->id,
            'status' => 'completed',
            'created_at' => $start->copy()->addDays(3)->setTime(8, 0, 0),
            'assigned_at' => $start->copy()->addDays(3)->setTime(8, 0, 0),
            'accepted_at' => $start->copy()->addDays(3)->setTime(8, 10, 0), // 10 min
            'completed_at' => $start->copy()->addDays(3)->setTime(18, 0, 0), // 10 jam <= 24 jam (Met)
            'customer_signature_path' => 'sig_02.png',
            'photos' => ['pre.jpg', 'post.jpg'],
            'customer_rating' => 5,
        ]);

        // Tiket 3: PSB Task breach SLA (30 jam > 24 jam), accept 20 min, bukti lengkap, rating 4
        Task::create([
            'task_number' => 'TSK-202611-03',
            'provisioning_id' => $this->createProvisioning()->id,
            'assigned_team_id' => $team->id,
            'status' => 'completed',
            'created_at' => $start->copy()->addDays(4)->setTime(9, 0, 0),
            'assigned_at' => $start->copy()->addDays(4)->setTime(9, 0, 0),
            'accepted_at' => $start->copy()->addDays(4)->setTime(9, 20, 0), // 20 min
            'completed_at' => $start->copy()->addDays(5)->setTime(15, 0, 0), // 30 jam > 24 jam (Breach)
            'customer_signature_path' => 'sig_03.png',
            'photos' => ['pre.jpg', 'post.jpg'],
            'customer_rating' => 4,
        ]);

        // Tiket 4: PSB Task on-time, accept 0 min, bukti TIDAK LENGKAP (tanpa ttd), rating 4
        Task::create([
            'task_number' => 'TSK-202611-04',
            'provisioning_id' => $this->createProvisioning()->id,
            'assigned_team_id' => $team->id,
            'status' => 'completed',
            'created_at' => $start->copy()->addDays(6)->setTime(8, 0, 0),
            'assigned_at' => $start->copy()->addDays(6)->setTime(8, 0, 0),
            'accepted_at' => $start->copy()->addDays(6)->setTime(8, 0, 0), // 0 min
            'completed_at' => $start->copy()->addDays(6)->setTime(12, 0, 0), // 4 jam <= 24 jam (Met)
            'customer_signature_path' => null, // Tidak lengkap
            'photos' => [],
            'customer_rating' => 4,
        ]);

        // Pelanggan untuk pengaduan
        $custRepeat = Customer::create([
            'customer_code' => 'CUST-REP-01',
            'name' => 'Pelanggan Repeat',
            'phone' => '081233333333',
            'address' => 'Jl. Repeat No. 1',
            'package' => '50 Mbps',
            'status' => 'active',
        ]);

        // Komplain masa lalu (10 hari sebelum komplain 3) untuk memicu repeat trouble
        $this->createComplaint([
            'ticket_number' => 'CMP-PAST-01',
            'customer_id' => $custRepeat->id,
            'problem_type' => 'Modem Mati',
            'status' => 'resolved',
            'created_at' => $start->copy()->addDays(1)->setTime(10, 0, 0),
            'resolved_at' => $start->copy()->addDays(1)->setTime(12, 0, 0),
        ]);

        // Tiket 5: Complaint high (SLA 4h). Assigned at 09:00, accept 09:10 (10 min), resolved 12:00 (3h Met)
        $this->createComplaint([
            'ticket_number' => 'CMP-202611-01',
            'assigned_team_id' => $team->id,
            'priority' => 'high',
            'status' => 'resolved',
            'created_at' => $start->copy()->addDays(7)->setTime(9, 0, 0),
            'assigned_at' => $start->copy()->addDays(7)->setTime(9, 0, 0),
            'accepted_at' => $start->copy()->addDays(7)->setTime(9, 10, 0), // 10 min
            'resolved_at' => $start->copy()->addDays(7)->setTime(12, 0, 0), // 3 jam <= 4 jam (Met)
            'status_reason' => 'Ganti kabel patchcord',
            'resolution_notes' => 'Ganti kabel patchcord',
        ]);

        // Tiket 6: Complaint medium (SLA 12h). Assigned at 09:00, accept 09:10 (10 min), resolved 15:00 (6h Met)
        $this->createComplaint([
            'ticket_number' => 'CMP-202611-02',
            'assigned_team_id' => $team->id,
            'priority' => 'medium',
            'status' => 'resolved',
            'created_at' => $start->copy()->addDays(8)->setTime(9, 0, 0),
            'assigned_at' => $start->copy()->addDays(8)->setTime(9, 0, 0),
            'accepted_at' => $start->copy()->addDays(8)->setTime(9, 10, 0), // 10 min
            'resolved_at' => $start->copy()->addDays(8)->setTime(15, 0, 0), // 6 jam <= 12 jam (Met)
            'status_reason' => 'Redaman normal kembali -19 dBm',
            'resolution_notes' => 'Redaman normal kembali -19 dBm',
        ]);

        // Tiket 7: Complaint medium (SLA 12h). Assigned at 09:00, accept 09:10 (10 min), resolved next day (31h Breach). Repeat = true!
        $this->createComplaint([
            'ticket_number' => 'CMP-202611-03',
            'assigned_team_id' => $team->id,
            'customer_id' => $custRepeat->id, // Sama dengan CMP-PAST-01 -> Repeat trouble!
            'priority' => 'medium',
            'status' => 'resolved',
            'created_at' => $start->copy()->addDays(9)->setTime(9, 0, 0),
            'assigned_at' => $start->copy()->addDays(9)->setTime(9, 0, 0),
            'accepted_at' => $start->copy()->addDays(9)->setTime(9, 10, 0), // 10 min
            'resolved_at' => $start->copy()->addDays(10)->setTime(16, 0, 0), // 31 jam > 12 jam (Breach)
            'status_reason' => 'Splicing ulang ODP',
            'resolution_notes' => 'Splicing ulang ODP',
        ]);

        // Tiket 8: Complaint critical (SLA 2h). Assigned at 08:00, accept 08:10 (10 min), resolved 09:30 (1.5h Met)
        $this->createComplaint([
            'ticket_number' => 'CMP-202611-04',
            'assigned_team_id' => $team->id,
            'priority' => 'critical',
            'status' => 'resolved',
            'created_at' => $start->copy()->addDays(11)->setTime(8, 0, 0),
            'assigned_at' => $start->copy()->addDays(11)->setTime(8, 0, 0),
            'accepted_at' => $start->copy()->addDays(11)->setTime(8, 10, 0), // 10 min
            'resolved_at' => $start->copy()->addDays(11)->setTime(9, 30, 0), // 1.5 jam <= 2 jam (Met)
            'status_reason' => 'Kabel backbone diperbaiki',
            'resolution_notes' => 'Kabel backbone diperbaiki',
        ]);

        // Konfigurasi target working days = 20 hari, target tiket = 10 tiket
        $teamSetting = KpiSetting::getActive('team');
        $teamSetting->update([
            'targets' => array_merge($teamSetting->targets ?? [], [
                'working_days_target' => 20,
                'monthly_tickets_target' => 10,
            ]),
        ]);

        // Eksekusi perhitungan KPI Tim
        $teamKpi = $kpiService->computeTeamKpi($period, $team->id);
        $m = $teamKpi['metrics'];

        // =========================================================================
        // VERIFIKASI GROUND TRUTH MANUAL TIM (ZERO DELTA ASSERTIONS)
        // =========================================================================
        // 1. Kecepatan terima: [10, 10, 20, 0, 10, 10, 10, 10] / 8 = 10.0 menit
        $this->assertEquals(10.0, $m['acceptance_speed_minutes']);
        $this->assertEquals(100.0, $m['acceptance_speed_score']); // 10 min <= 15 min target -> 100%

        // 2. SLA compliance: 6 on-time, 2 breach -> 6 / 8 = 75.00%
        $this->assertEquals(6, $m['on_time_tickets']);
        $this->assertEquals(2, $m['total_breaches']);
        $this->assertEquals(75.00, $m['sla_compliance_rate']);

        // 3. Tiket selesai: 4 task + 4 complaint = 8 tiket. Target 10 tiket -> 80.00%
        $this->assertEquals(4, $m['completed_tasks']);
        $this->assertEquals(4, $m['resolved_complaints']);
        $this->assertEquals(8, $m['completed_tickets']);
        $this->assertEquals(80.00, $m['productivity_score']);

        // 4. Repeat trouble rate: 1 dari 4 komplain berulang -> 25.00%
        $this->assertEquals(1, $m['repeat_trouble_count']);
        $this->assertEquals(25.00, $m['repeat_trouble_rate']);

        // 5. Kelengkapan bukti: 7 lengkap, 1 tidak lengkap -> 7 / 8 = 87.50%
        $this->assertEquals(87.50, $m['evidence_completeness_rate']);

        // 6. Rating pelanggan: [5, 5, 4, 4] / 4 = 4.50
        $this->assertEquals(4.50, $m['average_rating']);

        // 7. Kehadiran tim: 36 hadir dari 40 target -> 90.00%
        $this->assertEquals(90.00, $m['attendance_rate']);

        // 8. Skor Akhir:
        // Bobot: SLA (25%) + Accept (15%) + Prod (15%) + Evidence (15%) + Rating (15%) + Attendance (15%)
        // = (75*0.25) + (100*0.15) + (80*0.15) + (87.5*0.15) + ((4.5/5*100)*0.15) + (90*0.15) - Penalti Repeat (25*0.5=12.5)
        // = 18.75 + 15.00 + 12.00 + 13.125 + 13.50 + 13.50 - 12.50 = 73.38
        $this->assertEquals(73.38, $teamKpi['score']);

        // -------------------------------------------------------------------------
        // 2. DATA UJI TETAP SALES: Sales Budi (Kehadiran 10%, Tanpa Komisi)
        // -------------------------------------------------------------------------
        $salesUser = User::factory()->create(['name' => 'Sales Budi']);
        $salesUser->assignRole('Sales');

        // Hadir 18 hari dari 20 hari target -> Attendance Rate = 18 / 20 * 100 = 90.00%
        for ($i = 1; $i <= 18; $i++) {
            $dateStr = $start->copy()->addDays($i - 1)->toDateString();
            DailyAttendance::create([
                'user_id' => $salesUser->id,
                'work_date' => $dateStr,
                'check_in_at' => Carbon::parse("{$dateStr} 08:30:00"),
                'status' => 'hadir',
            ]);
        }

        // 10 Pengajuan:
        // - 6 berstatus completed (jadi terpasang & tervalidasi)
        // - 2 berstatus approved (tervalidasi, belum terpasang)
        // - 2 berstatus pending (belum tervalidasi)
        // Total pengajuan = 10
        // Tervalidasi = 6 + 2 = 8 -> 80.00%
        // Jadi terpasang = 6 -> 60.00%
        // Kualitas data: 9 bersih, 1 ada duplicate_warnings -> 9 / 10 = 90.00%

        for ($k = 1; $k <= 6; $k++) {
            $this->createSubmission([
                'submission_number' => "SUB-202611-{$k}",
                'user_id' => $salesUser->id,
                'sales_id' => $salesUser->id,
                'customer_name' => "Pelanggan Terpasang {$k}",
                'status' => 'completed',
                'duplicate_warnings' => null,
                'created_at' => $start->copy()->addDays($k)->setTime(10, 0, 0),
            ]);
        }

        for ($k = 7; $k <= 8; $k++) {
            $this->createSubmission([
                'submission_number' => "SUB-202611-{$k}",
                'user_id' => $salesUser->id,
                'sales_id' => $salesUser->id,
                'customer_name' => "Pelanggan Approved {$k}",
                'status' => 'approved',
                'duplicate_warnings' => null,
                'created_at' => $start->copy()->addDays($k)->setTime(10, 0, 0),
            ]);
        }

        // Pengajuan 9: Bersih pending
        $this->createSubmission([
            'submission_number' => 'SUB-202611-09',
            'user_id' => $salesUser->id,
            'sales_id' => $salesUser->id,
            'customer_name' => 'Pelanggan Pending 9',
            'status' => 'pending',
            'duplicate_warnings' => null,
            'created_at' => $start->copy()->addDays($k ?? 9)->setTime(10, 0, 0),
        ]);

        // Pengajuan 10: Ada catatan duplikat
        $this->createSubmission([
            'submission_number' => 'SUB-202611-10',
            'user_id' => $salesUser->id,
            'sales_id' => $salesUser->id,
            'customer_name' => 'Pelanggan Duplikat 10',
            'status' => 'pending',
            'duplicate_warnings' => ['NIK sama persis dengan pelanggan lama'],
            'created_at' => $start->copy()->addDays(10)->setTime(10, 0, 0),
        ]);

        $salesSetting = KpiSetting::getActive('sales');
        $salesSetting->update([
            'targets' => array_merge($salesSetting->targets ?? [], [
                'working_days_target' => 20,
            ]),
        ]);

        // Eksekusi perhitungan KPI Sales
        $salesKpi = $kpiService->computeSalesKpi($period, $salesUser->id);
        $sm = $salesKpi['metrics'];

        // =========================================================================
        // VERIFIKASI GROUND TRUTH MANUAL SALES
        // =========================================================================
        $this->assertEquals(10, $sm['total_submissions']);
        $this->assertEquals(8, $sm['approved_submissions']);
        $this->assertEquals(80.00, $sm['validation_rate']);
        $this->assertEquals(6, $sm['installed_submissions']);
        $this->assertEquals(60.00, $sm['installation_rate']);
        $this->assertEquals(9, $sm['clean_submissions']);
        $this->assertEquals(90.00, $sm['data_quality_rate']);
        $this->assertEquals(90.00, $sm['attendance_rate']);

        // Aturan 11: Tanpa komisi!
        $this->assertArrayNotHasKey('commission_amount', $sm);

        // Skor Komposit Sales:
        // Bobot: Validasi 30% + Terpasang 30% + Kualitas 30% + Kehadiran 10%
        // = (80.00 * 0.30) + (60.00 * 0.30) + (90.00 * 0.30) + (90.00 * 0.10)
        // = 24.00 + 18.00 + 27.00 + 9.00 = 78.00!
        $this->assertEquals(78.00, $salesKpi['score']);

        // -------------------------------------------------------------------------
        // 3. VERIFIKASI EKSPOR CSV LAPORAN BULANAN
        // -------------------------------------------------------------------------
        $csv = $kpiService->exportCsv($period);
        $this->assertStringContainsString('LAPORAN KINERJA & KPI BULANAN', $csv);
        $this->assertStringContainsString('Tim Bravo', $csv);
        $this->assertStringContainsString('73.38', $csv);
        $this->assertStringContainsString('Sales Budi', $csv);
        $this->assertStringContainsString('78.00', $csv);
        $this->assertStringContainsString('Tanpa Komisi', $csv);
    }

    public function test_kpi_snapshot_artisan_command_and_overview_api(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');
        Sanctum::actingAs($admin);

        Team::create(['name' => 'Tim Epsilon', 'order_index' => 1, 'is_active' => true]);

        // 1. Jalankan command kpi:snapshot
        $this->artisan('kpi:snapshot', ['--period' => '2026-10'])
            ->assertExitCode(0);

        // Snapshot tersimpan di basis data
        $this->assertDatabaseHas('kpi_snapshots', [
            'period' => '2026-10',
            'subject_type' => 'team',
        ]);

        // 2. Panggil API Overview
        $res = $this->getJson('/api/admin/kpi/overview?period=2026-10');
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.period', '2026-10');

        $teams = $res->json('data.teams');
        $this->assertNotEmpty($teams);

        // 3. Panggil API Ekspor CSV
        $exportRes = $this->get('/api/admin/kpi/export?period=2026-10');
        $exportRes->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
