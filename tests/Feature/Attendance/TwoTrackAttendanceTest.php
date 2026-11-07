<?php

namespace Tests\Feature\Attendance;

use App\Models\DailyAttendance;
use App\Models\OfficeLocation;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TwoTrackAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected OfficeLocation $office;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('private');

        $this->office = OfficeLocation::create([
            'name' => 'Kantor Pusat Fibermedia',
            'latitude' => -8.1132000,
            'longitude' => 112.6415000,
            'radius_meters' => 50,
            'valid_wifi_ips' => ['192.168.10.1', '192.168.10.2'],
            'wifi_incident_active' => false,
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Admin Operasional',
            'email' => 'admin.ops@fibermedia.test',
        ]);
        $this->admin->assignRole('Admin/CS');
    }

    public function test_office_track_within_50m_and_valid_wifi_succeeds(): void
    {
        $teknisi = User::factory()->create(['name' => 'Teknisi Rama']);
        $teknisi->assignRole('Teknisi');
        Sanctum::actingAs($teknisi);

        // Absen di radius < 50m dengan IP Wi-Fi kantor yang sah
        $response = $this->withServerVariables(['REMOTE_ADDR' => '192.168.10.1'])
            ->postJson('/api/attendance/check-in', [
                'latitude' => -8.1132050,
                'longitude' => 112.6415050,
                'accuracy' => 8.5,
                'selfie' => UploadedFile::fake()->create('selfie.jpg', 120, 'image/jpeg'),
            ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertEquals('office', $response->json('data.track'));
        $this->assertEquals('hadir', $response->json('data.status'));

        $this->assertDatabaseHas('daily_attendances', [
            'user_id' => $teknisi->id,
            'track' => 'office',
            'status' => 'hadir',
            'client_ip' => '192.168.10.1',
            'review_status' => 'approved',
        ]);
    }

    public function test_office_track_invalid_wifi_is_rejected(): void
    {
        $teknisi = User::factory()->create(['name' => 'Teknisi Rama']);
        $teknisi->assignRole('Teknisi');
        Sanctum::actingAs($teknisi);

        // Absen di radius < 50m tetapi menggunakan IP seluler / asing
        $response = $this->withServerVariables(['REMOTE_ADDR' => '114.122.50.1'])
            ->postJson('/api/attendance/check-in', [
                'latitude' => -8.1132050,
                'longitude' => 112.6415050,
                'accuracy' => 8.5,
                'selfie' => UploadedFile::fake()->create('selfie.jpg', 120, 'image/jpeg'),
            ]);

        $response->assertStatus(422);
        $this->assertFalse($response->json('success'));
        $this->assertStringContainsString('tidak terdaftar sebagai Wi-Fi sah kantor', $response->json('message'));

        $this->assertDatabaseMissing('daily_attendances', [
            'user_id' => $teknisi->id,
        ]);
    }

    public function test_office_track_wifi_incident_bypasses_wifi_check(): void
    {
        // Aktifkan mode gangguan Wi-Fi sementara pada kantor
        $this->office->update(['wifi_incident_active' => true]);

        $teknisi = User::factory()->create(['name' => 'Teknisi Rama']);
        $teknisi->assignRole('Teknisi');
        Sanctum::actingAs($teknisi);

        // Saat ada insiden wifi, IP asing diizinkan lewat asalkan koordinat GPS valid
        $response = $this->withServerVariables(['REMOTE_ADDR' => '114.122.50.1'])
            ->postJson('/api/attendance/check-in', [
                'latitude' => -8.1132050,
                'longitude' => 112.6415050,
                'accuracy' => 8.5,
                'selfie' => UploadedFile::fake()->create('selfie.jpg', 120, 'image/jpeg'),
            ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertEquals('hadir', $response->json('data.status'));
    }

    public function test_teknisi_cannot_check_in_via_field_track(): void
    {
        $teknisi = User::factory()->create(['name' => 'Teknisi Lapangan']);
        $teknisi->assignRole('Teknisi');
        Sanctum::actingAs($teknisi);

        // Teknisi mencoba check-in jalur lapangan (field)
        $response = $this->postJson('/api/attendance/check-in', [
            'track' => 'field',
            'latitude' => -8.1500000,
            'longitude' => 112.6900000,
            'accuracy' => 15.2,
            'selfie' => UploadedFile::fake()->create('selfie.jpg', 120, 'image/jpeg'),
        ]);

        $response->assertStatus(422);
        $this->assertFalse($response->json('success'));
        $this->assertStringContainsString('Teknisi wajib melakukan absensi di kantor', $response->json('message'));
        $this->assertStringContainsString('tidak memiliki jalur absensi lapangan', $response->json('message'));

        $this->assertDatabaseMissing('daily_attendances', [
            'user_id' => $teknisi->id,
        ]);
    }

    public function test_sales_and_collector_can_check_in_via_field_track(): void
    {
        $sales = User::factory()->create(['name' => 'Sales Budi']);
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        // Sales check-in di lapangan (jauh dari kantor, tanpa Wi-Fi)
        $response = $this->postJson('/api/attendance/check-in', [
            'track' => 'field',
            'latitude' => -8.2000000,
            'longitude' => 112.7000000,
            'accuracy' => 12.3, // bukan angka bulat
            'selfie' => UploadedFile::fake()->create('selfie_sales.jpg', 150, 'image/jpeg'),
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertEquals('field', $response->json('data.track'));
        $this->assertEquals('field_checkin', $response->json('data.status'));
        $this->assertEquals('pending_review', $response->json('data.review_status'));
        $this->assertFalse($response->json('data.is_suspicious'));

        $this->assertDatabaseHas('daily_attendances', [
            'user_id' => $sales->id,
            'track' => 'field',
            'status' => 'field_checkin',
            'review_status' => 'pending_review',
            'is_suspicious' => false,
        ]);
    }

    public function test_field_track_detects_gps_anomalies_and_flags_suspicious(): void
    {
        $collector = User::factory()->create(['name' => 'Collector Doni']);
        $collector->assignRole('Collector');
        Sanctum::actingAs($collector);

        // Collector check-in dengan akurasi bulat sempurna (ciri khas fake GPS/mock location)
        $response = $this->postJson('/api/attendance/check-in', [
            'track' => 'field',
            'latitude' => -8.2500000,
            'longitude' => 112.7500000,
            'accuracy' => 5.0, // Bulat sempurna 5.0
            'selfie' => UploadedFile::fake()->create('mock_selfie.jpg', 110, 'image/jpeg'),
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('data.is_suspicious'));
        $this->assertStringContainsString('Fake GPS', $response->json('data.suspicious_reason'));
        $this->assertEquals('field_checkin', $response->json('data.status'));
        $this->assertEquals('pending_review', $response->json('data.review_status'));

        $this->assertDatabaseHas('daily_attendances', [
            'user_id' => $collector->id,
            'is_suspicious' => true,
        ]);
    }

    public function test_admin_can_review_field_attendance_approve_and_reject(): void
    {
        $sales = User::factory()->create(['name' => 'Sales Tinjauan']);
        $sales->assignRole('Sales');

        $att = DailyAttendance::create([
            'user_id' => $sales->id,
            'work_date' => now()->toDateString(),
            'track' => 'field',
            'status' => 'field_checkin',
            'review_status' => 'pending_review',
            'check_in_at' => now(),
            'check_in_lat' => -8.2000,
            'check_in_lng' => 112.7000,
        ]);

        Sanctum::actingAs($this->admin);

        // 1. Admin Menyetujui Absensi Lapangan
        $approveRes = $this->postJson("/api/attendances/{$att->id}/review", [
            'action' => 'approve',
            'notes' => 'Lokasi dan foto valid sesuai prospek pelanggan.',
        ]);

        $approveRes->assertStatus(200);
        $this->assertEquals('hadir', $approveRes->json('data.status'));
        $this->assertEquals('approved', $approveRes->json('data.review_status'));

        $att->refresh();
        $this->assertEquals('hadir', $att->status);
        $this->assertEquals('approved', $att->review_status);
        $this->assertEquals($this->admin->id, $att->reviewed_by_id);

        // 2. Admin Menolak Absensi Lapangan
        $att2 = DailyAttendance::create([
            'user_id' => $sales->id,
            'work_date' => now()->subDay()->toDateString(),
            'track' => 'field',
            'status' => 'field_checkin',
            'review_status' => 'pending_review',
            'check_in_at' => now()->subDay(),
        ]);

        $rejectRes = $this->postJson("/api/attendances/{$att2->id}/review", [
            'action' => 'reject',
            'notes' => 'Foto bukan selfie diri sendiri.',
        ]);

        $rejectRes->assertStatus(200);
        $this->assertEquals('alpa', $rejectRes->json('data.status'));
        $this->assertEquals('rejected', $rejectRes->json('data.review_status'));

        $att2->refresh();
        $this->assertEquals('alpa', $att2->status);
        $this->assertEquals('rejected', $att2->review_status);
    }

    public function test_admin_today_attendance_listing_includes_tracks_and_filters(): void
    {
        $sales = User::factory()->create(['name' => 'Sales Andi']);
        $sales->assignRole('Sales');

        DailyAttendance::create([
            'user_id' => $sales->id,
            'work_date' => now()->toDateString(),
            'track' => 'field',
            'status' => 'field_checkin',
            'review_status' => 'pending_review',
            'check_in_at' => now(),
            'check_in_lat' => -8.2000,
            'check_in_lng' => 112.7000,
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->getJson('/api/attendances?track=field');
        $res->assertStatus(200);
        $this->assertCount(1, $res->json('data.attendances'));
        $this->assertEquals('field', $res->json('data.attendances.0.track'));
        $this->assertEquals('field_checkin', $res->json('data.attendances.0.status'));
    }
}

