<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\CableTrack;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Modules\Field\Services\PhaseWorkflowService;
use App\Services\WorkOrderService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Fase3TambahanJaringanDanReviewTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $technician;

    protected Team $teamA;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);
        $perm = Permission::firstOrCreate(['name' => 'tickets.review', 'guard_name' => 'web']);

        $roleAdmin = Role::where('name', 'Admin')->first();
        $roleAdmin->givePermissionTo($perm);

        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->assignRole('Admin');

        $this->teamA = Team::create([
            'name' => 'Tim Alpha',
            'order_index' => 1,
            'is_active' => true,
        ]);

        $this->technician = User::factory()->create(['name' => 'Teknisi Alpha', 'status' => 'active', 'team' => 'Tim Alpha']);
        $this->technician->assignRole('Teknisi');
        TeamMember::firstOrCreate(['team_id' => $this->teamA->id, 'user_id' => $this->technician->id], ['joined_at' => now()]);
    }

    private function createPsbTask(string $number = 'TSK-REV-01'): Task
    {
        $submission = Submission::factory()->create([
            'customer_name' => 'Pelanggan Uji Review',
            'lat' => -8.080000,
            'lng' => 112.630000,
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
            'assigned_team_id' => $this->teamA->id,
            'assigned_team' => $this->teamA->name,
            'teknisi_id' => $this->technician->id,
            'status' => TaskStatus::IN_PROGRESS,
        ]);
    }

    /**
     * Test 1: Tiles manifest endpoint mengembalikan informasi peta offline dengan atribusi.
     */
    public function test_tiles_manifest_returns_metadata_and_attribution(): void
    {
        $response = $this->get('/tiles/manifest');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'name',
            'version',
            'size_bytes',
            'size_formatted',
            'url',
            'bounds',
            'center',
            'attribution',
        ]);
        $this->assertStringContainsString('Fibermedia Ops', $response->json('attribution'));
    }

    /**
     * Test 2: Kiriman ulang ODP dengan Idempotency-Key atau client_uuid sama tidak menggandakan data.
     */
    public function test_odp_submission_with_same_client_uuid_is_idempotent(): void
    {
        $uuid = 'client-uuid-odp-999';

        $payload = [
            'client_uuid' => $uuid,
            'name' => 'ODP Bululawang 99',
            'latitude' => -8.081234,
            'longitude' => 112.631234,
            'port_capacity' => 8,
        ];

        // Kiriman pertama
        $res1 = $this->actingAs($this->technician)->postJson('/api/odps', $payload, [
            'Idempotency-Key' => $uuid,
        ]);
        $this->assertContains($res1->status(), [200, 201]);
        $this->assertEquals(1, Odp::where('client_uuid', $uuid)->count());

        // Kiriman kedua dengan client_uuid sama
        $res2 = $this->actingAs($this->technician)->postJson('/api/odps', $payload, [
            'Idempotency-Key' => $uuid,
        ]);
        $this->assertContains($res2->status(), [200, 201]);
        $this->assertEquals(1, Odp::where('client_uuid', $uuid)->count());
    }

    /**
     * Test 3: Kiriman ulang jalur kabel dengan Idempotency-Key sama tidak menggandakan data.
     */
    public function test_cable_track_submission_is_idempotent(): void
    {
        $uuid = 'client-track-uuid-555';

        $payload = [
            'client_uuid' => $uuid,
            'name' => 'Jalur Kabel ODP 1 ke ODP 2',
            'coordinates' => [
                [112.630000, -8.080000],
                [112.631000, -8.081000],
                [112.632000, -8.082000],
            ],
            'raw_points_count' => 15,
            'simplified_points_count' => 3,
            'total_length_meters' => 280.5,
        ];

        $res1 = $this->actingAs($this->technician)->postJson('/api/cable-tracks', $payload, [
            'Idempotency-Key' => $uuid,
        ]);
        $this->assertContains($res1->status(), [200, 201]);
        $this->assertEquals(1, CableTrack::where('client_uuid', $uuid)->count());

        $res2 = $this->actingAs($this->technician)->postJson('/api/cable-tracks', $payload, [
            'Idempotency-Key' => $uuid,
        ]);
        $this->assertContains($res2->status(), [200, 201]);
        $this->assertEquals(1, CableTrack::where('client_uuid', $uuid)->count());
    }

    /**
     * Test 4: Konflik koordinat ODP — koordinat yang sudah disetujui admin tidak ditimpa;
     * perubahan dari perangkat menjadi proposed_latitude/longitude dengan status needs_review.
     */
    public function test_approved_odp_coordinates_are_not_overwritten(): void
    {
        $approvedOdp = Odp::create([
            'code' => 'ODP-APP-01',
            'name' => 'ODP Approved Kantor',
            'latitude' => -8.080000,
            'longitude' => 112.630000,
            'port_capacity' => 8,
            'is_approved' => true,
            'status' => 'approved',
        ]);

        $payload = [
            'code' => 'ODP-APP-01',
            'name' => 'ODP Approved Kantor',
            'latitude' => -8.099999, // koordinat baru dari HP
            'longitude' => 112.699999,
        ];

        $response = $this->actingAs($this->technician)->postJson('/api/odps', $payload);
        $response->assertStatus(200);

        $fresh = $approvedOdp->fresh();
        // Koordinat asli tetap tidak berubah
        $this->assertEquals(-8.080000, (float) $fresh->latitude);
        $this->assertEquals(112.630000, (float) $fresh->longitude);
        // Koordinat usulan tersimpan terpisah
        $this->assertEquals(-8.099999, (float) $fresh->proposed_latitude);
        $this->assertEquals(112.699999, (float) $fresh->proposed_longitude);
        $this->assertEquals('needs_review', $fresh->status);
    }

    /**
     * Test 5: Dua perangkat memilih port yang sama menghasilkan satu konflik (port_conflict)
     * tanpa menolak kiriman.
     */
    public function test_port_conflict_detected_without_rejecting_submission(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-TEST-01',
            'name' => 'ODP Sentral 01',
            'latitude' => -8.080000,
            'longitude' => 112.630000,
            'port_capacity' => 8,
        ]);

        // Pelanggan A sudah menempati port 3
        Customer::create([
            'customer_code' => 'CUST-PORT-01',
            'name' => 'Pelanggan A Existing',
            'address' => 'Jl. Merdeka No 1',
            'phone' => '081234567890',
            'package' => '50 Mbps',
            'odp_id' => $odp->id,
            'odp_port' => 3,
            'status' => 'active',
        ]);

        $task = $this->createPsbTask('TSK-CONFLICT-01');

        $payload = [
            'odp_id' => $odp->id,
            'port' => 3, // Bentrok dengan Pelanggan A
            'onu_index' => '1',
            'redaman' => '-19.2',
            'latitude' => -8.080000,
            'longitude' => 112.630000,
        ];

        // Kirim Fase 1
        $response = $this->actingAs($this->technician)->postJson("/api/field/tickets/psb/{$task->id}/phase-1", $payload);

        // Pengiriman TIDAK ditolak (harus sukses 200)
        $response->assertStatus(200);

        $fresh = $task->fresh();
        $this->assertTrue((bool) $fresh->has_port_conflict);
        $this->assertContains('port_conflict', $fresh->review_flags ?? []);
        $this->assertEquals('needs_review', $fresh->review_status);
    }

    /**
     * Test 6: GET /api/network/sync?since= hanya mengembalikan perubahan.
     */
    public function test_network_sync_returns_only_changes_since_timestamp(): void
    {
        // 1. ODP lama dibuat 5 hari lalu
        $oldOdp = Odp::create([
            'code' => 'ODP-OLD-01',
            'name' => 'ODP Lama',
            'latitude' => -8.080000,
            'longitude' => 112.630000,
        ]);
        DB::table('odps')->where('id', $oldOdp->id)->update([
            'updated_at' => Carbon::now()->subDays(5)->format('Y-m-d H:i:s'),
            'created_at' => Carbon::now()->subDays(5)->format('Y-m-d H:i:s'),
        ]);

        // 2. ODP baru dibuat sekarang
        $newOdp = Odp::create([
            'code' => 'ODP-NEW-01',
            'name' => 'ODP Baru',
            'latitude' => -8.085000,
            'longitude' => 112.635000,
        ]);
        DB::table('odps')->where('id', $newOdp->id)->update([
            'updated_at' => Carbon::now()->format('Y-m-d H:i:s'),
            'created_at' => Carbon::now()->format('Y-m-d H:i:s'),
        ]);

        $sinceTimestamp = urlencode(Carbon::now()->subHours(2)->format('Y-m-d H:i:s'));

        $response = $this->actingAs($this->technician)->getJson("/api/network/sync?since={$sinceTimestamp}");

        $response->assertStatus(200);
        $data = $response->json('data.odps');

        $codes = collect($data)->pluck('code')->all();
        $this->assertContains('ODP-NEW-01', $codes);
        $this->assertNotContains('ODP-OLD-01', $codes);
    }

    /**
     * Test 7: Tiket bersih tanpa anomali review_status = none dan tidak masuk antrean needs_review.
     */
    public function test_clean_ticket_has_none_review_status(): void
    {
        $task = $this->createPsbTask('TSK-CLEAN-01');
        $workflow = app(PhaseWorkflowService::class);

        // Kunci requirement fase 2
        $workflow->lockPhase2Requirements($task, $this->technician);

        // Teknisi absen di dalam radius 50m dengan akurasi tinggi (bersih)
        $workflow->submitTicketAttendance($task, $this->technician, [
            'latitude' => -8.080000,
            'longitude' => 112.630000,
            'accuracy' => 10,
            'target_lat' => -8.080000,
            'target_lng' => 112.630000,
            'radius_meters' => 50,
            'captured_at' => now(),
        ]);

        $fresh = $task->fresh();
        $this->assertEquals('none', $fresh->review_status);
        $this->assertEmpty($fresh->review_flags ?? []);

        // Cek WorkOrderService: tidak masuk tab needs_review
        $workOrderService = app(WorkOrderService::class);
        $items = $workOrderService->getTechnicianWorkOrders($this->admin, ['tab' => 'needs_review']);
        $this->assertFalse($items->contains('ticket_number', $fresh->task_number));
    }

    /**
     * Test 8: Minta ulang (rework) tanpa alasan ditolak 422; dengan alasan mengembalikan status ke in_progress.
     */
    public function test_rework_validation_and_status_reversion(): void
    {
        $task = $this->createPsbTask('TSK-REWORK-01');
        $task->status = TaskStatus::COMPLETED;
        $task->review_status = 'needs_review';
        $task->save();

        // 1. Minta ulang tanpa alasan -> 422
        $res1 = $this->actingAs($this->admin)->postJson("/api/admin/tickets/psb/{$task->id}/review/rework", []);
        $res1->assertStatus(422);

        // 2. Minta ulang dengan alasan valid
        $res2 = $this->actingAs($this->admin)->postJson("/api/admin/tickets/psb/{$task->id}/review/rework", [
            'reason' => 'Foto sesudah belum jelas dan redaman -28 dBm melebihi ambang batas SOP',
        ]);
        $res2->assertStatus(200);

        $fresh = $task->fresh();
        $this->assertEquals('rework', $fresh->review_status);
        $this->assertEquals(TaskStatus::IN_PROGRESS, $fresh->status);
        $this->assertEquals($this->admin->id, $fresh->reviewed_by);

        // Cek jejak ticket_events
        $event = DB::table('ticket_events')
            ->where('eventable_id', $task->id)
            ->where('event', 'review_rework_requested')
            ->first();
        $this->assertNotNull($event);
        $this->assertEquals($this->admin->id, $event->actor_id);
    }

    /**
     * Test 9: Pengguna tanpa izin tickets.review tidak bisa menyetujui tiket (403).
     */
    public function test_user_without_permission_cannot_approve_review(): void
    {
        $unauthorizedUser = User::factory()->create(['status' => 'active']);
        // User baru tanpa role dan tanpa permission tickets.review

        $task = $this->createPsbTask('TSK-AUTH-01');

        $response = $this->actingAs($unauthorizedUser)->postJson("/api/admin/tickets/psb/{$task->id}/review/approve", [
            'note' => 'Coba menyetujui tanpa hak akses',
        ]);

        $response->assertStatus(403);
    }
}
