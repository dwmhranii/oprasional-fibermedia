<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\OfficeLocation;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NavigasiDanDispatchFase2Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private OfficeLocation $office;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Superadmin']);
        Role::firstOrCreate(['name' => 'Teknisi']);
        Role::firstOrCreate(['name' => 'Sales']);

        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->assignRole('Superadmin');

        $this->office = OfficeLocation::create([
            'name' => 'Kantor Pusat',
            'latitude' => -7.9826,
            'longitude' => 112.6308,
            'radius_meters' => 100,
        ]);

        // Default dispatch settings
        DB::table('dispatch_settings')->updateOrInsert(['key' => 'min_members_present'], ['value' => json_encode(1)]);
        DB::table('dispatch_settings')->updateOrInsert(['key' => 'accept_timeout_menit'], ['value' => json_encode(15)]);
        DB::table('dispatch_settings')->updateOrInsert(['key' => 'max_oper'], ['value' => json_encode(3)]);
    }

    private function createTeamWithTechnicians(string $name, int $order = 1): array
    {
        $team = Team::create([
            'name' => $name,
            'description' => "Tim {$name}",
            'order_index' => $order,
            'is_active' => true,
        ]);

        $tech1 = User::factory()->create(['status' => 'active', 'team' => $name]);
        $tech1->assignRole('Teknisi');
        TeamMember::create(['team_id' => $team->id, 'user_id' => $tech1->id, 'left_at' => null]);

        $tech2 = User::factory()->create(['status' => 'active', 'team' => $name]);
        $tech2->assignRole('Teknisi');
        TeamMember::create(['team_id' => $team->id, 'user_id' => $tech2->id, 'left_at' => null]);

        return [$team, $tech1, $tech2];
    }

    private function createComplaint(string $number = 'CMP-001', string $status = 'open'): Complaint
    {
        return Complaint::create([
            'ticket_number' => $number,
            'created_by_id' => $this->admin->id,
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

    private function createPsbTask(string $number = 'TSK-001', string $status = 'pending'): Task
    {
        $submission = Submission::factory()->create([
            'user_id' => $this->admin->id,
            'customer_name' => 'Pelanggan PSB Test',
            'status' => 'approved',
        ]);

        $provisioning = Provisioning::create([
            'provisioning_number' => 'PRV-'.uniqid(),
            'submission_id' => $submission->id,
            'admin_id' => $this->admin->id,
            'status' => 'ready',
        ]);

        return Task::create([
            'task_number' => $number,
            'provisioning_id' => $provisioning->id,
            'status' => $status,
        ]);
    }

    /**
     * 1. Tab "Belum Ditugaskan" berisi tiket tanpa tim siap dan berpindah otomatis setelah ada yang absen.
     */
    public function test_unassigned_tab_contains_tickets_and_moves_after_technician_checkin(): void
    {
        [$team, $tech1] = $this->createTeamWithTechnicians('Team Alfa', 1);

        // Buat tiket tanpa tim yang siap (belum ada yang absen)
        $complaint = $this->createComplaint('CMP-UNASSIGNED-1', 'open');
        $task = $this->createPsbTask('TSK-UNASSIGNED-1', 'pending');

        // Pastikan tiket masuk ke tab 'unassigned' di Work Order monitoring
        $response = $this->actingAs($this->admin)->getJson('/api/admin/work-orders?tab=unassigned');
        $response->assertOk();
        $response->assertJsonPath('success', true);

        $data = collect($response->json('data'));
        $this->assertTrue($data->contains('ticket_number', 'CMP-UNASSIGNED-1'));
        $this->assertTrue($data->contains('ticket_number', 'TSK-UNASSIGNED-1'));

        // Counts tab unassigned harus >= 2
        $this->assertGreaterThanOrEqual(2, $response->json('counts.unassigned'));

        // Sekarang teknisi check-in (absen masuk)
        $checkInResponse = $this->actingAs($tech1)->postJson('/api/attendance/check-in', [
            'latitude' => -7.9826,
            'longitude' => 112.6308,
            'accuracy' => 10,
            'selfie_base64' => 'data:image/png;base64,'.base64_encode('fake-selfie-data'),
        ]);
        $checkInResponse->assertOk();

        // Hook attendance langsung menjalankan assign-pending!
        // Periksa kembali tab 'unassigned': tiket harus sudah berpindah keluar dari tab unassigned
        $responseAfter = $this->actingAs($this->admin)->getJson('/api/admin/work-orders?tab=unassigned');
        $dataAfter = collect($responseAfter->json('data'));
        $this->assertFalse($dataAfter->contains('ticket_number', 'CMP-UNASSIGNED-1'));
        $this->assertFalse($dataAfter->contains('ticket_number', 'TSK-UNASSIGNED-1'));

        // Dan berpindah ke tab 'waiting_acceptance' (atau in_progress)
        $responseWaiting = $this->actingAs($this->admin)->getJson('/api/admin/work-orders?tab=waiting_acceptance');
        $dataWaiting = collect($responseWaiting->json('data'));
        $this->assertTrue($dataWaiting->contains('ticket_number', 'CMP-UNASSIGNED-1'));
        $this->assertTrue($dataWaiting->contains('ticket_number', 'TSK-UNASSIGNED-1'));
    }

    /**
     * 2. Tugaskan manual tanpa alasan ditolak (422); dengan alasan tercatat di assignment_logs dan ticket_events.
     */
    public function test_manual_assign_requires_reason_and_records_audit_events(): void
    {
        [$team] = $this->createTeamWithTechnicians('Team Bravo', 2);
        $complaint = $this->createComplaint('CMP-MANUAL-1', 'open');

        // 1. Coba tugaskan manual tanpa alasan -> harus 422
        $failResponse = $this->actingAs($this->admin)->postJson('/api/admin/dispatch/manual-assign', [
            'ticket_type' => 'complaint',
            'ticket_id' => $complaint->id,
            'team_id' => $team->id,
            'reason' => '', // kosong
        ]);
        $failResponse->assertStatus(422);
        $failResponse->assertJsonValidationErrors(['reason']);

        // 2. Tugaskan manual dengan alasan sah
        $reasonText = 'Penugasan darurat instruksi Supervisor Lapangan';
        $successResponse = $this->actingAs($this->admin)->postJson('/api/admin/dispatch/manual-assign', [
            'ticket_type' => 'complaint',
            'ticket_id' => $complaint->id,
            'team_id' => $team->id,
            'reason' => $reasonText,
        ]);
        $successResponse->assertOk();
        $successResponse->assertJsonPath('success', true);

        // Verifikasi assignment_logs
        $this->assertDatabaseHas('assignment_logs', [
            'ticket_id' => $complaint->id,
            'team_id' => $team->id,
            'action' => 'assigned',
            'reason' => "Penugasan manual: {$reasonText}",
            'actor_id' => $this->admin->id,
        ]);

        // Verifikasi ticket_events
        $this->assertDatabaseHas('ticket_events', [
            'eventable_id' => $complaint->id,
            'actor_id' => $this->admin->id,
            'event' => 'manual_assigned',
        ]);
    }

    /**
     * 3. Work Order (pantau): TIDAK punya endpoint pembuatan (read-only).
     */
    public function test_work_order_pantau_has_no_creation_endpoint(): void
    {
        // Pastikan POST ke /api/admin/work-orders menghasilkan 405 Method Not Allowed atau 404 Not Found
        $response = $this->actingAs($this->admin)->postJson('/api/admin/work-orders', [
            'title' => 'Buat Work Order Baru',
        ]);

        $this->assertContains($response->status(), [404, 405]);
    }

    /**
     * 4. Hitung mundur oper sesuai dispatch_settings.accept_timeout_menit.
     */
    public function test_auto_reassign_countdown_matches_dispatch_settings(): void
    {
        [$team, $tech1] = $this->createTeamWithTechnicians('Team Charlie', 3);

        // Set timeout ke 25 menit
        DB::table('dispatch_settings')->where('key', 'accept_timeout_menit')->update(['value' => json_encode(25)]);

        // Buat absensi agar tim siap
        DailyAttendance::create([
            'user_id' => $tech1->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::now()->subHour(),
            'is_valid_location' => true,
        ]);

        // Buat complaint dan assign ke tim Charlie
        $assignedAt = Carbon::now()->subMinutes(5);
        $complaint = Complaint::create([
            'ticket_number' => 'CMP-COUNTDOWN-1',
            'created_by_id' => $this->admin->id,
            'customer_name' => 'Countdown Test',
            'customer_phone' => '08123456788',
            'customer_address' => 'Jl. Test 10',
            'area' => 'Wilayah Barat',
            'subject' => 'Internet Mati Total',
            'description' => 'LOS merah',
            'category' => 'no_signal',
            'status' => 'assigned',
            'assigned_team_id' => $team->id,
            'assigned_team' => $team->name,
            'assigned_at' => $assignedAt,
        ]);

        // Panggil endpoint /api/admin/work-orders
        $response = $this->actingAs($this->admin)->getJson('/api/admin/work-orders?tab=waiting_acceptance');
        $response->assertOk();

        $wo = collect($response->json('data'))->firstWhere('ticket_number', 'CMP-COUNTDOWN-1');
        $this->assertNotNull($wo);
        $this->assertNotNull($wo['auto_reassign_due_at']);

        // Waktu jatuh tempo harus = assigned_at + 25 menit
        $expectedDue = $assignedAt->copy()->addMinutes(25)->toIso8601String();
        $this->assertEquals(
            Carbon::parse($expectedDue)->timestamp,
            Carbon::parse($wo['auto_reassign_due_at'])->timestamp
        );
    }

    /**
     * 5. Menu badges: operational_tickets = unassigned + escalated tickets.
     */
    public function test_operational_ticket_badge_reflects_unassigned_and_escalated_tickets(): void
    {
        // 1 unassigned complaint
        $this->createComplaint('CMP-BADGE-1', 'open');

        // 1 escalated complaint
        $escalated = $this->createComplaint('CMP-BADGE-2', 'escalated_to_admin');

        $response = $this->actingAs($this->admin)->getJson('/api/menu/badges');
        $response->assertOk();

        $badges = $response->json('data') ?? $response->json();
        $this->assertArrayHasKey('operational_tickets', $badges);
        $this->assertGreaterThanOrEqual(2, $badges['operational_tickets']);
    }

    /**
     * 6. Endpoint dispatch-now segera memproses tiket yang belum ditugaskan.
     */
    public function test_dispatch_now_endpoint_processes_unassigned_ticket(): void
    {
        [$team, $tech1] = $this->createTeamWithTechnicians('Team Delta', 4);

        $complaint = $this->createComplaint('CMP-DISPATCH-NOW', 'open');

        // Coba dispatch-now saat belum ada tim siap
        $resNoTeam = $this->actingAs($this->admin)->postJson("/api/admin/dispatch/tickets/complaint/{$complaint->id}/dispatch-now");
        $resNoTeam->assertOk();
        $this->assertFalse($resNoTeam->json('success'));

        // Absenkan teknisi
        DailyAttendance::create([
            'user_id' => $tech1->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'hadir',
            'check_in_at' => Carbon::now()->subMinutes(10),
            'is_valid_location' => true,
        ]);

        // Coba dispatch-now sekarang
        $resWithTeam = $this->actingAs($this->admin)->postJson("/api/admin/dispatch/tickets/complaint/{$complaint->id}/dispatch-now");
        $resWithTeam->assertOk();
        $this->assertTrue($resWithTeam->json('success'));

        $fresh = $complaint->fresh();
        $statusVal = $fresh->status instanceof \BackedEnum ? $fresh->status->value : (string) $fresh->status;
        $this->assertEquals('assigned', $statusVal);
        $this->assertEquals($team->id, $fresh->assigned_team_id);
    }

    /**
     * 7. Endpoint unified detail mengembalikan Ringkasan, Penugasan, dan Riwayat.
     */
    public function test_unified_detail_returns_summary_assignment_and_history(): void
    {
        [$team] = $this->createTeamWithTechnicians('Team Echo', 5);
        $complaint = $this->createComplaint('CMP-UNIFIED-1', 'open');

        // Rekam manual assignment
        $this->actingAs($this->admin)->postJson('/api/admin/dispatch/manual-assign', [
            'ticket_type' => 'complaint',
            'ticket_id' => $complaint->id,
            'team_id' => $team->id,
            'reason' => 'Uji Unified Detail',
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/admin/dispatch/tickets/complaint/{$complaint->id}/unified-detail");
        $res->assertOk();
        $res->assertJsonPath('success', true);

        $data = $res->json('data');
        $this->assertEquals('CMP-UNIFIED-1', $data['ticket_number']);
        $this->assertEquals('Team Echo', $data['current_team']['name']);
        $this->assertNotEmpty($data['assignment_logs']);
        $this->assertNotEmpty($data['ticket_events']);
    }
}
