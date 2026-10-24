<?php

namespace Tests\Feature\Superadmin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $superadminRole = Role::firstOrCreate(['name' => 'Superadmin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Permission::firstOrCreate(['name' => 'manage_users']);
        Permission::firstOrCreate(['name' => 'manage_roles']);
        $superadminRole->givePermissionTo('manage_users');
        $superadminRole->givePermissionTo('manage_roles');
    }

    private function createSuperadmin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Superadmin');

        return $user;
    }

    public function test_superadmin_can_list_users()
    {
        $superadmin = $this->createSuperadmin();
        User::factory()->count(3)->create();

        $response = $this->actingAs($superadmin)->getJson('/api/superadmin/users');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'email']]]);
    }

    public function test_superadmin_can_create_user()
    {
        $superadmin = $this->createSuperadmin();

        $response = $this->actingAs($superadmin)->postJson('/api/superadmin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'role' => 'Admin',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
    }

    public function test_superadmin_can_update_user()
    {
        $superadmin = $this->createSuperadmin();
        $user = User::factory()->create();

        $response = $this->actingAs($superadmin)->putJson("/api/superadmin/users/{$user->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);
    }

    public function test_superadmin_can_activate_user()
    {
        $superadmin = $this->createSuperadmin();
        $user = User::factory()->create(['status' => 'inactive']);

        $response = $this->actingAs($superadmin)->patchJson("/api/superadmin/users/{$user->id}/status", [
            'status' => 'active',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'active']);
    }

    public function test_superadmin_can_deactivate_user()
    {
        $superadmin = $this->createSuperadmin();
        $user = User::factory()->create(['status' => 'active']);

        $response = $this->actingAs($superadmin)->patchJson("/api/superadmin/users/{$user->id}/status", [
            'status' => 'inactive',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'inactive']);
    }

    public function test_superadmin_cannot_deactivate_self()
    {
        $superadmin = $this->createSuperadmin();

        $response = $this->actingAs($superadmin)->patchJson("/api/superadmin/users/{$superadmin->id}/status", [
            'status' => 'inactive',
        ]);

        $response->assertStatus(400)
            ->assertJson(['message' => 'Cannot deactivate yourself']);
    }

    public function test_cannot_deactivate_last_superadmin()
    {
        $superadmin1 = $this->createSuperadmin();
        $superadmin2 = $this->createSuperadmin();
        $superadmin3 = $this->createSuperadmin();

        $this->actingAs($superadmin3)->patchJson("/api/superadmin/users/{$superadmin1->id}/status", [
            'status' => 'inactive',
        ])->assertStatus(200);

        $this->actingAs($superadmin3)->patchJson("/api/superadmin/users/{$superadmin2->id}/status", [
            'status' => 'inactive',
        ])->assertStatus(200);

        // Now superadmin3 is the ONLY active superadmin.
        // It cannot deactivate itself (handled by self check).
        // Let's create an admin and temporarily give it manageUsers bypass to simulate trying to deactivate superadmin3.
        // Or we can just temporarily add another superadmin to trigger the check via code path.
        // Wait, if superadmin3 deactivates itself, it hits the self-check.
        // There is practically no way to hit this via normal UI unless another active superadmin is doing it, but if they are active, it's not the LAST one.
        // So this logic only triggers if the CURRENT actor is NOT a superadmin.
        // But our policy says ONLY superadmin can update.
        // Thus, the `superadminCount <= 1` block might be practically unreachable or redundant.
        // However, we can test it by acting as superadmin3 trying to deactivate superadmin3, which fails at the FIRST check (cannot deactivate yourself).
        // Let's just remove the unreachable simulation and rely on the self-deactivation test.
        // Let's test that the last active superadmin cannot be deactivated by ANY means by bypassing the policy explicitly just to reach the controller block.

        // Let's test that the last active superadmin cannot be deactivated by ANY means by bypassing the policy explicitly just to reach the controller block.

        Gate::before(function ($user, $ability) {
            return true; // Bypass all policy checks
        });

        $this->withoutMiddleware([RoleMiddleware::class]);

        // Create a basic user to act as the "rogue" actor bypassing policy
        $rogue = User::factory()->create();

        // Rogue tries to deactivate the last superadmin (superadmin3)
        $response = $this->actingAs($rogue)->patchJson("/api/superadmin/users/{$superadmin3->id}/status", [
            'status' => 'inactive',
        ]);

        $response->assertStatus(400)
            ->assertJson(['message' => 'Cannot deactivate the last active superadmin']);
    }

    public function test_inactive_user_cannot_login()
    {
        $user = User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => \Hash::make('password'),
            'status' => 'inactive',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'inactive@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401)
            ->assertJsonFragment(['message' => 'Your account is inactive. Please contact administrator.']);
    }

    public function test_inactive_user_cannot_access_protected_resources()
    {
        $superadmin = $this->createSuperadmin();
        $user = User::factory()->create(['status' => 'active']);
        $token = $user->createToken('auth_token')->plainTextToken;

        // User can access their own profile using the token
        $this->withToken($token)->getJson('/api/user')->assertStatus(200);

        // Superadmin deactivates the user
        $this->actingAs($superadmin)->patchJson("/api/superadmin/users/{$user->id}/status", [
            'status' => 'inactive',
        ])->assertStatus(200);

        // Token should be revoked, so accessing profile should fail with 401
        // Clear the actingAs authentication state first
        Auth::guard('sanctum')->forgetUser();
        Auth::forgetUser();

        $this->withToken($token)->getJson('/api/user')->assertStatus(401);
    }

    public function test_superadmin_can_reset_password()
    {
        $superadmin = $this->createSuperadmin();
        $user = User::factory()->create();

        $response = $this->actingAs($superadmin)->postJson("/api/superadmin/users/{$user->id}/reset-password");

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'password']);
    }

    public function test_superadmin_can_view_roles()
    {
        $superadmin = $this->createSuperadmin();

        $response = $this->actingAs($superadmin)->getJson('/api/superadmin/roles');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'permissions', 'user_count']]]);
    }

    public function test_superadmin_can_view_permissions()
    {
        $superadmin = $this->createSuperadmin();

        $response = $this->actingAs($superadmin)->getJson('/api/superadmin/permissions');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name']]]);
    }

    public function test_superadmin_can_view_user_activity()
    {
        $superadmin = $this->createSuperadmin();
        $user = User::factory()->create();

        activity()->causedBy($user)->log('test activity');

        $response = $this->actingAs($superadmin)->getJson("/api/superadmin/users/{$user->id}/activity");

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'description']]]);
    }

    public function test_non_superadmin_cannot_access_user_management()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $response = $this->actingAs($admin)->getJson('/api/superadmin/users');

        $response->assertStatus(403);
    }
}
