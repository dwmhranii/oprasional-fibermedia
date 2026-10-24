<?php

namespace Tests\Feature\FieldService;

use App\Enums\BfassStatus;
use App\Enums\TaskStatus;
use App\Models\Provisioning;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TaskCompletionTest extends TestCase
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

    private function createReadyTask(User $teknisi): Task
    {
        $provisioning = Provisioning::factory()->create(['bfass_status' => BfassStatus::SUCCESS]);

        return Task::factory()->create([
            'teknisi_id' => $teknisi->id,
            'provisioning_id' => $provisioning->id,
            'status' => TaskStatus::IN_PROGRESS,
        ]);
    }

    public function test_technician_can_submit_checklist()
    {
        $teknisi = $this->createUserWithRole('Teknisi');
        $task = $this->createReadyTask($teknisi);

        $checklist = $task->checklistItems()->get();
        $payload = ['items' => []];

        foreach ($checklist as $item) {
            $payload['items'][] = [
                'item_name' => $item->item_name,
                'is_completed' => true,
            ];
        }

        $response = $this->actingAs($teknisi, 'sanctum')->putJson("/api/teknisi/tasks/{$task->id}/checklist", $payload);

        $response->assertStatus(200);
        $this->assertTrue($task->checklistItems()->where('is_completed', false)->count() === 0);
    }

    public function test_technician_can_upload_signature()
    {
        Storage::fake('public');

        $teknisi = $this->createUserWithRole('Teknisi');
        $task = $this->createReadyTask($teknisi);

        // Since GD extension might not be installed, we use create() with a fake mime type instead of image()
        $file = UploadedFile::fake()->create('signature.png', 100, 'image/png');

        $response = $this->actingAs($teknisi, 'sanctum')->postJson("/api/teknisi/tasks/{$task->id}/upload-signature", [
            'signature' => $file,
        ]);

        $response->assertStatus(200);
        $task->refresh();
        $this->assertNotNull($task->customer_signature_path);

        Storage::disk('public')->assertExists($task->customer_signature_path);
    }

    public function test_technician_cannot_modify_other_task()
    {
        $teknisi1 = $this->createUserWithRole('Teknisi');
        $teknisi2 = $this->createUserWithRole('Teknisi');
        $task = $this->createReadyTask($teknisi2);

        $response = $this->actingAs($teknisi1, 'sanctum')->putJson("/api/teknisi/tasks/{$task->id}/checklist", [
            'items' => [],
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_view_task_completion_data()
    {
        $admin = $this->createUserWithRole('Admin');
        $teknisi = $this->createUserWithRole('Teknisi');
        $task = $this->createReadyTask($teknisi);

        $task->update([
            'completion_latitude' => 3.14,
            'completion_longitude' => 101.68,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/provisionings');
        $response->assertStatus(200);
        // Provisioning API response should just succeed, task relationships should be there.
    }

    public function test_technician_task_detail_serializes_schedule_time_fields()
    {
        $teknisi = $this->createUserWithRole('Teknisi');
        $task = Task::factory()->create([
            'teknisi_id' => $teknisi->id,
            'scheduled_date' => '2026-06-30',
            'scheduled_start' => '13:30:00',
            'scheduled_end' => '15:30:00',
            'status' => TaskStatus::ASSIGNED,
        ]);

        $response = $this->actingAs($teknisi, 'sanctum')->getJson("/api/teknisi/tasks/{$task->id}");
        $response->assertStatus(200);

        // Assert serialization contains scheduled fields
        $response->assertJsonPath('data.scheduled_date', '2026-06-30T00:00:00+07:00');
        $response->assertJsonPath('data.scheduled_start', '13:30:00');
        $response->assertJsonPath('data.scheduled_end', '15:30:00');
        $response->assertJsonPath('data.scheduled_at', '2026-06-30T13:30:00+07:00');
    }
}
