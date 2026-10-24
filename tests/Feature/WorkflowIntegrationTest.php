<?php

namespace Tests\Feature;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Jobs\CreateBFASSAccount;
use App\Models\DailyAttendance;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkflowIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed roles and permissions before each test
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_critical_business_workflow_from_start_to_finish(): void
    {
        // Fake the queue to isolate background integration job
        Queue::fake();

        // 1. Sales creates submission
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        Sanctum::actingAs($sales);

        $payload = [
            'customer_name' => 'Jane Doe',
            'nik' => '9876543210987654',
            'phone' => '081999999999',
            'email' => 'janedoe@example.com',
            'address' => 'Jl. Thamrin',
            'district' => 'Menteng',
            'city' => 'Jakarta Pusat',
            'province' => 'DKI Jakarta',
            'package_name' => 'Fiber 100Mbps',
            'package_speed' => '100',
            'package_price' => 450000,
            'installation_fee' => 150000,
        ];

        $response = $this->postJson('/api/sales/submissions', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'message', 'data' => ['submission_number', 'id']]);

        $submissionId = $response->json('data.id');

        $this->assertDatabaseHas('submissions', [
            'id' => $submissionId,
            'customer_name' => 'Jane Doe',
            'status' => SubmissionStatus::PENDING->value,
            'user_id' => $sales->id,
        ]);

        // 2. Admin validates submission
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        Sanctum::actingAs($admin);

        $validationPayload = [
            'status' => 'approved',
            'validation_notes' => 'Passed credit review.',
        ];

        $submission = Submission::find($submissionId);
        $response = $this->putJson("/api/admin/submissions/{$submission->id}/validate", $validationPayload);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('submissions', [
            'id' => $submissionId,
            'status' => SubmissionStatus::APPROVED->value,
            'validated_by' => $admin->id,
        ]);

        // 3. Provisioning was automatically created during validation
        $provisioning = Provisioning::where('submission_id', $submissionId)->first();
        $this->assertNotNull($provisioning);
        $this->assertEquals(ProvisioningStatus::PENDING->value, $provisioning->status->value);
        $provisioningId = $provisioning->id;

        // DEPRECATED: Assert job was pushed to queue (We no longer use CreateBFASSAccount)
        // Queue::assertPushed(CreateBFASSAccount::class);

        // 4. Setup eligible team with 2 technicians
        $teknisi1 = User::factory()->create(['team' => 'Team FTTH', 'status' => 'active']);
        $teknisi1->assignRole('Teknisi');
        $teknisi2 = User::factory()->create(['team' => 'Team FTTH', 'status' => 'active']);
        $teknisi2->assignRole('Teknisi');

        DailyAttendance::create([
            'user_id' => $teknisi1->id,
            'work_date' => now()->toDateString(),
            'status' => 'hadir',
            'check_in_at' => now(),
        ]);

        // Admin enters BFASS credentials manually and triggers Task assignment
        $bfassPayload = [
            'bfass_username' => 'testuser',
            'bfass_password' => 'secret123',
            'vlan' => '100',
            'odp' => 'ODP-01',
            'onu_serial_number' => 'ZTE123456',
        ];

        $response = $this->putJson("/api/admin/provisionings/{$provisioningId}/bfass-credentials", $bfassPayload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // Task assignment should happen automatically through Round Robin
        // Let's assert the task was created
        $task = Task::where('provisioning_id', $provisioningId)->first();
        $this->assertNotNull($task);
        $taskId = $task->id;

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'assigned_team' => 'Team FTTH',
            'status' => TaskStatus::ASSIGNED->value,
        ]);

        // 5. Technician updates status to on_the_way
        Sanctum::actingAs($teknisi1);

        $response = $this->putJson("/api/teknisi/tasks/{$taskId}/status", [
            'status' => 'on_the_way',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'status' => TaskStatus::ON_THE_WAY->value,
        ]);

        // Transition status to in_progress
        $response = $this->putJson("/api/teknisi/tasks/{$taskId}/status", [
            'status' => 'in_progress',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'status' => TaskStatus::IN_PROGRESS->value,
        ]);

        // 5.5 Upload signature
        $signature = UploadedFile::fake()->create('signature.jpg', 100, 'image/jpeg');
        $response = $this->postJson("/api/teknisi/tasks/{$taskId}/upload-signature", [
            'signature' => $signature,
        ]);
        $response->assertStatus(200);

        // 5.6 Complete Checklist
        $taskModel = Task::with('checklistItems')->find($taskId);
        if ($taskModel && $taskModel->checklistItems->count() > 0) {
            $checklistPayload = [
                'items' => $taskModel->checklistItems->map(fn ($item) => [
                    'id' => $item->id,
                    'item_name' => $item->item_name,
                    'is_completed' => true,
                ])->toArray(),
            ];
            $this->putJson("/api/teknisi/tasks/{$taskId}/checklist", $checklistPayload)->assertStatus(200);
        }

        // 6. Technician completes Phase 1
        $this->postJson("/api/teknisi/tasks/{$taskId}/upload-signature", [
            'signature' => UploadedFile::fake()->create('sig.png', 10, 'image/png'),
        ]);
        $this->postJson("/api/teknisi/tasks/{$taskId}/upload-photo", [
            'photo' => UploadedFile::fake()->create('b.png', 10, 'image/png'),
            'photo_type' => 'before',
        ]);
        $this->postJson("/api/teknisi/tasks/{$taskId}/upload-photo", [
            'photo' => UploadedFile::fake()->create('a.png', 10, 'image/png'),
            'photo_type' => 'after',
        ]);

        $this->actingAs($teknisi1)->postJson("/api/teknisi/tasks/{$taskId}/phase-1")->assertStatus(200);

        // Tech 1 submits Phase 2
        $this->actingAs($teknisi1)->postJson("/api/teknisi/tasks/{$taskId}/upload-photo", [
            'photo' => UploadedFile::fake()->create('s.png', 10, 'image/png'),
            'photo_type' => 'selfie',
        ]);

        $completePayload = [
            'completion_notes' => 'Installation finished successfully. Modem activated.',
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'accuracy' => 12.5,
        ];

        $this->actingAs($teknisi1)->postJson("/api/teknisi/tasks/{$taskId}/phase-2", $completePayload)->assertStatus(200);

        // Tech 2 must also submit selfie and Phase 2
        $this->actingAs($teknisi2)->postJson("/api/teknisi/tasks/{$taskId}/upload-photo", [
            'photo' => UploadedFile::fake()->create('s2.png', 10, 'image/png'),
            'photo_type' => 'selfie',
        ]);
        $this->actingAs($teknisi2)->postJson("/api/teknisi/tasks/{$taskId}/phase-2", $completePayload)->assertStatus(200);

        // Admin approves all assignments
        $task = Task::find($taskId);
        foreach ($task->assignments as $assignment) {
            $this->actingAs($admin)->putJson("/api/admin/task-assignments/{$assignment->id}/approve")->assertStatus(200);
        }

        // 7. Submission becomes completed
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'status' => TaskStatus::COMPLETED->value,
            'result' => 'success',
        ]);

        $this->assertDatabaseHas('provisionings', [
            'id' => $provisioningId,
            'status' => ProvisioningStatus::SUCCESS->value,
        ]);

        $this->assertDatabaseHas('submissions', [
            'id' => $submissionId,
            'status' => 'completed',
        ]);
    }
}
