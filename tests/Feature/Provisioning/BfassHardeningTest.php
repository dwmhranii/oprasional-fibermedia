<?php

namespace Tests\Feature\Provisioning;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Jobs\CreateBFASSAccount;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\User;
use App\Notifications\ProvisioningFailedNotification;
use App\Services\BfassHealthCheckService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BfassHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Superadmin']);
        Role::firstOrCreate(['name' => 'Sales']);

        $permission = Permission::firstOrCreate(['name' => 'manage_provisioning']);
        $adminRole->givePermissionTo($permission);
    }

    private function createAdmin(): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole('Admin');

        return $user;
    }

    private function createSubmission(): Submission
    {
        return Submission::factory()->create([
            'status' => SubmissionStatus::APPROVED,
        ]);
    }

    public function test_duplicate_provisioning_is_rejected_with_409()
    {
        $admin = $this->createAdmin();
        $submission = $this->createSubmission();

        // Create initial provisioning
        Provisioning::factory()->create([
            'submission_id' => $submission->id,
            'idempotency_key' => 'sub_'.$submission->id,
        ]);

        $response = $this->actingAs($admin)->postJson('/api/admin/provisionings', [
            'submission_id' => $submission->id,
            'service_type' => 'PPPOE',
            'nas_server' => 'NAS-01',
            'nas_ip' => '192.168.1.1',
            'bandwidth_profile' => '100M',
            'bandwidth_up' => 100000,
            'bandwidth_down' => 100000,
        ]);

        $response->assertStatus(409)
            ->assertJson(['message' => 'Provisioning already exists for this submission.']);
    }

    public function test_idempotency_key_is_generated_on_creation()
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $submission = $this->createSubmission();

        $response = $this->actingAs($admin)->postJson('/api/admin/provisionings', [
            'submission_id' => $submission->id,
            'service_type' => 'PPPOE',
            'nas_server' => 'NAS-01',
            'nas_ip' => '192.168.1.1',
            'bandwidth_profile' => '100M',
            'bandwidth_up' => 100000,
            'bandwidth_down' => 100000,
        ]);

        $response->assertStatus(201);
        $provisioning = Provisioning::where('submission_id', $submission->id)->first();

        $this->assertNotNull($provisioning->idempotency_key);
        $this->assertEquals('sub_'.$submission->id, $provisioning->idempotency_key);
    }

    public function test_health_check_passes_when_bfass_is_reachable()
    {
        Http::fake([
            '*/api/v1/health' => Http::response(['status' => 'ok'], 200),
        ]);

        $service = app(BfassHealthCheckService::class);
        $result = $service->check();

        $this->assertTrue($result['reachable']);
        $this->assertTrue($result['auth_valid']);
    }

    public function test_health_check_fails_gracefully_when_bfass_is_down()
    {
        Http::fake([
            '*/api/v1/health' => Http::response(null, 500),
        ]);

        $service = app(BfassHealthCheckService::class);
        $result = $service->check();

        $this->assertTrue($result['reachable']);
        $this->assertNotNull($result['error']);
    }

    public function test_provisioning_job_aborts_when_health_check_fails()
    {
        Notification::fake();
        Http::fake([
            '*/api/v1/health' => Http::response(null, 500),
        ]);

        $admin = $this->createAdmin();
        $provisioning = Provisioning::factory()->create([
            'status' => ProvisioningStatus::PENDING,
            'bfass_status' => BfassStatus::PENDING,
        ]);

        $job = new CreateBFASSAccount($provisioning);
        $job->handle(app(BfassHealthCheckService::class));

        $provisioning->refresh();

        $this->assertEquals(ProvisioningStatus::FAILED, $provisioning->status);
        $this->assertEquals('health_check_failure', $provisioning->failure_reason);

        Notification::assertSentTo(
            $admin,
            ProvisioningFailedNotification::class,
            function ($notification, $channels) use ($admin) {
                return $notification->toArray($admin)['reason'] === 'BFASS Health Check Failed';
            }
        );
    }

    public function test_retry_endpoint_does_not_create_duplicate_record()
    {
        Queue::fake();

        $admin = $this->createAdmin();
        $provisioning = Provisioning::factory()->create([
            'status' => ProvisioningStatus::FAILED,
            'bfass_status' => BfassStatus::FAILED,
            'retry_count' => 1,
        ]);

        $countBefore = Provisioning::count();

        $response = $this->actingAs($admin)->postJson("/api/admin/provisionings/{$provisioning->id}/retry");

        $response->assertStatus(200);
        $this->assertEquals($countBefore, Provisioning::count());
        Queue::assertPushed(CreateBFASSAccount::class);
    }

    public function test_superadmin_is_notified_after_max_failed_retries()
    {
        Notification::fake();
        Http::fake([
            '*/api/v1/health' => Http::response(['status' => 'ok'], 200),
        ]);

        config(['services.bfass.mock_force_fail' => true]);
        config(['services.bfass.max_retries' => 3]);

        $admin = $this->createAdmin();
        $provisioning = Provisioning::factory()->create([
            'status' => ProvisioningStatus::FAILED,
            'bfass_status' => BfassStatus::FAILED,
            'retry_count' => 2,
        ]);

        $job = new CreateBFASSAccount($provisioning);

        try {
            $job->handle(app(BfassHealthCheckService::class));
        } catch (\Exception $e) {
            // Should not re-throw if max retries reached
        }

        $provisioning->refresh();
        $this->assertEquals(3, $provisioning->retry_count);
        $this->assertEquals(ProvisioningStatus::FAILED, $provisioning->status);
        $this->assertEquals('max_retries_reached', $provisioning->failure_reason);

        Notification::assertSentTo(
            $admin,
            ProvisioningFailedNotification::class,
            function ($notification, $channels) use ($admin) {
                return $notification->toArray($admin)['reason'] === 'Max Retries Reached';
            }
        );
    }

    public function test_health_check_endpoint_requires_authentication()
    {
        $response = $this->getJson('/api/admin/bfass/health');
        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_access_health_check()
    {
        $salesUser = User::factory()->create(['status' => 'active']);
        $salesUser->assignRole('Sales');

        $response = $this->actingAs($salesUser)->getJson('/api/admin/bfass/health');
        $response->assertStatus(403);
    }
}
