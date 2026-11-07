<?php

namespace Tests\Feature\Attendance;

use App\Models\DailyAttendance;
use App\Models\OfficeLocation;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CheckOutPhotoAndReadinessCountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'pwa.access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'attendance.self', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'attendance.manage', 'guard_name' => 'web']);

        $teknisiRole = Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);
        $teknisiRole->givePermissionTo(['pwa.access', 'attendance.self']);

        $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $adminRole->givePermissionTo(['attendance.manage']);
    }

    public function test_checkout_saves_selfie_photo_and_admin_today_exposes_both_photos(): void
    {
        $today = Carbon::today()->toDateString();

        $office = OfficeLocation::create([
            'name' => 'Kantor Operasional Test',
            'latitude' => -6.2087634,
            'longitude' => 106.8455990,
            'radius_meters' => 50,
            'valid_wifi_ips' => ['127.0.0.1', '::1'],
            'wifi_incident_active' => true,
            'is_active' => true,
        ]);

        $team = Team::create([
            'name' => 'Team Alpha',
            'order_index' => 1,
            'is_active' => true,
        ]);

        $teknisi = User::factory()->create([
            'name' => 'Budi Teknisi',
            'email' => 'budi@fibermedia.test',
            'status' => 'active',
        ]);
        $teknisi->assignRole('Teknisi');

        TeamMember::create([
            'team_id' => $team->id,
            'user_id' => $teknisi->id,
            'joined_at' => now(),
        ]);

        $admin = User::factory()->create([
            'name' => 'Admin Test',
            'email' => 'admin@fibermedia.test',
            'status' => 'active',
        ]);
        $admin->assignRole('Admin');

        // 1. Check in
        Sanctum::actingAs($teknisi);
        $samplePhotoIn = 'data:image/jpeg;base64,' . base64_encode('fake_checkin_selfie_bytes');
        $checkInRes = $this->postJson('/api/attendance/check-in', [
            'latitude' => -6.2087634,
            'longitude' => 106.8455990,
            'accuracy' => 8,
            'track' => 'office',
            'selfie_base64' => $samplePhotoIn,
        ]);
        $checkInRes->assertStatus(200);

        // Verify team is ready when checked in
        Sanctum::actingAs($admin);
        $adminTodayRes1 = $this->getJson('/api/attendances/today');
        $adminTodayRes1->assertStatus(200);
        $teamData1 = collect($adminTodayRes1->json('data.team_panel.teams'))->firstWhere('id', $team->id);
        $this->assertTrue($teamData1['is_ready']);
        $this->assertEquals(1, $teamData1['present_count']);
        $this->assertEquals(1, $teamData1['attended_count']);
        $this->assertEquals(0, $teamData1['checked_out_count']);

        // 2. Check out with checkout selfie photo
        Sanctum::actingAs($teknisi);
        $samplePhotoOut = 'data:image/jpeg;base64,' . base64_encode('fake_checkout_selfie_bytes');
        $checkOutRes = $this->postJson('/api/attendance/check-out', [
            'latitude' => -6.2087634,
            'longitude' => 106.8455990,
            'accuracy' => 10,
            'selfie_base64' => $samplePhotoOut,
        ]);
        $checkOutRes->assertStatus(200);
        $this->assertNotNull($checkOutRes->json('data.check_out_photo_url'));

        // 3. Admin view today: verify both photos and team counts
        Sanctum::actingAs($admin);
        $adminTodayRes2 = $this->getJson('/api/attendances/today');
        $adminTodayRes2->assertStatus(200);

        $attendanceRow = collect($adminTodayRes2->json('data.attendances'))->firstWhere('user_id', $teknisi->id);
        $this->assertNotNull($attendanceRow['check_in_selfie_url']);
        $this->assertNotNull($attendanceRow['check_out_selfie_url']);
        $this->assertEquals(-6.2087634, $attendanceRow['latitude']);
        $this->assertEquals(-6.2087634, $attendanceRow['check_out_latitude']);

        // Verify team readiness panel reflects 1 attended, 1 checked out, 0 active present
        $teamData2 = collect($adminTodayRes2->json('data.team_panel.teams'))->firstWhere('id', $team->id);
        $this->assertFalse($teamData2['is_ready']);
        $this->assertEquals(0, $teamData2['present_count']);
        $this->assertEquals(1, $teamData2['attended_count']);
        $this->assertEquals(1, $teamData2['checked_out_count']);
        $this->assertCount(1, $teamData2['checked_out_members']);
        $this->assertEquals('Budi Teknisi', $teamData2['checked_out_members'][0]['name']);
    }
}

