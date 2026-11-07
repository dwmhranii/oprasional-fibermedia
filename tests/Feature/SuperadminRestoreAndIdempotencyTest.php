<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SuperadminRestoreAndIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Test artisan superadmin:restore rejects invalid emails.
     */
    public function test_superadmin_restore_rejects_missing_or_nonexistent_email(): void
    {
        $exitCode = Artisan::call('superadmin:restore', ['email' => 'fake_user_not_found@fibermedia.test']);
        $this->assertEquals(1, $exitCode);
        $this->assertStringContainsString('tidak ditemukan', Artisan::output());
    }

    /**
     * Test superadmin:restore restores user to superadmin role and is idempotent.
     */
    public function test_superadmin_restore_restores_user_and_is_idempotent(): void
    {
        $user = User::where('email', 'superadmin@example.com')->firstOrFail();

        // Simulate user accidentally given Sales role and deactivated
        $user->syncRoles(['Sales']);
        $user->status = 'inactive';
        $user->save();

        $this->assertTrue($user->fresh()->hasRole('Sales'));
        $this->assertEquals('inactive', $user->fresh()->status);

        // Run superadmin:restore
        $exitCode = Artisan::call('superadmin:restore', ['email' => 'superadmin@example.com']);
        $this->assertEquals(0, $exitCode);

        $freshUser = $user->fresh();
        $this->assertEquals('active', $freshUser->status);
        $this->assertTrue($freshUser->hasRole('superadmin') || $freshUser->hasRole('Superadmin'));
        $this->assertFalse($freshUser->hasRole('Sales'));

        // Run second time (Idempotency check)
        $exitCode2 = Artisan::call('superadmin:restore', ['email' => 'superadmin@example.com']);
        $this->assertEquals(0, $exitCode2);

        $freshUser2 = $user->fresh();
        $this->assertEquals('active', $freshUser2->status);
        $this->assertTrue($freshUser2->hasRole('superadmin') || $freshUser2->hasRole('Superadmin'));
        $this->assertFalse($freshUser2->hasRole('Sales'));
    }

    /**
     * Test running seeders twice does NOT alter or downgrade existing user roles.
     */
    public function test_running_seeders_twice_preserves_existing_user_roles(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->firstOrFail();
        $admin = User::where('email', 'admin@example.com')->firstOrFail();
        $sales = User::where('email', 'sales@example.com')->firstOrFail();

        $saRolesBefore = $superadmin->getRoleNames()->sort()->values()->toArray();
        $adminRolesBefore = $admin->getRoleNames()->sort()->values()->toArray();
        $salesRolesBefore = $sales->getRoleNames()->sort()->values()->toArray();

        // Run seeder second time
        $this->seed(DatabaseSeeder::class);

        $this->assertEquals($saRolesBefore, $superadmin->fresh()->getRoleNames()->sort()->values()->toArray());
        $this->assertEquals($adminRolesBefore, $admin->fresh()->getRoleNames()->sort()->values()->toArray());
        $this->assertEquals($salesRolesBefore, $sales->fresh()->getRoleNames()->sort()->values()->toArray());
    }

    /**
     * Test permissions:sync does not change user roles or downgrade customizations.
     */
    public function test_permissions_sync_does_not_modify_user_roles(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->firstOrFail();
        $saRolesBefore = $superadmin->getRoleNames()->sort()->values()->toArray();

        Artisan::call('permissions:sync');

        $this->assertEquals($saRolesBefore, $superadmin->fresh()->getRoleNames()->sort()->values()->toArray());
    }

    /**
     * Test last superadmin cannot be demoted or deactivated via API.
     */
    public function test_last_superadmin_cannot_be_demoted_or_deactivated(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->firstOrFail();

        // Try to demote via updateRole
        $responseDemote = $this->actingAs($superadmin, 'sanctum')->patchJson("/api/users/{$superadmin->id}/role", [
            'role' => 'Sales',
        ]);
        $responseDemote->assertStatus(422);

        // Try to deactivate via status
        $responseDeactivate = $this->actingAs($superadmin, 'sanctum')->patchJson("/api/users/{$superadmin->id}/status", [
            'status' => 'inactive',
        ]);
        // Cannot deactivate yourself or last superadmin
        $this->assertContains($responseDeactivate->getStatusCode(), [400, 422]);

        // Status and role must remain active superadmin
        $this->assertEquals('active', $superadmin->fresh()->status);
        $this->assertTrue($superadmin->fresh()->hasRole('superadmin') || $superadmin->fresh()->hasRole('Superadmin'));
    }
}
