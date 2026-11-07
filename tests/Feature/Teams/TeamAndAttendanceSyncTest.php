<?php

namespace Tests\Feature\Teams;

use App\Models\DailyAttendance;
use App\Models\Device;
use App\Models\OfficeLocation;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TeamAndAttendanceSyncTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);

        $this->superadmin = User::factory()->create([
            'email' => 'superadmin.team@fibermedia.test',
        ]);
        $this->superadmin->assignRole('Superadmin');
    }

    public function test_team_crud_and_relational_members_assignment(): void
    {
        // 1. Create team
        $response = $this->actingAs($this->superadmin)->postJson('/api/teams', [
            'name' => 'Team Alpha',
            'description' => 'Tim Area Barat',
            'is_active' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Team Alpha')
            ->assertJsonPath('data.member_count', 0);

        $teamId = $response->json('data.id');

        // 2. Create 2 technicians
        $tech1 = User::factory()->create(['name' => 'Teknisi 1']);
        $tech1->assignRole('Teknisi');

        $tech2 = User::factory()->create(['name' => 'Teknisi 2']);
        $tech2->assignRole('Teknisi');

        // 3. Assign members via relational table
        $assignRes = $this->actingAs($this->superadmin)->postJson("/api/teams/{$teamId}/members", [
            'user_ids' => [$tech1->id, $tech2->id],
        ]);

        $assignRes->assertStatus(200)
            ->assertJsonPath('data.member_count', 2);

        // Verify team_members records in database
        $this->assertDatabaseHas('team_members', [
            'team_id' => $teamId,
            'user_id' => $tech1->id,
            'left_at' => null,
        ]);
        $this->assertDatabaseHas('team_members', [
            'team_id' => $teamId,
            'user_id' => $tech2->id,
            'left_at' => null,
        ]);

        // Verify index endpoint returns members via team_members without ketua
        $indexRes = $this->actingAs($this->superadmin)->getJson('/api/teams');
        $indexRes->assertStatus(200);
        $teamData = collect($indexRes->json('data'))->firstWhere('id', $teamId);
        $this->assertEquals(2, $teamData['member_count']);
        $this->assertCount(2, $teamData['members']);
        // Verify all members are equal (no is_lead)
        $this->assertArrayNotHasKey('is_lead', $teamData['members'][0]);
    }

    public function test_daily_attendance_manual_input_requires_reason(): void
    {
        $tech = User::factory()->create(['name' => 'Teknisi Absen']);

        // Without reason should fail validation
        $resFail = $this->actingAs($this->superadmin)->postJson('/api/attendances/manual', [
            'user_id' => $tech->id,
            'work_date' => '2026-10-24',
            'status' => 'hadir',
        ]);
        $resFail->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        // With valid reason
        $resSuccess = $this->actingAs($this->superadmin)->postJson('/api/attendances/manual', [
            'user_id' => $tech->id,
            'work_date' => '2026-10-24',
            'status' => 'hadir',
            'reason' => 'Perbaikan darurat kabel backbone Sawojajar',
        ]);
        $resSuccess->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('daily_attendances', [
            'user_id' => $tech->id,
            'status' => 'hadir',
            'is_manual' => 1,
        ]);
    }

    public function test_device_registration_approval_and_revocation(): void
    {
        $tech = User::factory()->create(['name' => 'Teknisi HP']);

        $device = Device::create([
            'user_id' => $tech->id,
            'device_uuid' => 'UUID-PHONE-TEST-1234',
            'label' => 'Xiaomi Redmi Note 12',
            'model' => 'Redmi Note 12',
            'platform' => 'Android',
            'approved_at' => null,
            'revoked_at' => null,
        ]);

        // 1. List devices (returns DeviceResource)
        $listRes = $this->actingAs($this->superadmin)->getJson('/api/devices');
        $listRes->assertStatus(200)
            ->assertJsonPath('data.0.device_uuid', 'UUID-PHONE-TEST-1234')
            ->assertJsonPath('data.0.status', 'pending');

        // 2. Approve device
        $approveRes = $this->actingAs($this->superadmin)->putJson("/api/devices/{$device->id}/approve");
        $approveRes->assertStatus(200)
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.is_approved', true);

        $device->refresh();
        $this->assertNotNull($device->approved_at);
        $this->assertNull($device->revoked_at);

        // 3. Revoke device
        $revokeRes = $this->actingAs($this->superadmin)->putJson("/api/devices/{$device->id}/revoke");
        $revokeRes->assertStatus(200)
            ->assertJsonPath('data.status', 'revoked')
            ->assertJsonPath('data.is_approved', false);

        $device->refresh();
        $this->assertNotNull($device->revoked_at);
    }

    public function test_office_locations_geofence_crud(): void
    {
        // 1. Create office location with radius
        $res = $this->actingAs($this->superadmin)->postJson('/api/office-locations', [
            'name' => 'Kantor Sawojajar',
            'latitude' => -7.9824,
            'longitude' => 112.6304,
            'radius_meters' => 75,
            'is_active' => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.name', 'Kantor Sawojajar')
            ->assertJsonPath('data.radius_meters', 75);

        $officeId = $res->json('data.id');

        // 2. Get list
        $listRes = $this->actingAs($this->superadmin)->getJson('/api/office-locations');
        $listRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // 3. Update radius
        $updateRes = $this->actingAs($this->superadmin)->putJson("/api/office-locations/{$officeId}", [
            'radius_meters' => 100,
        ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.radius_meters', 100);
    }
}
