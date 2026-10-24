<?php

namespace Tests\Feature;

use App\Models\Submission;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperadminSubmissionDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_superadmin_can_delete_submission(): void
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('Superadmin');

        $submission = Submission::factory()->create([
            'customer_name' => 'To Be Deleted',
        ]);

        Sanctum::actingAs($superadmin);

        $response = $this->deleteJson("/api/superadmin/submissions/{$submission->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Submission deleted successfully');

        $this->assertSoftDeleted('submissions', [
            'id' => $submission->id,
        ]);
    }

    public function test_non_superadmin_cannot_delete_submission(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create();

        Sanctum::actingAs($sales);

        $response = $this->deleteJson("/api/superadmin/submissions/{$submission->id}");

        $response->assertStatus(403);

        $this->assertDatabaseHas('submissions', [
            'id' => $submission->id,
            'deleted_at' => null,
        ]);
    }

    public function test_admin_cannot_delete_submission(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $submission = Submission::factory()->create();

        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/superadmin/submissions/{$submission->id}");

        $response->assertStatus(403);

        $this->assertDatabaseHas('submissions', [
            'id' => $submission->id,
            'deleted_at' => null,
        ]);
    }
}
