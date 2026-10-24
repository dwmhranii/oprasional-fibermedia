<?php

namespace Tests\Feature;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use App\Utils\IdentifierGenerator;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TraceabilityChainTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_full_traceability_chain_links_from_submission_to_customer_code(): void
    {
        $admin = User::factory()->create(['name' => 'Admin System']);
        $admin->assignRole('Admin');

        $sales = User::factory()->create(['name' => 'Sales Budi']);
        $sales->assignRole('Sales');

        $teknisi = User::factory()->create(['name' => 'Teknisi Joko']);
        $teknisi->assignRole('Teknisi');

        // 1. Sales creates submission
        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'customer_name' => 'Agus Pratama',
            'status' => SubmissionStatus::APPROVED,
        ]);

        // 2. Admin validates & creates provisioning
        $provisioning = Provisioning::create([
            'provisioning_number' => IdentifierGenerator::generate('PRV'),
            'submission_id' => $submission->id,
            'admin_id' => $admin->id,
            'bfass_username' => 'agus_fmp_101',
            'odp' => 'ODP-KBY-01',
            'status' => ProvisioningStatus::READY,
        ]);

        // 3. Task is created and assigned
        $task = Task::create([
            'task_number' => IdentifierGenerator::generate('TSK'),
            'provisioning_id' => $provisioning->id,
            'teknisi_id' => $teknisi->id,
            'assigned_by' => $admin->id,
            'scheduled_date' => now()->toDateString(),
            'status' => TaskStatus::ASSIGNED,
        ]);

        $assignment = TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $teknisi->id,
            'role' => 'lead',
            'status' => TaskAssignmentStatus::PHASE_2_COMPLETE,
        ]);

        // Verify initial chain
        $submission->refresh();
        $initialChain = $submission->service_chain;
        $this->assertEquals($submission->submission_number, $initialChain['submission_number']);
        $this->assertEquals($provisioning->provisioning_number, $initialChain['provisioning_number']);
        $this->assertEquals($task->task_number, $initialChain['task_number']);
        $this->assertNull($initialChain['customer_code']);

        // 4. Admin approves task assignment
        Sanctum::actingAs($admin);
        $response = $this->putJson("/api/admin/task-assignments/{$assignment->id}/approve");
        $response->assertStatus(200);

        // Verify completion and customer code generation
        $submission->refresh();
        $this->assertEquals(SubmissionStatus::COMPLETED, $submission->status);
        $this->assertNotNull($submission->customer_id);
        $this->assertStringStartsWith('FMP-', $submission->customer_code);
        $this->assertNotNull($submission->customer);
        $this->assertEquals('Agus Pratama', $submission->customer->name);

        // 5. Query Submission Resource API
        $apiResponse = $this->getJson("/api/admin/submissions/{$submission->id}");
        $apiResponse->assertStatus(200);
        $this->assertStringStartsWith('FMP-', $apiResponse->json('data.customer_code'));
        $this->assertEquals($submission->submission_number, $apiResponse->json('data.service_chain.submission_number'));
        $this->assertEquals($provisioning->provisioning_number, $apiResponse->json('data.service_chain.provisioning_number'));
        $this->assertEquals($task->task_number, $apiResponse->json('data.service_chain.task_number'));
        $this->assertStringStartsWith('FMP-', $apiResponse->json('data.service_chain.customer_code'));
    }
}
