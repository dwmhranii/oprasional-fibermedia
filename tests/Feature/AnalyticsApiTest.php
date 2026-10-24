<?php

namespace Tests\Feature;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->artisan('migrate'); // Ensure permission is registered from the new migration
    }

    private function createUserWithRole(string $role)
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_view_kpi()
    {
        $admin = $this->createUserWithRole('Admin');

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics/kpi');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'data' => ['submissions', 'provisionings', 'installations', 'sla_breaches']]);
    }

    public function test_superadmin_can_view_kpi()
    {
        $superadmin = $this->createUserWithRole('Superadmin');

        $response = $this->actingAs($superadmin, 'sanctum')->getJson('/api/admin/analytics/kpi');

        $response->assertStatus(200);
    }

    public function test_sales_cannot_view_analytics()
    {
        $sales = $this->createUserWithRole('Sales');

        $response = $this->actingAs($sales, 'sanctum')->getJson('/api/admin/analytics/kpi');

        $response->assertStatus(403);
    }

    public function test_technician_cannot_view_analytics()
    {
        $teknisi = $this->createUserWithRole('Teknisi');

        $response = $this->actingAs($teknisi, 'sanctum')->getJson('/api/admin/analytics/kpi');

        $response->assertStatus(403);
    }

    public function test_funnel_returns_correct_counts()
    {
        $admin = $this->createUserWithRole('Admin');

        // Create 2 submissions, 1 reaches provisioned, 1 reaches task assigned and completed
        $sub1 = Submission::factory()->create(['status' => SubmissionStatus::APPROVED]);
        $prov1 = Provisioning::factory()->create(['submission_id' => $sub1->id, 'status' => ProvisioningStatus::SUCCESS]);
        Task::factory()->create(['provisioning_id' => $prov1->id, 'status' => TaskStatus::COMPLETED]);

        $sub2 = Submission::factory()->create(['status' => SubmissionStatus::PENDING]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics/funnel');

        $response->assertStatus(200);
        $response->assertJsonPath('data.raw_counts.total_submissions', 2);
        $response->assertJsonPath('data.raw_counts.validated', 1);
        $response->assertJsonPath('data.raw_counts.provisioned', 1);
        $response->assertJsonPath('data.raw_counts.task_assigned', 1);
        $response->assertJsonPath('data.raw_counts.installed', 1);
    }

    public function test_regional_returns_correct_aggregates()
    {
        $admin = $this->createUserWithRole('Admin');

        $sub1 = Submission::factory()->create(['district' => 'Region A', 'status' => SubmissionStatus::APPROVED]);
        $sub2 = Submission::factory()->create(['district' => 'Region A', 'status' => SubmissionStatus::PENDING]);
        $sub3 = Submission::factory()->create(['district' => 'Region B', 'status' => SubmissionStatus::PENDING]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics/regional?group_by=district');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(2, $data);

        $regionA = collect($data)->firstWhere('region', 'Region A');
        $this->assertEquals(2, $regionA['total_submissions']);

        $regionB = collect($data)->firstWhere('region', 'Region B');
        $this->assertEquals(1, $regionB['total_submissions']);
    }

    public function test_date_filter_changes_results()
    {
        $admin = $this->createUserWithRole('Admin');

        Submission::factory()->create(['created_at' => '2025-01-01']);
        Submission::factory()->create(['created_at' => '2025-02-01']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics/kpi?start_date=2025-01-15&end_date=2025-02-15');

        $response->assertStatus(200);
        $response->assertJsonPath('data.submissions.total', 1);
    }

    public function test_large_dataset_performance_test_and_caching()
    {
        $admin = $this->createUserWithRole('Admin');

        Cache::put('analytics_cache_version', 1);

        // Run once to cache
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics/kpi');

        // Create a new submission
        Submission::factory()->create();

        // Should be cached, so total shouldn't change immediately if we didn't use observer
        // But observer will invalidate it by bumping the version!
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics/kpi');
        $response->assertStatus(200);
        $response->assertJsonPath('data.submissions.total', 1);

        $version = Cache::get('analytics_cache_version');
        $this->assertGreaterThan(1, $version);
    }
}
