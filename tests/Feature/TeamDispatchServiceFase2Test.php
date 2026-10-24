<?php

namespace Tests\Feature;

use App\Models\AssignmentLog;
use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\OfficeLocation;
use App\Models\Provisioning;
use App\Models\RoundRobinPointer;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\TeamDispatchService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TeamDispatchServiceFase2Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Superadmin']);
        Role::firstOrCreate(['name' => 'Teknisi']);
        Role::firstOrCreate(['name' => 'Sales']);
    }

    private function createPsbTask(string $number = 'TSK-001', string $status = 'pending'): Task
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('Sales');
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('Admin');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'customer_name' => 'Pelanggan PSB Test',
            'status' => 'approved',
        ]);

        $provisioning = Provisioning::create([
            'provisioning_number' => 'PRV-'.uniqid(),
            'submission_id' => $submission->id,
            'admin_id' => $admin->id,
            'status' => 'ready',
        ]);

        return Task::create([
            'task_number' => $number,
            'provisioning_id' => $provisioning->id,
            'status' => $status,
        ]);
    }

    private function createComplaint(string $number = 'CMP-001', string $status = 'open'): Complaint
    {
        $creator = User::factory()->create(['status' => 'active']);
        $creator->assignRole('Admin');

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

    private function setupTeams(int $count = 4): array
    {
        $teams = [];
        for ($i = 1; $i <= $count; $i++) {
            $team = Team::create([
                'name' => 'Tim '.chr(64 + $i), // Tim A, Tim B, Tim C, Tim D
                'order_index' => $i,
                'is_active' => true,
            ]);

            $user1 = User::factory()->create(['name' => "Teknisi {$team->name} 1", 'status' => 'active', 'team' => $team->name]);
            $user1->assignRole('Teknisi');
            $user2 = User::factory()->create(['name' => "Teknisi {$team->name} 2", 'status' => 'active', 'team' => $team->name]);
            $user2->assignRole('Teknisi');

            TeamMember::create(['team_id' => $team->id, 'user_id' => $user1->id, 'joined_at' => now()]);
            TeamMember::create(['team_id' => $team->id, 'user_id' => $user2->id, 'joined_at' => now()]);

            $teams[] = [
                'team' => $team,
                'users' => [$user1, $user2],
            ];
        }

        return $teams;
    }

    private function getStatusValue($ticket): string
    {
        $status = $ticket->status;

        return $status instanceof \BackedEnum ? $status->value : (string) $status;
    }

    private function checkInUser(User $user, ?Carbon $date = null): DailyAttendance
    {
        $workDate = ($date ?? Carbon::today())->toDateString();

        return DailyAttendance::create([
            'user_id' => $user->id,
            'work_date' => $workDate,
            'status' => 'hadir',
            'check_in_at' => now(),
            'check_out_at' => null,
            'office_distance_meters' => 20,
        ]);
    }

    /**
     * Tes 1: Giliran urut dan terpisah untuk PSB vs gangguan.
     */
    public function test_round_robin_sequential_and_separate_for_psb_and_complaint(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(4);

        // Semua 4 tim hadir (member 1 masing-masing hadir)
        foreach ($teams as $t) {
            $this->checkInUser($t['users'][0]);
        }

        // 1. PSB Task 1 -> Tim A
        $task1 = $this->createPsbTask('TSK-101');
        $resPsb1 = $dispatchService->assign($task1, 'psb');
        $this->assertTrue($resPsb1['assigned']);
        $this->assertEquals($teams[0]['team']->id, $task1->fresh()->assigned_team_id);

        // 2. PSB Task 2 -> Tim B
        $task2 = $this->createPsbTask('TSK-102');
        $resPsb2 = $dispatchService->assign($task2, 'psb');
        $this->assertTrue($resPsb2['assigned']);
        $this->assertEquals($teams[1]['team']->id, $task2->fresh()->assigned_team_id);

        // 3. Complaint 1 -> Mulai dari Tim A (karena pointer complaint terpisah dan masih baru!)
        $cmp1 = $this->createComplaint('CMP-201');
        $resCmp1 = $dispatchService->assign($cmp1, 'complaint');
        $this->assertTrue($resCmp1['assigned']);
        $this->assertEquals($teams[0]['team']->id, $cmp1->fresh()->assigned_team_id);

        // 4. PSB Task 3 -> Lanjut ke Tim C (tidak terganggu oleh Complaint)
        $task3 = $this->createPsbTask('TSK-103');
        $resPsb3 = $dispatchService->assign($task3, 'psb');
        $this->assertTrue($resPsb3['assigned']);
        $this->assertEquals($teams[2]['team']->id, $task3->fresh()->assigned_team_id);

        // 5. Complaint 2 -> Lanjut ke Tim B
        $cmp2 = $this->createComplaint('CMP-202');
        $resCmp2 = $dispatchService->assign($cmp2, 'complaint');
        $this->assertTrue($resCmp2['assigned']);
        $this->assertEquals($teams[1]['team']->id, $cmp2->fresh()->assigned_team_id);

        // Verifikasi pointer di database
        $psbPointer = RoundRobinPointer::where('queue_type', 'psb')->first();
        $cmpPointer = RoundRobinPointer::where('queue_type', 'complaint')->first();

        $this->assertEquals($teams[2]['team']->id, $psbPointer->last_team_id);
        $this->assertEquals($teams[1]['team']->id, $cmpPointer->last_team_id);
    }

    /**
     * Tes 2: Tim tidak siap / libur dilewati secara berurut.
     */
    public function test_unready_and_off_duty_teams_are_skipped(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(4);

        // Hanya Tim A (index 0) dan Tim C (index 2) yang hadir. Tim B dan Tim D libur (tidak absen).
        $this->checkInUser($teams[0]['users'][0]);
        $this->checkInUser($teams[2]['users'][0]);

        // Tiket 1 -> Tim A
        $task1 = $this->createPsbTask('TSK-SKIP-01');
        $dispatchService->assign($task1, 'psb');
        $this->assertEquals($teams[0]['team']->id, $task1->fresh()->assigned_team_id);

        // Tiket 2 -> Melewati Tim B (karena libur) -> Langsung Tim C!
        $task2 = $this->createPsbTask('TSK-SKIP-02');
        $dispatchService->assign($task2, 'psb');
        $this->assertEquals($teams[2]['team']->id, $task2->fresh()->assigned_team_id);

        // Tiket 3 -> Melewati Tim D (libur) dan kembali ke Tim A!
        $task3 = $this->createPsbTask('TSK-SKIP-03');
        $dispatchService->assign($task3, 'psb');
        $this->assertEquals($teams[0]['team']->id, $task3->fresh()->assigned_team_id);
    }

    /**
     * Tes 3: 50 request paralel tidak menghasilkan tiket ganda atau giliran melompat keliru.
     */
    public function test_50_parallel_dispatch_requests_no_duplicates_and_correct_ordering(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(4);

        // Keempat tim hadir
        foreach ($teams as $t) {
            $this->checkInUser($t['users'][0]);
        }

        $assignedTeamIds = [];

        // Simulasi 50 penugasan tiket berurutan dengan transaksi atomic lockForUpdate
        for ($i = 1; $i <= 50; $i++) {
            $task = $this->createPsbTask("TSK-PARALLEL-{$i}");
            $res = $dispatchService->assign($task, 'psb');

            $this->assertTrue($res['assigned'], "Tiket {$i} harus berhasil ditugaskan");
            $this->assertEquals('assigned', $this->getStatusValue($task->fresh()));

            $assignedTeamIds[] = $task->fresh()->assigned_team_id;
        }

        $this->assertCount(50, $assignedTeamIds);

        // Verifikasi perputaran rotasi: 1, 2, 3, 4, 1, 2, 3, 4, ...
        for ($i = 0; $i < 50; $i++) {
            $expectedTeamIndex = $i % 4;
            $expectedTeamId = $teams[$expectedTeamIndex]['team']->id;
            $this->assertEquals(
                $expectedTeamId,
                $assignedTeamIds[$i],
                'Tiket urutan ke-'.($i + 1)." harus ditugaskan ke Tim index {$expectedTeamIndex}"
            );
        }

        // Cek log penugasan memiliki 50 baris 'assigned' tanpa ganda
        $assignedLogCount = DB::table('assignment_logs')
            ->where('action', 'assigned')
            ->where('ticket_type', 'psb')
            ->count();
        $this->assertEquals(50, $assignedLogCount);
    }

    /**
     * Tes 4: Oper sampai batas max_oper lalu dialihkan ke admin.
     */
    public function test_handover_reassigns_up_to_max_oper_then_escalates_to_admin(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(4);

        foreach ($teams as $t) {
            $this->checkInUser($t['users'][0]);
        }

        // Set max_oper = 3
        DB::table('dispatch_settings')->updateOrInsert(
            ['key' => 'max_oper'],
            ['value' => json_encode(3), 'ticket_type' => null]
        );
        DB::table('dispatch_settings')->whereNull('key')->update(['max_oper' => 3]);

        // 1. Tiket awal ditugaskan ke Tim A
        $task = $this->createPsbTask('TSK-TIMEOUT-01');
        $dispatchService->assign($task, 'psb');
        $this->assertEquals($teams[0]['team']->id, $task->fresh()->assigned_team_id);
        $this->assertEquals(0, $task->fresh()->reassign_count);

        // Oper 1 (timeout): reassign ke Tim B
        $res1 = $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertTrue($res1['assigned']);
        $this->assertEquals($teams[1]['team']->id, $task->fresh()->assigned_team_id);
        $this->assertEquals(1, $task->fresh()->reassign_count);

        // Oper 2 (timeout): reassign ke Tim C
        $res2 = $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertTrue($res2['assigned']);
        $this->assertEquals($teams[2]['team']->id, $task->fresh()->assigned_team_id);
        $this->assertEquals(2, $task->fresh()->reassign_count);

        // Oper 3 (timeout): reassign ke Tim D
        $res3 = $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertTrue($res3['assigned']);
        $this->assertEquals($teams[3]['team']->id, $task->fresh()->assigned_team_id);
        $this->assertEquals(3, $task->fresh()->reassign_count);

        // Oper 4: Mencapai batas max_oper (3) -> Tiket dielevasi ke status 'escalated_to_admin'
        $res4 = $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertFalse($res4['reassigned']);
        $this->assertEquals('escalated_to_admin', $res4['status']);

        $finalTask = $task->fresh();
        $this->assertEquals('escalated_to_admin', $this->getStatusValue($finalTask));
        $this->assertNull($finalTask->assigned_team_id);

        // Cek log assignment mencatat eskalasi timeout
        $hasTimeoutLog = DB::table('assignment_logs')
            ->where('assignable_id', $task->id)
            ->where('action', 'timeout')
            ->exists();
        $this->assertTrue($hasTimeoutLog);
    }

    /**
     * Tes 5: Tiket tertunda otomatis terbagi saat ada teknisi absen masuk.
     */
    public function test_pending_tickets_dispatched_automatically_when_technician_checks_in(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(2);

        // Belum ada teknisi yang absen sama sekali
        // Buat 1 task PSB dan 1 Complaint -> Harus jadi 'unassigned'
        $task = $this->createPsbTask('TSK-PENDING-01');
        $resPsb = $dispatchService->assign($task, 'psb');
        $this->assertFalse($resPsb['assigned']);
        $this->assertEquals('unassigned', $this->getStatusValue($task->fresh()));

        $complaint = $this->createComplaint('CMP-PENDING-01');
        $resCmp = $dispatchService->assign($complaint, 'complaint');
        $this->assertFalse($resCmp['assigned']);
        $this->assertEquals('unassigned', $this->getStatusValue($complaint->fresh()));

        // Teknisi Tim A melakukan absen masuk melalui endpoint /api/attendance/check-in
        $tech = $teams[0]['users'][0];

        // Office terdekat
        $office = OfficeLocation::create([
            'name' => 'Kantor Pusat',
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'radius_meters' => 50,
            'is_active' => true,
        ]);

        $response = $this->actingAs($tech)->postJson('/api/attendance/check-in', [
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'accuracy' => 10,
            'selfie_base64' => 'data:image/jpeg;base64,'.base64_encode('fake-jpg-content-selfie'),
        ]);

        $response->assertStatus(200);

        // Karena teknisi Tim A telah hadir, hook absensi langsung membagi tiket tertunda!
        $this->assertEquals('assigned', $this->getStatusValue($task->fresh()));
        $this->assertEquals($teams[0]['team']->id, $task->fresh()->assigned_team_id);

        $this->assertEquals('assigned', $this->getStatusValue($complaint->fresh()));
        $this->assertEquals($teams[0]['team']->id, $complaint->fresh()->assigned_team_id);
    }

    /**
     * Tes 6: Anggota tim yang libur tidak menahan tim untuk menerima tiket.
     */
    public function test_off_duty_member_does_not_hold_back_team(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(2);

        $teamA = $teams[0]['team'];
        $member1 = $teams[0]['users'][0];
        $member2 = $teams[0]['users'][1]; // Libur (tidak absen)

        // Member 1 absen hadir
        $this->checkInUser($member1);

        // Dengan min_members_present = 1 (default), Tim A harus tetap siap dan dapat menerima tiket
        $task = $this->createPsbTask('TSK-ONE-PRESENT');
        $res = $dispatchService->assign($task, 'psb');

        $this->assertTrue($res['assigned']);
        $this->assertEquals($teamA->id, $task->fresh()->assigned_team_id);

        // Member 1 dapat langsung menerima tiket atas nama tim via endpoint accept
        $response = $this->actingAs($member1)->postJson("/api/field/tickets/psb/{$task->id}/accept");
        $response->assertStatus(200);

        $freshTask = $task->fresh();
        $this->assertEquals('in_progress', $this->getStatusValue($freshTask));
        $this->assertEquals($member1->id, $freshTask->accepted_by_id);
        $this->assertNotNull($freshTask->accepted_at);
    }

    /**
     * Tes 7: PWA Accept dan Decline dengan alasan wajib.
     */
    public function test_pwa_accept_and_decline_ticket_actions(): void
    {
        $dispatchService = app(TeamDispatchService::class);
        $teams = $this->setupTeams(3);

        foreach ($teams as $t) {
            $this->checkInUser($t['users'][0]);
        }

        // Tiket ditugaskan ke Tim A
        $task = $this->createPsbTask('TSK-PWA-ACTIONS');
        $dispatchService->assign($task, 'psb');
        $this->assertEquals($teams[0]['team']->id, $task->fresh()->assigned_team_id);

        $memberTeamA = $teams[0]['users'][0];

        // Decline tiket dengan alasan
        $declineResponse = $this->actingAs($memberTeamA)->postJson("/api/field/tickets/psb/{$task->id}/decline", [
            'reason' => 'Peralatan OTDR sedang dalam perbaikan',
        ]);

        $declineResponse->assertStatus(200);
        $declineResponse->assertJson(['success' => true]);

        // Tiket harus langsung dioper ke Tim B!
        $freshTask = $task->fresh();
        $this->assertEquals($teams[1]['team']->id, $freshTask->assigned_team_id);
        $this->assertEquals(1, $freshTask->reassign_count);

        // Cek log penolakan tercatat di assignment_logs
        $declineLog = AssignmentLog::where('assignable_id', $task->id)
            ->where('action', 'declined')
            ->first();
        $this->assertNotNull($declineLog);
        $this->assertEquals('Peralatan OTDR sedang dalam perbaikan', $declineLog->reason);

        // Anggota Tim B menerima tiket
        $memberTeamB = $teams[1]['users'][0];
        $acceptResponse = $this->actingAs($memberTeamB)->postJson("/api/field/tickets/psb/{$task->id}/accept");
        $acceptResponse->assertStatus(200);

        $this->assertEquals('in_progress', $this->getStatusValue($task->fresh()));
        $this->assertEquals($memberTeamB->id, $task->fresh()->accepted_by_id);
    }

    /**
     * Tes 8: Endpoint admin pengaturan dispatch dan penugasan manual dengan alasan.
     */
    public function test_admin_dispatch_settings_and_manual_assignment(): void
    {
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('Admin');

        $teams = $this->setupTeams(2);

        // 1. Update Dispatch Settings via API
        $settingsResponse = $this->actingAs($admin)->putJson('/api/admin/dispatch-settings', [
            'min_members_present' => 2,
            'accept_timeout_menit' => 30,
            'max_oper' => 4,
        ]);

        $settingsResponse->assertStatus(200);
        $settingsResponse->assertJsonPath('data.min_members_present', 2);
        $settingsResponse->assertJsonPath('data.accept_timeout_menit', 30);
        $settingsResponse->assertJsonPath('data.max_oper', 4);

        // 2. Manual Assign unassigned task with mandatory reason
        $task = $this->createPsbTask('TSK-MANUAL-01', 'unassigned');

        $manualResponse = $this->actingAs($admin)->postJson('/api/admin/dispatch/manual-assign', [
            'ticket_type' => 'psb',
            'ticket_id' => $task->id,
            'team_id' => $teams[1]['team']->id,
            'reason' => 'Prioritas penugasan khusus area VIP',
        ]);

        $manualResponse->assertStatus(200);
        $this->assertEquals($teams[1]['team']->id, $task->fresh()->assigned_team_id);
        $this->assertEquals('assigned', $this->getStatusValue($task->fresh()));

        // Cek riwayat assignment_logs mencatat alasan manual
        $log = AssignmentLog::where('assignable_id', $task->id)
            ->where('action', 'assigned')
            ->first();
        $this->assertNotNull($log);
        $this->assertStringContainsString('Prioritas penugasan khusus area VIP', $log->reason);
        $this->assertEquals($admin->id, $log->actor_id);
    }
}
