<?php

namespace Tests\Feature;

use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FilterAndSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'Sales']);
        Permission::firstOrCreate(['name' => 'view_any_submissions']);
        $role->givePermissionTo('view_any_submissions');
    }

    public function test_can_search_submissions_by_customer_name()
    {
        $user = User::factory()->create();
        $user->assignRole('Sales');

        Submission::factory()->create([
            'user_id' => $user->id,
            'customer_name' => 'John Doe Alpha',
        ]);

        Submission::factory()->create([
            'user_id' => $user->id,
            'customer_name' => 'Jane Beta',
        ]);

        $response = $this->actingAs($user)->getJson('/api/sales/submissions?search=Alpha');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_name', 'John Doe Alpha');
    }

    public function test_can_filter_submissions_by_date()
    {
        $user = User::factory()->create();
        $user->assignRole('Sales');

        Submission::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subDays(10),
        ]);

        Submission::factory()->create([
            'user_id' => $user->id,
            'created_at' => now(),
        ]);

        $dateFrom = now()->subDays(2)->format('Y-m-d');

        $response = $this->actingAs($user)->getJson("/api/sales/submissions?date_from={$dateFrom}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_can_sort_submissions()
    {
        $user = User::factory()->create();
        $user->assignRole('Sales');

        Submission::factory()->create([
            'user_id' => $user->id,
            'customer_name' => 'Zebra',
        ]);

        Submission::factory()->create([
            'user_id' => $user->id,
            'customer_name' => 'Apple',
        ]);

        $response = $this->actingAs($user)->getJson('/api/sales/submissions?sort_by=customer_name&sort_order=asc');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.customer_name', 'Apple')
            ->assertJsonPath('data.1.customer_name', 'Zebra');
    }
}
