<?php

namespace Tests\Feature\Sla;

use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use App\Notifications\SlaBreachNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class Phase2EscalationSlaTest extends TestCase
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

    private function createSuperadmin(): User
    {
        $superadmin = User::factory()->create(['status' => 'active']);
        $superadmin->assignRole('Superadmin');

        return $superadmin;
    }

    public function test_delayed_phase2_creates_escalation_breach_without_modifying_state()
    {
        Notification::fake();
        $admin = $this->createAdmin();
        $superadmin = $this->createSuperadmin();

        $task = Task::factory()->create([
            'status' => TaskStatus::PHASE_1_SUBMITTED,
            'phase_1_submitted_at' => now()->subHours(25),
        ]);

        $technician = User::factory()->create(['status' => 'active']);
        $technician->assignRole('Teknisi');

        $assignment = TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $technician->id,
            'status' => TaskAssignmentStatus::ASSIGNED,
            'phase_2_submitted_at' => null,
        ]);

        Artisan::call('sla:check-phase2-escalation');

        // Verify breach created
        $this->assertDatabaseHas('sla_breaches', [
            'breach_type' => 'delayed_phase2_escalation',
            'entity_type' => Task::class,
            'entity_id' => $task->id,
        ]);

        // Verify state is UNMODIFIED
        $this->assertEquals(TaskStatus::PHASE_1_SUBMITTED, $task->refresh()->status);
        $this->assertEquals(TaskAssignmentStatus::ASSIGNED, $assignment->refresh()->status);

        // Verify notification was sent
        Notification::assertSentTo(
            [$admin, $superadmin],
            SlaBreachNotification::class
        );
    }

    public function test_completed_phase2_does_not_create_escalation_breach()
    {
        $task = Task::factory()->create([
            'status' => TaskStatus::PHASE_1_SUBMITTED,
            'phase_1_submitted_at' => now()->subHours(25),
        ]);

        $technician1 = User::factory()->create(['status' => 'active']);
        $technician1->assignRole('Teknisi');
        $technician2 = User::factory()->create(['status' => 'active']);
        $technician2->assignRole('Teknisi');

        // One is complete
        TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $technician1->id,
            'status' => TaskAssignmentStatus::PHASE_2_COMPLETE,
            'phase_2_submitted_at' => now()->subHours(10),
        ]);

        // Both are complete
        TaskAssignment::create([
            'task_id' => $task->id,
            'user_id' => $technician2->id,
            'status' => TaskAssignmentStatus::APPROVED,
            'phase_2_submitted_at' => now()->subHours(12),
        ]);

        Artisan::call('sla:check-phase2-escalation');

        $this->assertDatabaseMissing('sla_breaches', [
            'breach_type' => 'delayed_phase2_escalation',
            'entity_id' => $task->id,
        ]);
    }
}
