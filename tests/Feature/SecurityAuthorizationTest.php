<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Enums\TaskStatus;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_sales_cannot_access_another_sales_submission(): void
    {
        $salesA = User::factory()->create();
        $salesA->assignRole('Sales');

        $salesB = User::factory()->create();
        $salesB->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $salesB->id,
        ]);

        Sanctum::actingAs($salesA);

        $response = $this->getJson("/api/sales/submissions/{$submission->id}");

        $response->assertStatus(403);
    }

    public function test_sales_cannot_validate_submissions(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
        ]);

        Sanctum::actingAs($sales);

        $response = $this->putJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'approved',
        ]);

        $response->assertStatus(403);
    }

    public function test_sales_cannot_create_provisioning(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'status' => SubmissionStatus::APPROVED,
        ]);

        Sanctum::actingAs($sales);

        $response = $this->postJson('/api/admin/provisionings', [
            'submission_id' => $submission->id,
            'service_type' => 'FTTH',
            'nas_server' => 'NAS-01',
            'nas_ip' => '192.168.1.1',
            'bandwidth_profile' => '100M',
            'bandwidth_up' => 100,
            'bandwidth_down' => 100,
        ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_update_another_technician_task(): void
    {
        $techA = User::factory()->create();
        $techA->assignRole('Teknisi');

        $techB = User::factory()->create();
        $techB->assignRole('Teknisi');

        $task = Task::factory()->create([
            'teknisi_id' => $techB->id,
            'status' => TaskStatus::ASSIGNED,
        ]);

        Sanctum::actingAs($techA);

        $response = $this->putJson("/api/teknisi/tasks/{$task->id}/status", [
            'status' => 'on_the_way',
        ]);

        $response->assertStatus(403);
    }

    public function test_technician_cannot_upload_photo_to_another_technician_task(): void
    {
        $techA = User::factory()->create();
        $techA->assignRole('Teknisi');

        $techB = User::factory()->create();
        $techB->assignRole('Teknisi');

        $task = Task::factory()->create([
            'teknisi_id' => $techB->id,
        ]);

        Sanctum::actingAs($techA);

        $file = UploadedFile::fake()->create('modem.jpg', 100, 'image/jpeg');

        $response = $this->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", [
            'photo_type' => 'modem',
            'photo' => $file,
        ]);

        $response->assertStatus(403);
    }
}
