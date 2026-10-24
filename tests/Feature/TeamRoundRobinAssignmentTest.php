<?php

namespace Tests\Feature;

use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Models\DailyAttendance;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\SubmissionDocument;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TeamRoundRobinAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected $teamATech1;

    protected $teamATech2;

    protected $teamBTech1;

    protected $teamBTech2;

    protected $teamCTech1;

    protected $teamCTech2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
        Storage::fake('local');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $this->teamATech1 = User::factory()->create(['team' => 'Team A', 'status' => 'active']);
        $this->teamATech1->assignRole('Teknisi');
        $this->teamATech2 = User::factory()->create(['team' => 'Team A', 'status' => 'active']);
        $this->teamATech2->assignRole('Teknisi');

        $this->teamBTech1 = User::factory()->create(['team' => 'Team B', 'status' => 'active']);
        $this->teamBTech1->assignRole('Teknisi');
        $this->teamBTech2 = User::factory()->create(['team' => 'Team B', 'status' => 'active']);
        $this->teamBTech2->assignRole('Teknisi');

        $this->teamCTech1 = User::factory()->create(['team' => 'Team C', 'status' => 'active']);
        $this->teamCTech1->assignRole('Teknisi');
        $this->teamCTech2 = User::factory()->create(['team' => 'Team C', 'status' => 'active']);
        $this->teamCTech2->assignRole('Teknisi');

        // Pastikan order_index urut Team A = 1, Team B = 2, Team C = 3
        Team::where('name', 'Team A')->update(['order_index' => 1]);
        Team::where('name', 'Team B')->update(['order_index' => 2]);
        Team::where('name', 'Team C')->update(['order_index' => 3]);

        // Teknisi hadir hari ini
        foreach ([$this->teamATech1, $this->teamBTech1, $this->teamCTech1] as $tech) {
            DailyAttendance::create([
                'user_id' => $tech->id,
                'work_date' => now()->toDateString(),
                'status' => 'hadir',
                'check_in_at' => now(),
            ]);
        }
    }

    protected function createApprovedSubmission()
    {
        $submission = Submission::factory()->create(['status' => 'pending']);

        SubmissionDocument::create([
            'submission_id' => $submission->id,
            'document_type' => 'ktp',
            'path' => 'dummy.jpg',
            'original_name' => 'dummy.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'is_active' => true,
            'status' => 'approved',
        ]);

        return $submission;
    }

    public function test_team_rotation_and_assignment_creation()
    {
        // Scenario 1: First submission -> Team A
        $sub1 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub1->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov1 = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov1->id}/bfass-credentials", [
            'bfass_username' => 'test1',
            'bfass_password' => 'pass1',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task1 = Task::latest('id')->first();
        $this->assertEquals('Team A', $task1->assigned_team);
        $this->assertCount(2, $task1->assignments); // Two assignments created for Team A

        // Scenario 2: Second submission -> Team B
        $sub2 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub2->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov2 = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov2->id}/bfass-credentials", [
            'bfass_username' => 'test2',
            'bfass_password' => 'pass2',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task2 = Task::latest('id')->first();
        $this->assertEquals('Team B', $task2->assigned_team);
        $this->assertCount(2, $task2->assignments);

        // Scenario 3: Third submission -> Team C
        $sub3 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub3->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov3 = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov3->id}/bfass-credentials", [
            'bfass_username' => 'test3',
            'bfass_password' => 'pass3',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task3 = Task::latest('id')->first();
        $this->assertEquals('Team C', $task3->assigned_team);

        // Scenario 4: Fourth submission -> wraps to Team A
        $sub4 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub4->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov4 = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov4->id}/bfass-credentials", [
            'bfass_username' => 'test4',
            'bfass_password' => 'pass4',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task4 = Task::latest('id')->first();
        $this->assertEquals('Team A', $task4->assigned_team);
    }

    public function test_independent_evidence_upload()
    {
        $sub1 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub1->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov->id}/bfass-credentials", [
            'bfass_username' => 'test',
            'bfass_password' => 'pass',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task = Task::first();
        $assignment1 = $task->assignments()->where('user_id', $this->teamATech1->id)->first();
        $assignment2 = $task->assignments()->where('user_id', $this->teamATech2->id)->first();

        // Scenario 4 & 5: Tech 1 uploads signature (shared)
        $file1 = UploadedFile::fake()->create('sig1.png', 100, 'image/png');
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-signature", [
            'signature' => $file1,
        ])->assertStatus(200);

        $task->refresh();
        $this->assertNotNull($task->customer_signature_path);

        // Tech 1 uploads selfie
        $fileSelfie1 = UploadedFile::fake()->create('selfie1.png', 100, 'image/png');
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", [
            'photo' => $fileSelfie1,
            'photo_type' => 'selfie',
        ])->assertStatus(200);

        $this->assertNotNull($assignment1->refresh()->evidence->attendance_photo_path);
        $this->assertNull($assignment2->evidence);

        // Tech 2 uploads selfie
        $fileSelfie2 = UploadedFile::fake()->create('selfie2.png', 100, 'image/png');
        $this->actingAs($this->teamATech2)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", [
            'photo' => $fileSelfie2,
            'photo_type' => 'selfie',
        ])->assertStatus(200);

        $this->assertNotNull($assignment2->refresh()->evidence->attendance_photo_path);
        $this->assertNotEquals($assignment1->refresh()->evidence->attendance_photo_path, $assignment2->evidence->attendance_photo_path);
    }

    public function test_parent_task_completion_logic()
    {
        $sub1 = $this->createApprovedSubmission();
        $sub1->update(['lat' => 10.123, 'lng' => 20.123]);
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub1->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov->id}/bfass-credentials", [
            'bfass_username' => 'test',
            'bfass_password' => 'pass',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task = Task::first();
        $task->update(['status' => TaskStatus::IN_PROGRESS]); // Force status for transition guard

        $assignment1 = $task->assignments()->where('user_id', $this->teamATech1->id)->first();
        $assignment2 = $task->assignments()->where('user_id', $this->teamATech2->id)->first();

        // Shared Verification
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-signature", ['signature' => UploadedFile::fake()->create('sig1.png', 100, 'image/png')]);
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('b.png', 100, 'image/png'), 'photo_type' => 'before']);
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('a.png', 100, 'image/png'), 'photo_type' => 'after']);

        // Tech 1 submits phase 1
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/phase-1")->assertStatus(200);

        // Tech 1 submits phase 2
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('s1.png', 10, 'image/png'), 'photo_type' => 'selfie']);
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/phase-2", [
            'completion_notes' => 'done 1',
            'latitude' => $sub1->lat ?? 10.123,
            'longitude' => $sub1->lng ?? 20.123,
        ])->assertStatus(200);

        // Tech 2 submits phase 2
        $this->actingAs($this->teamATech2)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('s2.png', 10, 'image/png'), 'photo_type' => 'selfie']);
        $this->actingAs($this->teamATech2)->postJson("/api/teknisi/tasks/{$task->id}/phase-2", [
            'completion_notes' => 'done 2',
            'latitude' => $sub1->lat ?? 10.124,
            'longitude' => $sub1->lng ?? 20.124,
        ])->assertStatus(200);

        $this->assertEquals(TaskAssignmentStatus::PHASE_2_COMPLETE, $assignment1->refresh()->status);
        $this->assertEquals(TaskAssignmentStatus::PHASE_2_COMPLETE, $assignment2->refresh()->status);

        // Scenario 6: Parent task remains PHASE_1_SUBMITTED initially
        $this->assertEquals('phase_1_submitted', $task->refresh()->status->value);

        // Admin approves assignment 1
        $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$assignment1->id}/approve")->assertStatus(200);
        $this->assertEquals('phase_1_submitted', $task->refresh()->status->value); // Still not fully completed

        // Scenario 7: Admin approves assignment 2 -> Task becomes COMPLETED
        $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$assignment2->id}/approve")->assertStatus(200);

        $this->assertEquals('completed', $task->refresh()->status->value);
        $this->assertEquals('success', $task->provisioning->status->value);
        $this->assertEquals('completed', $task->provisioning->submission->status->value);
    }

    public function test_assignment_isolation_and_checklist_update()
    {
        $sub1 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub1->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov->id}/bfass-credentials", [
            'bfass_username' => 'test',
            'bfass_password' => 'pass',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task = Task::first();
        $this->assertEquals('assigned', $task->status->value);

        $task->refresh();

        // Both technicians update their own checklists
        $this->actingAs($this->teamATech1)->putJson("/api/teknisi/tasks/{$task->id}/checklist", [
            'items' => [['item_name' => 'Modem Configured', 'is_completed' => true]],
        ])->assertStatus(200);

        $this->actingAs($this->teamATech2)->putJson("/api/teknisi/tasks/{$task->id}/checklist", [
            'items' => [['item_name' => 'Cabling Done', 'is_completed' => true]],
        ])->assertStatus(200);

        $this->actingAs($this->teamATech1)->putJson("/api/teknisi/tasks/{$task->id}/status", [
            'status' => 'on_the_way',
        ])->assertStatus(200);

        $this->actingAs($this->teamATech1)->putJson("/api/teknisi/tasks/{$task->id}/status", [
            'status' => 'in_progress',
        ])->assertStatus(200);

        // Idempotency Check
        $this->actingAs($this->teamATech2)->putJson("/api/teknisi/tasks/{$task->id}/status", [
            'status' => 'in_progress',
        ])->assertStatus(200); // Should be 200 now!

        $assignment1 = $task->assignments()->where('user_id', $this->teamATech1->id)->first();
        $assignment2 = $task->assignments()->where('user_id', $this->teamATech2->id)->first();

        // Assignment status should remain 'assigned' for both, parent task handles transition
        $this->assertEquals(TaskAssignmentStatus::ASSIGNED, $assignment1->status);
        $this->assertEquals(TaskAssignmentStatus::ASSIGNED, $assignment2->status);

        // Parent task should be IN_PROGRESS
        $this->assertEquals('in_progress', $task->refresh()->status->value);

        // TaskResource returns specific response
        $response = $this->actingAs($this->teamATech1)->getJson("/api/teknisi/tasks/{$task->id}");
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals('Team A', $data['assigned_team']);
        $this->assertNotNull($data['current_assignment']);
        $this->assertEquals($assignment1->id, $data['current_assignment']['id']);
        $this->assertEquals(2, $data['progress']['total']);
    }

    public function test_task_visibility_for_all_team_members()
    {
        $sub1 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub1->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov->id}/bfass-credentials", [
            'bfass_username' => 'test',
            'bfass_password' => 'pass',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task = Task::first();

        // Tech 1 should see the task
        $response1 = $this->actingAs($this->teamATech1)->getJson('/api/teknisi/tasks');
        $response1->assertStatus(200);
        $this->assertCount(1, $response1->json('data'));
        $this->assertEquals($task->id, $response1->json('data.0.id'));

        // Tech 2 should see the SAME task
        $response2 = $this->actingAs($this->teamATech2)->getJson('/api/teknisi/tasks');
        $response2->assertStatus(200);
        $this->assertCount(1, $response2->json('data'));
        $this->assertEquals($task->id, $response2->json('data.0.id'));

        // Tech from another team should NOT see the task
        $response3 = $this->actingAs($this->teamBTech1)->getJson('/api/teknisi/tasks');
        $response3->assertStatus(200);
        $this->assertCount(0, $response3->json('data'));
    }

    public function test_shared_verification_cannot_be_overwritten()
    {
        $sub1 = $this->createApprovedSubmission();
        $this->actingAs($this->admin)->putJson("/api/admin/submissions/{$sub1->id}/validate", [
            'status' => 'approved',
        ])->assertStatus(200);
        $prov = Provisioning::latest('id')->first();
        $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$prov->id}/bfass-credentials", [
            'bfass_username' => 'test',
            'bfass_password' => 'pass',
            'vlan' => '100', 'odp' => 'O-1', 'onu_serial_number' => 'ZTE1',
        ])->assertStatus(200);

        $task = Task::first();
        $task->update(['status' => TaskStatus::IN_PROGRESS]);

        // Upload 1: signature
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-signature", ['signature' => UploadedFile::fake()->create('sig1.png', 100, 'image/png')])->assertStatus(200);
        // Upload 2: before
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('b.png', 100, 'image/png'), 'photo_type' => 'before'])->assertStatus(200);
        // Upload 3: after (This completes the shared verification)
        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('a.png', 100, 'image/png'), 'photo_type' => 'after'])->assertStatus(200);

        // Try to overwrite after completion
        $this->actingAs($this->teamATech2)->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", ['photo' => UploadedFile::fake()->create('b2.png', 100, 'image/png'), 'photo_type' => 'before'])
            ->assertStatus(200)
            ->assertJsonPath('already_completed', true);

        $this->actingAs($this->teamATech1)->postJson("/api/teknisi/tasks/{$task->id}/upload-signature", ['signature' => UploadedFile::fake()->create('sig2.png', 100, 'image/png')])
            ->assertStatus(200)
            ->assertJsonPath('already_completed', true);
    }
}
