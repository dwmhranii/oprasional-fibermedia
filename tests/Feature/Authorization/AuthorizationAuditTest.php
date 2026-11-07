<?php

namespace Tests\Feature\Authorization;

use App\Enums\TaskStatus;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AuthorizationAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder'])->run();
    }

    private function createUserWithRole(string $role): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        return $user;
    }

    public function test_unauthenticated_request_returns_401()
    {
        $response = $this->getJson('/api/submissions');
        $response->assertStatus(401);
    }

    public function test_sales_cannot_access_admin_routes()
    {
        $sales = $this->createUserWithRole('Sales');
        $response = $this->actingAs($sales, 'sanctum')->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_technician_cannot_access_admin_routes()
    {
        $teknisi = $this->createUserWithRole('Teknisi');
        $response = $this->actingAs($teknisi, 'sanctum')->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_sales_can_only_see_own_submissions()
    {
        $sales1 = $this->createUserWithRole('Sales');
        $sales2 = $this->createUserWithRole('Sales');

        $submission = Submission::factory()->create(['user_id' => $sales2->id]);

        $response = $this->actingAs($sales1, 'sanctum')->getJson("/api/submissions/{$submission->id}");
        $response->assertStatus(403);
    }

    public function test_sales_cannot_edit_other_sales_submission()
    {
        $sales1 = $this->createUserWithRole('Sales');
        $sales2 = $this->createUserWithRole('Sales');

        $submission = Submission::factory()->create(['user_id' => $sales2->id]);

        $response = $this->actingAs($sales1, 'sanctum')->putJson("/api/submissions/{$submission->id}", [
            'customer_name' => 'Hacked',
        ]);
        $response->assertStatus(403);
    }

    public function test_technician_can_only_update_assigned_tasks()
    {
        $teknisi1 = $this->createUserWithRole('Teknisi');
        $teknisi2 = $this->createUserWithRole('Teknisi');

        $task = Task::factory()->create(['teknisi_id' => $teknisi2->id, 'status' => TaskStatus::ASSIGNED]);

        $response = $this->actingAs($teknisi1, 'sanctum')->putJson("/api/tasks/{$task->id}/status", [
            'status' => TaskStatus::ON_THE_WAY->value,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_cannot_access_superadmin_routes()
    {
        $admin = $this->createUserWithRole('Admin');
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_superadmin_can_access_all_routes()
    {
        $superadmin = $this->createUserWithRole('Superadmin');

        $response1 = $this->actingAs($superadmin, 'sanctum')->getJson('/api/submissions');
        $response1->assertStatus(200);

        $response2 = $this->actingAs($superadmin, 'sanctum')->getJson('/api/roles');
        $response2->assertStatus(200);
    }

    public function test_unauthorized_requests_return_403()
    {
        $sales = $this->createUserWithRole('Sales');
        $response = $this->actingAs($sales, 'sanctum')->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_validation_errors_return_422()
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        $response = $this->actingAs($superadmin, 'sanctum')->postJson('/api/users', []); // Missing required fields
        $response->assertStatus(422);
    }

    public function test_missing_resource_returns_404()
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        $response = $this->actingAs($superadmin, 'sanctum')->getJson('/api/users/99999');
        $response->assertStatus(404);
    }

    public function test_admin_can_access_sla_endpoints()
    {
        $admin = $this->createUserWithRole('Admin');
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/sla-breaches/summary');
        $response->assertStatus(200);
    }

    public function test_superadmin_can_access_sla_endpoints()
    {
        $superadmin = $this->createUserWithRole('Superadmin');
        $response = $this->actingAs($superadmin, 'sanctum')->getJson('/api/sla-breaches');
        $response->assertStatus(200);
    }
}
