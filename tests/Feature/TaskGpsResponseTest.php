<?php

namespace Tests\Feature;

use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TaskGpsResponseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Teknisi']);
        Permission::firstOrCreate(['name' => 'view_assigned_tasks']);
        Permission::firstOrCreate(['name' => 'assign_tasks']); // So hasPermissionTo doesn't throw
        $role->givePermissionTo('view_assigned_tasks');
    }

    public function test_task_resource_exposes_separated_gps_locations()
    {
        $user = User::factory()->create();
        $user->assignRole('Teknisi');

        $submission = Submission::factory()->create([
            'lat' => -6.200000,
            'lng' => 106.816666,
        ]);

        $provisioning = Provisioning::factory()->create([
            'submission_id' => $submission->id,
        ]);

        $task = Task::factory()->create([
            'provisioning_id' => $provisioning->id,
            'teknisi_id' => $user->id,
            'completion_latitude' => -6.211111,
            'completion_longitude' => 106.822222,
            'completion_accuracy' => 10.5,
            'location_captured_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson("/api/teknisi/tasks/{$task->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'customer_location' => [
                        'latitude',
                        'longitude',
                    ],
                    'completion_location' => [
                        'available',
                        'latitude',
                        'longitude',
                        'accuracy',
                        'captured_at',
                    ],
                ],
            ])
            ->assertJsonPath('data.customer_location.latitude', -6.200000)
            ->assertJsonPath('data.completion_location.latitude', -6.211111)
            ->assertJsonPath('data.completion_location.available', true)
            ->assertJsonPath('data.completion_location.accuracy', 10.5);
    }
}
