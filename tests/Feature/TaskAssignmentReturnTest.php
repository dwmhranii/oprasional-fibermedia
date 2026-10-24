<?php

namespace Tests\Feature;

use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TaskAssignmentReturnTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected $teknisi;

    protected $task;

    protected $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'Superadmin']);
        $adminRole = Role::create(['name' => 'Admin']);
        $teknisiRole = Role::create(['name' => 'Teknisi']);

        Permission::create(['name' => 'assign_tasks']);
        $viewAssignedTasks = Permission::create(['name' => 'view_assigned_tasks']);
        $updateTaskStatus = Permission::create(['name' => 'update_task_status']);
        $teknisiRole->givePermissionTo($viewAssignedTasks);
        $teknisiRole->givePermissionTo($updateTaskStatus);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        $this->teknisi = User::factory()->create();
        $this->teknisi->assignRole('Teknisi');

        $this->task = Task::factory()->create([
            'status' => TaskStatus::PHASE_1_SUBMITTED,
            'return_count' => 0,
        ]);

        $this->assignment = TaskAssignment::create([
            'task_id' => $this->task->id,
            'user_id' => $this->teknisi->id,
            'status' => TaskAssignmentStatus::PHASE_2_COMPLETE,
        ]);
    }

    public function test_return_without_notes()
    {
        $response = $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$this->assignment->id}/return", []);

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_assignments', [
            'id' => $this->assignment->id,
            'status' => 'returned',
            'notes' => null,
        ]);
    }

    public function test_return_with_notes_persisted_and_received_by_technician()
    {
        $note = 'Please retake the attendance photo.';
        $response = $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$this->assignment->id}/return", [
            'notes' => $note,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_assignments', [
            'id' => $this->assignment->id,
            'status' => 'returned',
            'notes' => $note,
        ]);

        // Technician receives notes via GET /api/teknisi/tasks/{id}
        $techResponse = $this->actingAs($this->teknisi)->getJson("/api/teknisi/tasks/{$this->task->id}");
        $techResponse->assertStatus(200);

        $techResponse->assertJsonPath('data.current_assignment.notes', $note);
    }

    public function test_existing_3_return_escalation_still_works()
    {
        $this->task->update(['return_count' => 2]);

        $note = 'Final warning before escalation.';
        $response = $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$this->assignment->id}/return", [
            'notes' => $note,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('task_assignments', [
            'id' => $this->assignment->id,
            'status' => 'escalated',
            'notes' => $note,
        ]);

        $this->assertDatabaseHas('tasks', [
            'id' => $this->task->id,
            'return_count' => 3,
            'status' => 'phase_1_submitted', // remains unchanged
        ]);
    }

    public function test_approval_workflow_regression()
    {
        $response = $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$this->assignment->id}/approve");

        $response->assertStatus(200);
        $this->assertDatabaseHas('task_assignments', [
            'id' => $this->assignment->id,
            'status' => 'approved',
        ]);
    }

    public function test_technician_can_reupload_photos_and_resubmit_phase2_when_returned()
    {
        Storage::fake('public');

        // Admin returns the assignment with notes
        $returnResp = $this->actingAs($this->admin)->putJson("/api/admin/task-assignments/{$this->assignment->id}/return", [
            'notes' => 'Foto bukti tidak jelas, tolong diunggah kembali.',
        ]);
        $returnResp->assertStatus(200);

        $this->assertDatabaseHas('task_assignments', [
            'id' => $this->assignment->id,
            'status' => 'returned',
        ]);

        // Setup evidence & photos on task
        $file = UploadedFile::fake()->create('after_fixed.jpg', 100, 'image/jpeg');
        $uploadResp = $this->actingAs($this->teknisi)->postJson("/api/teknisi/tasks/{$this->task->id}/upload-photo", [
            'photo' => $file,
            'photo_type' => 'after',
        ]);
        $uploadResp->assertStatus(200);
        $uploadResp->assertJsonPath('already_completed', null);

        // Upload attendance selfie
        $selfieFile = UploadedFile::fake()->create('selfie.jpg', 100, 'image/jpeg');
        $selfieResp = $this->actingAs($this->teknisi)->postJson("/api/teknisi/tasks/{$this->task->id}/upload-photo", [
            'photo' => $selfieFile,
            'photo_type' => 'selfie',
        ]);
        $selfieResp->assertStatus(200);

        // Technician re-submits Phase 2
        $submission = $this->task->provisioning?->submission;
        $lat = $submission ? $submission->lat : -6.200000;
        $lng = $submission ? $submission->lng : 106.816666;

        $resubmitResp = $this->actingAs($this->teknisi)->postJson("/api/teknisi/tasks/{$this->task->id}/phase-2", [
            'completion_notes' => 'Foto perbaikan sudah diunggah ulang.',
            'latitude' => $lat,
            'longitude' => $lng,
            'accuracy' => 10,
        ]);

        $resubmitResp->assertStatus(200);
        $this->assertDatabaseHas('task_assignments', [
            'id' => $this->assignment->id,
            'status' => 'phase_2_complete',
        ]);
    }
}
