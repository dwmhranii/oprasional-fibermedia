<?php

namespace Tests\Feature;

use App\Models\DailyAttendance;
use App\Models\OfficeLocation;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\TeamReadinessService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TeamAttendanceReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_readiness_is_calculated_from_member_attendance(): void
    {
        $today = Carbon::today()->toDateString();
        $readinessService = new TeamReadinessService;

        // Create 2 teams
        $teamA = Team::create(['name' => 'Tim Alpha Test', 'order_index' => 1, 'is_active' => true]);
        $teamB = Team::create(['name' => 'Tim Beta Test', 'order_index' => 2, 'is_active' => true]);

        $userA1 = User::factory()->create(['name' => 'Teknisi A1', 'status' => 'active']);
        $userA2 = User::factory()->create(['name' => 'Teknisi A2', 'status' => 'active']);
        $userB1 = User::factory()->create(['name' => 'Teknisi B1', 'status' => 'active']);

        TeamMember::create(['team_id' => $teamA->id, 'user_id' => $userA1->id, 'joined_at' => now()]);
        TeamMember::create(['team_id' => $teamA->id, 'user_id' => $userA2->id, 'joined_at' => now()]);
        TeamMember::create(['team_id' => $teamB->id, 'user_id' => $userB1->id, 'joined_at' => now()]);

        // 1. Awalnya belum ada yang absen: tidak ada tim siap (0 anggota hadir)
        $readyTeams = $readinessService->getReadyTeams();
        $readyIds = array_map(fn ($t) => $t->id, $readyTeams);
        $this->assertNotContains($teamA->id, $readyIds);
        $this->assertNotContains($teamB->id, $readyIds);
        $this->assertEquals(0, $readinessService->getPresentMembersToday($teamA)->count());

        // 2. User A1 absen masuk: Tim A menjadi SIAP (1 anggota hadir >= min_members_present default 1)
        $attA1 = DailyAttendance::create([
            'user_id' => $userA1->id,
            'work_date' => $today,
            'status' => 'hadir',
            'check_in_at' => now(),
            'check_out_at' => null,
        ]);

        $readyTeams = $readinessService->getReadyTeams();
        $readyIds = array_map(fn ($t) => $t->id, $readyTeams);
        $this->assertContains($teamA->id, $readyIds);
        $this->assertNotContains($teamB->id, $readyIds);
        $this->assertEquals(1, $readinessService->getPresentMembersToday($teamA)->count());

        // 3. User A2 absen masuk: Tim A tetap SIAP (2 anggota hadir)
        $attA2 = DailyAttendance::create([
            'user_id' => $userA2->id,
            'work_date' => $today,
            'status' => 'hadir',
            'check_in_at' => now(),
            'check_out_at' => null,
        ]);
        $this->assertTrue($readinessService->isTeamReady($teamA));
        $this->assertEquals(2, $readinessService->getPresentMembersToday($teamA)->count());

        // 4. Keduanya absen pulang: Tim A kembali TIDAK SIAP (0 anggota hadir)
        $attA1->update(['check_out_at' => now()]);
        $attA2->update(['check_out_at' => now()]);

        $this->assertFalse($readinessService->isTeamReady($teamA));
        $this->assertEquals(0, $readinessService->getPresentMembersToday($teamA)->count());
    }

    public function test_team_readiness_threshold_with_min_members_present_setting(): void
    {
        $today = Carbon::today()->toDateString();
        $readinessService = new TeamReadinessService;

        // Atur min_members_present = 2
        DB::table('dispatch_settings')->updateOrInsert(
            ['key' => 'min_members_present'],
            ['value' => '2', 'updated_at' => now()]
        );

        $team = Team::create(['name' => 'Tim Duo', 'order_index' => 1, 'is_active' => true]);
        $user1 = User::factory()->create(['status' => 'active']);
        $user2 = User::factory()->create(['status' => 'active']);

        TeamMember::create(['team_id' => $team->id, 'user_id' => $user1->id, 'joined_at' => now()]);
        TeamMember::create(['team_id' => $team->id, 'user_id' => $user2->id, 'joined_at' => now()]);

        // 0 hadir -> tidak siap
        $this->assertFalse($readinessService->isTeamReady($team));

        // 1 hadir -> belum siap karena min_members_present = 2
        DailyAttendance::create([
            'user_id' => $user1->id,
            'work_date' => $today,
            'status' => 'hadir',
            'check_in_at' => now(),
        ]);
        $this->assertFalse($readinessService->isTeamReady($team));

        // 2 hadir -> siap
        DailyAttendance::create([
            'user_id' => $user2->id,
            'work_date' => $today,
            'status' => 'hadir',
            'check_in_at' => now(),
        ]);
        $this->assertTrue($readinessService->isTeamReady($team));
    }

    public function test_duplicate_attendance_check_in_is_rejected(): void
    {
        Storage::fake('private');

        $office = OfficeLocation::firstOrCreate(
            ['name' => 'HQ Bululawang'],
            ['latitude' => -8.1132000, 'longitude' => 112.6415000, 'radius_meters' => 50, 'is_active' => true]
        );

        $user = User::factory()->create(['status' => 'active']);
        $this->actingAs($user);

        // 1. Absen masuk pertama di lokasi kantor -> Sukses (200)
        $resp1 = $this->post('/api/attendance/check-in', [
            'latitude' => -8.1132050,
            'longitude' => 112.6415050,
            'accuracy' => 10.0,
            'selfie' => UploadedFile::fake()->create('selfie1.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json']);

        $resp1->assertStatus(200);
        $this->assertTrue($resp1->json('success'));

        // 2. Absen masuk kedua pada hari yang sama -> DITOLAK (422)
        $resp2 = $this->post('/api/attendance/check-in', [
            'latitude' => -8.1132050,
            'longitude' => 112.6415050,
            'accuracy' => 10.0,
            'selfie' => UploadedFile::fake()->create('selfie2.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json']);

        $resp2->assertStatus(422);
        $this->assertFalse($resp2->json('success'));
        $this->assertStringContainsString('sudah melakukan absen masuk hari ini', $resp2->json('message'));
    }

    public function test_attendance_check_in_outside_50m_is_rejected(): void
    {
        Storage::fake('private');

        $office = OfficeLocation::firstOrCreate(
            ['name' => 'HQ Bululawang'],
            ['latitude' => -8.1132000, 'longitude' => 112.6415000, 'radius_meters' => 50, 'is_active' => true]
        );

        $user = User::factory()->create(['status' => 'active']);
        $this->actingAs($user);

        // Coordinates ~2 km away from office
        $response = $this->post('/api/attendance/check-in', [
            'latitude' => -8.1300000,
            'longitude' => 112.6500000,
            'selfie' => UploadedFile::fake()->create('selfie.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'success' => false,
        ]);
        $this->assertStringContainsString('di luar radius kantor', $response->json('message'));
    }

    public function test_attendance_check_in_within_50m_succeeds(): void
    {
        Storage::fake('private');

        $office = OfficeLocation::firstOrCreate(
            ['name' => 'HQ Bululawang'],
            ['latitude' => -8.1132000, 'longitude' => 112.6415000, 'radius_meters' => 50, 'is_active' => true]
        );

        $user = User::factory()->create(['status' => 'active']);
        $this->actingAs($user);

        // Coordinates ~10 meters from office
        $response = $this->post('/api/attendance/check-in', [
            'latitude' => -8.1132100,
            'longitude' => 112.6415100,
            'accuracy' => 5.0,
            'selfie' => UploadedFile::fake()->create('selfie.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
        $this->assertDatabaseHas('daily_attendances', [
            'user_id' => $user->id,
            'status' => 'hadir',
        ]);
    }

    public function test_team_migration_data_matches_100_percent(): void
    {
        // 1. Buat data users dengan kolom lama `users.team`
        $legacyUsersTeamA = User::factory()->count(4)->create(['team' => 'Legacy Team Alpha', 'status' => 'active']);
        $legacyUsersTeamB = User::factory()->count(3)->create(['team' => 'Legacy Team Beta', 'status' => 'active']);
        $legacyUsersNoTeam = User::factory()->count(2)->create(['team' => null, 'status' => 'active']);

        $countBeforeA = User::where('team', 'Legacy Team Alpha')->count();
        $countBeforeB = User::where('team', 'Legacy Team Beta')->count();

        $this->assertEquals(4, $countBeforeA);
        $this->assertEquals(3, $countBeforeB);

        // 2. Jalankan migrasi data (2026_10_24_000005_migrate_legacy_users_team_to_team_members)
        $migration = require database_path('migrations/2026_10_24_000005_migrate_legacy_users_team_to_team_members.php');
        $migration->up();

        // 3. Verifikasi tim baru terbuat di tabel `teams`
        $teamA = Team::where('name', 'Legacy Team Alpha')->first();
        $teamB = Team::where('name', 'Legacy Team Beta')->first();

        $this->assertNotNull($teamA);
        $this->assertNotNull($teamB);

        // 4. Verifikasi jumlah anggota di `team_members` COCOK 100%
        $membersA = TeamMember::where('team_id', $teamA->id)->pluck('user_id')->toArray();
        $membersB = TeamMember::where('team_id', $teamB->id)->pluck('user_id')->toArray();

        $this->assertCount(4, $membersA);
        $this->assertCount(3, $membersB);

        $expectedUserIdsA = $legacyUsersTeamA->pluck('id')->toArray();
        $expectedUserIdsB = $legacyUsersTeamB->pluck('id')->toArray();

        sort($membersA);
        sort($expectedUserIdsA);
        sort($membersB);
        sort($expectedUserIdsB);

        $this->assertEquals($expectedUserIdsA, $membersA);
        $this->assertEquals($expectedUserIdsB, $membersB);

        // 5. Verifikasi kolom lama `users.team` TIDAK DIHAPUS
        foreach ($legacyUsersTeamA as $u) {
            $this->assertEquals('Legacy Team Alpha', $u->fresh()->team);
        }

        // 6. Jalankan ulang migrasi untuk memastikan idempotent (tidak membuat duplikat)
        $migration->up();
        $this->assertCount(4, TeamMember::where('team_id', $teamA->id)->get());
        $this->assertCount(3, TeamMember::where('team_id', $teamB->id)->get());
    }
}
