<?php

namespace Tests\Feature\Provisioning;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Enums\TaskStatus;
use App\Models\DailyAttendance;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ManualBfassProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $teknisi1;

    protected User $teknisi2;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'manage_provisioning']);

        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $adminRole->givePermissionTo('manage_provisioning');

        Role::firstOrCreate(['name' => 'Teknisi']);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin');

        // Create an eligible team with 2 members
        $this->teknisi1 = User::factory()->create(['team' => 'Team Alpha', 'status' => 'active']);
        $this->teknisi1->assignRole('Teknisi');

        $this->teknisi2 = User::factory()->create(['team' => 'Team Alpha', 'status' => 'active']);
        $this->teknisi2->assignRole('Teknisi');

        DailyAttendance::create([
            'user_id' => $this->teknisi1->id,
            'work_date' => now()->toDateString(),
            'status' => 'hadir',
            'check_in_at' => now(),
        ]);
    }

    public function test_manual_bfass_credentials_update_sets_status_to_ready_and_bfass_status_to_success()
    {
        $submission = Submission::factory()->create();

        $provisioning = Provisioning::factory()->create([
            'submission_id' => $submission->id,
            'status' => ProvisioningStatus::PENDING,
            'bfass_status' => BfassStatus::PENDING,
        ]);

        $payload = [
            'bfass_username' => 'user_test',
            'bfass_password' => 'pass_test',
            'vlan' => '100',
            'odp' => 'ODP-123',
            'onu_serial_number' => 'ALCL12345678',
            'notes' => 'Test manual injection',
        ];

        $response = $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$provisioning->id}/bfass-credentials", $payload);

        $response->assertStatus(200);

        $provisioning->refresh();

        // Verify Statuses
        $this->assertEquals(ProvisioningStatus::READY, $provisioning->status);
        $this->assertEquals(BfassStatus::SUCCESS, $provisioning->bfass_status);

        // Verify Data saved
        $this->assertEquals('user_test', $provisioning->bfass_username);
        $this->assertEquals('100', $provisioning->vlan);

        // Verify Task Creation
        $this->assertDatabaseHas('tasks', [
            'provisioning_id' => $provisioning->id,
            'assigned_team' => 'Team Alpha',
            'status' => TaskStatus::ASSIGNED->value,
        ]);

        $task = Task::where('provisioning_id', $provisioning->id)->first();

        // Verify Task Assignments Creation
        $this->assertEquals(2, TaskAssignment::where('task_id', $task->id)->count());

        $this->assertDatabaseHas('task_assignments', [
            'task_id' => $task->id,
            'user_id' => $this->teknisi1->id,
            'status' => 'assigned',
        ]);

        $this->assertDatabaseHas('task_assignments', [
            'task_id' => $task->id,
            'user_id' => $this->teknisi2->id,
            'status' => 'assigned',
        ]);
    }

    public function test_manual_bfass_credentials_update_fails_on_duplicate_username()
    {
        $submission1 = Submission::factory()->create();
        $provisioning1 = Provisioning::factory()->create([
            'submission_id' => $submission1->id,
            'bfass_username' => 'duplicate_user',
            'status' => ProvisioningStatus::READY,
            'bfass_status' => BfassStatus::SUCCESS,
        ]);

        $submission2 = Submission::factory()->create();
        $provisioning2 = Provisioning::factory()->create([
            'submission_id' => $submission2->id,
            'status' => ProvisioningStatus::PENDING,
            'bfass_status' => BfassStatus::PENDING,
        ]);

        $payload = [
            'bfass_username' => 'duplicate_user',
            'bfass_password' => 'pass_test',
            'vlan' => '100',
            'odp' => 'ODP-123',
            'onu_serial_number' => 'ALCL12345678',
            'notes' => 'Test duplicate username',
        ];

        $response = $this->actingAs($this->admin)->putJson("/api/admin/provisionings/{$provisioning2->id}/bfass-credentials", $payload);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Username BFASS sudah digunakan.',
            'errors' => [
                'bfass_username' => [
                    'Username BFASS sudah digunakan. Silakan gunakan username lain.',
                ],
            ],
        ]);
    }
}
