<?php

namespace Tests\Feature\Notifications;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Events\ProvisioningCompleted;
use App\Events\SubmissionApproved;
use App\Events\SubmissionCreated;
use App\Events\SubmissionRejected;
use App\Events\TaskAssigned;
use App\Events\TaskCompleted;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RealtimeNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware();

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Superadmin']);
        Role::firstOrCreate(['name' => 'Sales']);
        Role::firstOrCreate(['name' => 'Teknisi']);

        Permission::firstOrCreate(['name' => 'update_task_status']);
    }

    private function createUser(string $role): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        return $user;
    }

    public function test_submission_created_broadcasts_to_admin_channel()
    {
        Event::fake([SubmissionCreated::class]);

        $submission = Submission::factory()->create();

        Event::assertDispatched(SubmissionCreated::class, function ($event) use ($submission) {
            $channels = $event->broadcastOn();

            return $event->submissionId === $submission->id &&
                   $channels[0]->name === 'private-admins';
        });
    }

    public function test_submission_approved_broadcasts_to_sales_channel()
    {
        $submission = Submission::factory()->create(['status' => SubmissionStatus::PENDING]);

        Event::fake([SubmissionApproved::class]);

        $submission->update(['status' => SubmissionStatus::APPROVED]);

        Event::assertDispatched(SubmissionApproved::class, function ($event) use ($submission) {
            $channels = $event->broadcastOn();

            return $event->submissionId === $submission->id &&
                   $channels[0]->name === 'private-sales.'.$submission->user_id;
        });
    }

    public function test_submission_rejected_broadcasts_to_sales_channel()
    {
        $submission = Submission::factory()->create(['status' => SubmissionStatus::PENDING]);

        Event::fake([SubmissionRejected::class]);

        $submission->update([
            'status' => SubmissionStatus::REJECTED,
            'rejection_reason' => 'Missing documents',
        ]);

        Event::assertDispatched(SubmissionRejected::class, function ($event) use ($submission) {
            $channels = $event->broadcastOn();

            return $event->submissionId === $submission->id &&
                   $event->reason === 'Missing documents' &&
                   $channels[0]->name === 'private-sales.'.$submission->user_id;
        });
    }

    public function test_provisioning_completed_broadcasts_to_admin_channel()
    {
        $provisioning = Provisioning::factory()->create(['status' => ProvisioningStatus::PROCESSING]);

        Event::fake([ProvisioningCompleted::class]);

        $provisioning->update(['status' => ProvisioningStatus::SUCCESS]);

        Event::assertDispatched(ProvisioningCompleted::class, function ($event) use ($provisioning) {
            $channels = $event->broadcastOn();

            return $event->provisioningId === $provisioning->id &&
                   $channels[0]->name === 'private-admins';
        });
    }

    public function test_task_assigned_broadcasts_to_technician_channel()
    {
        Event::fake([TaskAssigned::class]);

        $task = Task::factory()->create();

        Event::assertDispatched(TaskAssigned::class, function ($event) use ($task) {
            $channels = $event->broadcastOn();

            return $event->taskId === $task->id &&
                   $channels[0]->name === 'private-technician.'.$task->teknisi_id;
        });
    }

    public function test_task_completed_broadcasts_to_admin_channel()
    {
        $task = Task::factory()->create(['status' => TaskStatus::ASSIGNED]);

        Event::fake([TaskCompleted::class]);

        $task->update(['status' => TaskStatus::COMPLETED]);

        Event::assertDispatched(TaskCompleted::class, function ($event) use ($task) {
            $channels = $event->broadcastOn();

            return $event->taskId === $task->id &&
                   $channels[0]->name === 'private-admins';
        });
    }

    public function test_non_admin_cannot_subscribe_admin_channel()
    {
        config(['broadcasting.default' => 'reverb']);
        config(['broadcasting.connections.reverb.key' => 'testing']);
        config(['broadcasting.connections.reverb.secret' => 'testing']);
        config(['broadcasting.connections.reverb.app_id' => 'testing']);

        $sales = $this->createUser('Sales');

        $response = $this->actingAs($sales)->postJson('/broadcasting/auth', [
            'channel_name' => 'private-admins',
            'socket_id' => '123.123',
        ]);

        $response->assertStatus(403);
    }

    public function test_sales_cannot_subscribe_other_sales_channel()
    {
        config(['broadcasting.default' => 'reverb']);
        config(['broadcasting.connections.reverb.key' => 'testing']);
        config(['broadcasting.connections.reverb.secret' => 'testing']);
        config(['broadcasting.connections.reverb.app_id' => 'testing']);

        $sales1 = $this->createUser('Sales');
        $sales2 = $this->createUser('Sales');

        $response = $this->actingAs($sales1)->postJson('/broadcasting/auth', [
            'channel_name' => 'private-sales.'.$sales2->id,
            'socket_id' => '123.123',
        ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_subscribe_other_technician_channel()
    {
        config(['broadcasting.default' => 'reverb']);
        config(['broadcasting.connections.reverb.key' => 'testing']);
        config(['broadcasting.connections.reverb.secret' => 'testing']);
        config(['broadcasting.connections.reverb.app_id' => 'testing']);

        $tech1 = $this->createUser('Teknisi');
        $tech2 = $this->createUser('Teknisi');

        $response = $this->actingAs($tech1)->postJson('/broadcasting/auth', [
            'channel_name' => 'private-technician.'.$tech2->id,
            'socket_id' => '123.123',
        ]);

        $response->assertStatus(403);
    }
}
