<?php

namespace Tests\Feature\Sla;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Models\Provisioning;
use App\Models\SlaBreach;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use App\Notifications\SlaBreachNotification;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SlaMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder'])->run();
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('Admin');

        return $admin;
    }

    public function test_pending_submission_creates_breach()
    {
        $submission = Submission::factory()->create([
            'status' => SubmissionStatus::PENDING,
            'created_at' => now()->subHours(25),
        ]);

        Artisan::call('sla:check-pending-validation');

        $this->assertDatabaseHas('sla_breaches', [
            'breach_type' => 'pending_validation',
            'entity_type' => Submission::class,
            'entity_id' => $submission->id,
        ]);
    }

    public function test_failed_provisioning_creates_breach()
    {
        $provisioning = Provisioning::factory()->create([
            'status' => ProvisioningStatus::FAILED,
            'retry_count' => 3,
        ]);

        Artisan::call('sla:check-provisioning');

        $this->assertDatabaseHas('sla_breaches', [
            'breach_type' => 'provisioning_failure',
            'entity_type' => Provisioning::class,
            'entity_id' => $provisioning->id,
        ]);
    }

    public function test_delayed_task_creates_breach()
    {
        $task = Task::factory()->create([
            'status' => TaskStatus::ASSIGNED,
            'scheduled_date' => now()->subDays(1),
        ]);

        Artisan::call('sla:check-installation');

        $this->assertDatabaseHas('sla_breaches', [
            'breach_type' => 'delayed_installation',
            'entity_type' => Task::class,
            'entity_id' => $task->id,
        ]);
    }

    public function test_duplicate_breach_not_created()
    {
        $submission = Submission::factory()->create([
            'status' => SubmissionStatus::PENDING,
            'created_at' => now()->subHours(25),
        ]);

        Artisan::call('sla:check-pending-validation');
        Artisan::call('sla:check-pending-validation'); // call again

        $this->assertEquals(1, SlaBreach::where('entity_id', $submission->id)->count());
    }

    public function test_breach_is_resolved_when_condition_clears()
    {
        $submission = Submission::factory()->create([
            'status' => SubmissionStatus::PENDING,
            'created_at' => now()->subHours(25),
        ]);

        Artisan::call('sla:check-pending-validation');

        $this->assertDatabaseHas('sla_breaches', [
            'entity_id' => $submission->id,
            'resolved_at' => null,
        ]);

        $submission->update(['status' => SubmissionStatus::APPROVED]);

        $this->assertDatabaseMissing('sla_breaches', [
            'entity_id' => $submission->id,
            'resolved_at' => null,
        ]);
    }

    public function test_admin_can_view_breaches()
    {
        $admin = $this->createAdmin();
        SlaBreach::create([
            'breach_type' => 'pending_validation',
            'entity_type' => Submission::class,
            'entity_id' => Submission::factory()->create()->id,
            'description' => 'Test',
            'detected_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/sla-breaches');
        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['data']]);
    }

    public function test_unauthorized_user_cannot_view_breaches()
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('Sales');

        $response = $this->actingAs($sales, 'sanctum')->getJson('/api/sla-breaches');
        $response->assertStatus(403);
    }

    public function test_notification_is_sent_on_breach()
    {
        Notification::fake();
        $admin = $this->createAdmin();

        $submission = Submission::factory()->create([
            'status' => SubmissionStatus::PENDING,
            'created_at' => now()->subHours(25),
        ]);

        Artisan::call('sla:check-pending-validation');

        Notification::assertSentTo(
            [$admin], SlaBreachNotification::class
        );
    }

    public function test_resolved_breach_sets_resolved_at()
    {
        $provisioning = Provisioning::factory()->create([
            'status' => ProvisioningStatus::FAILED,
            'retry_count' => 3,
        ]);

        Artisan::call('sla:check-provisioning');
        $provisioning->update(['status' => ProvisioningStatus::SUCCESS]);

        $breach = SlaBreach::where('entity_id', $provisioning->id)->first();
        $this->assertNotNull($breach->resolved_at);
    }

    public function test_scheduler_executes_sla_checks()
    {
        // Testing that commands are registered in schedule
        $schedule = app(Schedule::class);
        $events = collect($schedule->events());

        $hasPending = $events->contains(fn ($event) => str_contains($event->command, 'sla:check-pending-validation'));
        $hasProv = $events->contains(fn ($event) => str_contains($event->command, 'sla:check-provisioning'));
        $hasInst = $events->contains(fn ($event) => str_contains($event->command, 'sla:check-installation'));

        $this->assertTrue($hasPending);
        $this->assertTrue($hasProv);
        $this->assertTrue($hasInst);
    }
}
