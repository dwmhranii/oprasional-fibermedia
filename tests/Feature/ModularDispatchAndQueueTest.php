<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\Provisioning;
use App\Models\RoundRobinPointer;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Modules\Dispatch\Services\DispatchService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModularDispatchAndQueueTest extends TestCase
{
    use RefreshDatabase;

    private function createPsbTask(string $number = 'TSK-001', string $status = 'pending'): Task
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
            'task_number' => $number,
            'provisioning_id' => $provisioning->id,
            'status' => $status,
        ]);
    }

    private function createComplaint(string $ticketNumber = 'CMP-001', string $status = 'open'): Complaint
    {
        $creator = User::factory()->create(['status' => 'active']);

        return Complaint::create([
            'ticket_number' => $ticketNumber,
            'created_by_id' => $creator->id,
            'customer_name' => 'John',
            'customer_phone' => '0812345678',
            'customer_address' => 'Jl. Test',
            'area' => 'Kota A',
            'subject' => 'Internet Mati',
            'description' => 'Lampu PON merah',
            'category' => 'no_signal',
            'status' => $status,
        ]);
    }

    public function test_two_separate_queues_for_psb_and_complaint(): void
    {
        $dispatchService = new DispatchService;
        $today = Carbon::today()->toDateString();

        // Buat 2 tim aktif
        $team1 = Team::create(['name' => 'Tim 1', 'order_index' => 1, 'is_active' => true]);
        $team2 = Team::create(['name' => 'Tim 2', 'order_index' => 2, 'is_active' => true]);

        $user1 = User::factory()->create(['status' => 'active']);
        $user2 = User::factory()->create(['status' => 'active']);

        TeamMember::create(['team_id' => $team1->id, 'user_id' => $user1->id, 'joined_at' => now()]);
        TeamMember::create(['team_id' => $team2->id, 'user_id' => $user2->id, 'joined_at' => now()]);

        // Kedua tim hadir hari ini
        DailyAttendance::create(['user_id' => $user1->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);
        DailyAttendance::create(['user_id' => $user2->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);

        // 1. Dispatch Task PSB 1 -> harus dapat Tim 1
        $task1 = $this->createPsbTask('TSK-001', 'pending');
        $res1 = $dispatchService->assign($task1, 'psb');
        $this->assertTrue($res1['assigned']);
        $this->assertEquals($team1->id, $task1->fresh()->assigned_team_id);

        // 2. Dispatch Complaint 1 -> antrean terpisah, harus mulai dari Tim 1 juga!
        $complaint1 = $this->createComplaint('CMP-001', 'open');
        $resC1 = $dispatchService->assign($complaint1, 'complaint');
        $this->assertTrue($resC1['assigned']);
        $this->assertEquals($team1->id, $complaint1->fresh()->assigned_team_id);

        // 3. Pointer PSB dan Complaint tersimpan terpisah di round_robin_pointers
        $psbPointer = RoundRobinPointer::where('queue_type', 'psb')->first();
        $cmpPointer = RoundRobinPointer::where('queue_type', 'complaint')->first();

        $this->assertNotNull($psbPointer);
        $this->assertNotNull($cmpPointer);
        $this->assertEquals($team1->id, $psbPointer->last_team_id);
        $this->assertEquals($team1->id, $cmpPointer->last_team_id);

        // 4. Dispatch Task PSB 2 -> giliran bergeser ke Tim 2
        $task2 = $this->createPsbTask('TSK-002', 'pending');
        $res2 = $dispatchService->assign($task2, 'psb');
        $this->assertEquals($team2->id, $task2->fresh()->assigned_team_id);
        $this->assertEquals($team2->id, $psbPointer->fresh()->last_team_id);
    }

    public function test_unassigned_when_no_team_is_ready_and_auto_dispatched_when_ready(): void
    {
        $dispatchService = new DispatchService;
        $today = Carbon::today()->toDateString();

        $team = Team::create(['name' => 'Tim Solo', 'order_index' => 1, 'is_active' => true]);
        $user = User::factory()->create(['status' => 'active']);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $user->id, 'joined_at' => now()]);

        // Belum ada anggota yang absen: tiket harus masuk status unassigned (Aturan 3)
        $task = $this->createPsbTask('TSK-UNASSIGNED', 'pending');
        $result = $dispatchService->assign($task, 'psb');

        $this->assertFalse($result['assigned']);
        $this->assertEquals('unassigned', $task->fresh()->status->value);
        $this->assertNotNull($task->fresh()->unassigned_since);

        // Teknisi absen masuk: jalankan dispatchUnassigned()
        DailyAttendance::create(['user_id' => $user->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);

        $dispatched = $dispatchService->dispatchUnassigned();
        $this->assertEquals(1, $dispatched['psb']);
        $this->assertEquals('assigned', $task->fresh()->status->value);
        $this->assertEquals($team->id, $task->fresh()->assigned_team_id);
    }

    public function test_timeout_reassign_to_next_team_and_escalate_to_admin(): void
    {
        $dispatchService = new DispatchService;
        $today = Carbon::today()->toDateString();

        $team1 = Team::create(['name' => 'Tim 1', 'order_index' => 1, 'is_active' => true]);
        $team2 = Team::create(['name' => 'Tim 2', 'order_index' => 2, 'is_active' => true]);

        $user1 = User::factory()->create(['status' => 'active']);
        $user2 = User::factory()->create(['status' => 'active']);

        TeamMember::create(['team_id' => $team1->id, 'user_id' => $user1->id, 'joined_at' => now()]);
        TeamMember::create(['team_id' => $team2->id, 'user_id' => $user2->id, 'joined_at' => now()]);

        DailyAttendance::create(['user_id' => $user1->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);
        DailyAttendance::create(['user_id' => $user2->id, 'work_date' => $today, 'status' => 'hadir', 'check_in_at' => now()]);

        $task = $this->createPsbTask('TSK-TIMEOUT', 'pending');
        $dispatchService->assign($task, 'psb');
        $this->assertEquals($team1->id, $task->fresh()->assigned_team_id);

        // 1. Reassign 1 (Timeout) -> Oper ke Tim 2 (Aturan 4)
        $reassign1 = $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertTrue($reassign1['assigned']);
        $this->assertEquals($team2->id, $task->fresh()->assigned_team_id);
        $this->assertEquals(1, $task->fresh()->reassign_count);

        // 2. Reassign 2 -> Oper kembali ke Tim 1
        $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertEquals(2, $task->fresh()->reassign_count);

        // 3. Reassign 3 -> Oper ke Tim 2
        $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertEquals(3, $task->fresh()->reassign_count);

        // 4. Setelah mencapai batas oper (3 kali) -> Oper ke admin (Aturan 4)
        $reassign4 = $dispatchService->reassignOnTimeout($task->fresh(), 'psb');
        $this->assertEquals('escalated_to_admin', $reassign4['status']);
        $this->assertEquals('escalated_to_admin', $task->fresh()->status->value);
    }
}
