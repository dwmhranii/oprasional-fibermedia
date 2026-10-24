<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\DailyAttendance;
use App\Models\Phase2Requirement;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Modules\Field\Services\GeofenceService;
use App\Modules\Field\Services\PhaseWorkflowService;
use App\Modules\Kpi\Services\KpiService;
use Carbon\Carbon;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class GeofenceAndPhaseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createPsbTask(): Task
    {
        $sales = User::factory()->create(['status' => 'active']);
        $admin = User::factory()->create(['status' => 'active']);
        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'customer_name' => 'Budi Test',
            'status' => 'approved',
        ]);
        $provisioning = Provisioning::create([
            'provisioning_number' => 'PRV-'.uniqid(),
            'submission_id' => $submission->id,
            'admin_id' => $admin->id,
            'status' => 'ready',
        ]);

        return Task::create([
            'task_number' => 'TSK-'.uniqid(),
            'provisioning_id' => $provisioning->id,
            'status' => TaskStatus::ASSIGNED,
        ]);
    }

    public function test_geofence_status_marks_correctly_and_enforces_50m_minimum(): void
    {
        $geofenceService = new GeofenceService;

        // Target: Monas Jakarta (-6.175392, 106.827153)
        $targetLat = -6.175392;
        $targetLng = 106.827153;

        // 1. Akurasi buruk (> radius default 50m) -> harus low_accuracy (Aturan 7)
        $resLowAcc = $geofenceService->evaluate(
            $targetLat,
            $targetLng,
            -6.175400,
            106.827160,
            80.0, // GPS accuracy 80m > 50m
            30.0  // input radius 30m harus dinaikkan otomatis ke minimal 50m
        );
        $this->assertEquals('low_accuracy', $resLowAcc['status']);
        $this->assertEquals(50.0, $resLowAcc['radius_meters']); // radius minimum 50m

        // 2. Di dalam lokasi (< 50m) dengan akurasi GPS bagus (10m) -> inside
        $resInside = $geofenceService->evaluate(
            $targetLat,
            $targetLng,
            -6.175400,
            106.827160,
            10.0,
            50.0
        );
        $this->assertEquals('inside', $resInside['status']);
        $this->assertTrue($resInside['distance_meters'] < 50.0);

        // 3. Di luar lokasi (> 50m, misalnya 500m jauhnya) -> outside (hanya menandai, tidak error)
        $resOutside = $geofenceService->evaluate(
            $targetLat,
            $targetLng,
            -6.180000,
            106.827153,
            10.0,
            50.0
        );
        $this->assertEquals('outside', $resOutside['status']);
        $this->assertTrue($resOutside['distance_meters'] > 50.0);

        // 4. Tanpa koordinat GPS -> unverified
        $resUnverified = $geofenceService->evaluate(
            $targetLat,
            $targetLng,
            null,
            null,
            null,
            50.0
        );
        $this->assertEquals('unverified', $resUnverified['status']);
    }

    public function test_phase_2_locks_present_members_on_phase_1_submit_and_allows_waiver(): void
    {
        $workflowService = app(PhaseWorkflowService::class);
        $today = Carbon::today()->toDateString();

        // Siapkan tim dengan 2 anggota
        $team = Team::create(['name' => 'Tim Bravo', 'order_index' => 1, 'is_active' => true]);
        $user1 = User::factory()->create(['status' => 'active', 'name' => 'Teknisi 1']);
        $user2 = User::factory()->create(['status' => 'active', 'name' => 'Teknisi 2']);

        TeamMember::create(['team_id' => $team->id, 'user_id' => $user1->id, 'joined_at' => now()]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $user2->id, 'joined_at' => now()]);

        // Keduanya absen masuk hari ini
        DailyAttendance::create(['user_id' => $user1->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);
        DailyAttendance::create(['user_id' => $user2->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);

        $task = $this->createPsbTask();
        $task->update(['assigned_team_id' => $team->id]);
        $task = $task->fresh();

        // Fase 1 disubmit -> daftar anggota yang hadir dikunci (Aturan 6)
        $requirements = $workflowService->lockPhase2Requirements($task, $user1);
        $this->assertCount(2, $requirements);

        $lockedUserIds = Phase2Requirement::where('assignable_type', get_class($task))
            ->where('assignable_id', $task->id)
            ->pluck('user_id')
            ->toArray();
        $this->assertContains($user1->id, $lockedUserIds);
        $this->assertContains($user2->id, $lockedUserIds);

        // Anggota 1 submit selfie tiket
        $attendance = $workflowService->submitTicketAttendance($task, $user1, [
            'latitude' => -6.175400,
            'longitude' => 106.827160,
            'accuracy' => 10.0,
            'selfie_content' => 'fake_selfie_image_bytes',
            'radius_meters' => 50,
        ]);
        $this->assertNotNull($attendance);

        // user2 belum submit -> belum lengkap
        $this->assertFalse($workflowService->isPhase2FullyCompleted($task));

        // Admin membebaskan user2 dengan alasan (Aturan 6)
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('Admin');
        $waivedReq = $workflowService->waivePhase2Requirement($task, $user2->id, $admin, 'Sakit mendadak di lokasi');
        $this->assertEquals('Sakit mendadak di lokasi', $waivedReq->waive_reason);
        $this->assertEquals($admin->id, $waivedReq->waived_by_id);

        // Sekarang semua syarat Fase 2 sudah terpenuhi (1 hadir, 1 waived)
        $this->assertTrue($workflowService->isPhase2FullyCompleted($task));
    }

    public function test_kpi_service_and_whatsapp_customer_rating(): void
    {
        $kpiService = new KpiService;
        $admin = User::factory()->create(['status' => 'active']);
        $task = $this->createPsbTask();

        // 1. Simpan rating pelanggan 1-5 dari WhatsApp (Aturan 11)
        $updatedTask = $kpiService->recordCustomerRating('psb', $task->id, 5, 'Pelayanan sangat ramah dan cepat', $admin);
        $this->assertEquals(5, $updatedTask->customer_rating);
        $this->assertEquals('Pelayanan sangat ramah dan cepat', $updatedTask->rating_note);
        $this->assertEquals($admin->id, $updatedTask->rated_by_id);

        // 2. Hitung KPI tim
        $team = Team::create(['name' => 'Tim KPI', 'order_index' => 1, 'is_active' => true]);
        $user = User::factory()->create(['status' => 'active']);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $user->id, 'joined_at' => now()]);

        $period = date('Y-m');
        $kpiTeam = $kpiService->computeTeamKpi($period, $team->id);
        $this->assertArrayHasKey('metrics', $kpiTeam);
        $this->assertArrayHasKey('average_rating', $kpiTeam['metrics']);
        $this->assertArrayHasKey('attendance_rate', $kpiTeam['metrics']);

        // 3. Hitung KPI sales tanpa komisi (Aturan 11)
        $salesUser = User::factory()->create(['status' => 'active']);
        $kpiSales = $kpiService->computeSalesKpi($period, $salesUser->id);
        $this->assertArrayHasKey('metrics', $kpiSales);
        $this->assertArrayHasKey('completed_submissions', $kpiSales['metrics']);
        $this->assertArrayNotHasKey('commission_amount', $kpiSales['metrics']); // Menegaskan TIDAK ADA komisi
    }

    public function test_idempotency_middleware_caches_and_replays(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('Admin');
        Sanctum::actingAs($admin);

        $task = $this->createPsbTask();

        $idempotencyKey = 'test-idemp-'.uniqid();
        $payload = [
            'ticket_type' => 'psb',
            'ticket_id' => $task->id,
            'rating' => 5,
            'note' => 'Rating pertama kali via WhatsApp',
        ];

        // Request pertama (POST)
        $response1 = $this->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/admin/kpi/rating', $payload);

        $response1->assertStatus(200);
        $this->assertFalse($response1->headers->has('X-Idempotent-Replay'));

        // Request kedua dengan key yang sama -> replay dari cache
        $response2 = $this->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/admin/kpi/rating', $payload);

        $response2->assertStatus(200);
        $this->assertTrue($response2->headers->has('X-Idempotent-Replay'));
        $this->assertEquals('true', $response2->headers->get('X-Idempotent-Replay'));
    }
}
