<?php

namespace Tests\Feature\Foundation;

use App\Models\Complaint;
use App\Models\ComplaintType;
use App\Models\Customer;
use App\Models\Device;
use App\Models\Holiday;
use App\Models\Odp;
use App\Models\OfficeLocation;
use App\Models\PauseReason;
use App\Models\SlaSetting;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Memastikan 6 role baku sesuai PRD Final v1.2 ada di sistem.
     */
    public function test_six_prd_roles_exist(): void
    {
        $expectedRoles = [
            'Superadmin',
            'Admin/CS',
            'NOC/Dispatcher',
            'Teknisi',
            'Sales',
            'Collector',
        ];

        foreach ($expectedRoles as $roleName) {
            $this->assertTrue(
                Role::where('name', $roleName)->exists(),
                "Role {$roleName} wajib tersedia di sistem."
            );
        }
    }

    /**
     * Memastikan target SLA bawaan sesuai PRD Final v1.2 (Kritis 3j, Tinggi 6j, Sedang 24j).
     */
    public function test_sla_settings_seeded_with_prd_targets(): void
    {
        $this->assertEquals(180, SlaSetting::getMinutesForPriority('critical'));
        $this->assertEquals(360, SlaSetting::getMinutesForPriority('high'));
        $this->assertEquals(1440, SlaSetting::getMinutesForPriority('medium'));

        $this->assertDatabaseHas('sla_settings', [
            'priority' => 'critical',
            'resolution_minutes' => 180,
            'is_active' => true,
        ]);
    }

    /**
     * Memastikan 5 alasan baku Pause SLA dan jenis gangguan terdaftar.
     */
    public function test_pause_reasons_and_complaint_types_seeded(): void
    {
        $this->assertDatabaseCount('pause_reasons', 5);
        $this->assertDatabaseHas('pause_reasons', ['code' => 'hujan_lebat', 'requires_photo' => true]);
        $this->assertDatabaseHas('pause_reasons', ['code' => 'material_habis', 'requires_photo' => false]);

        $this->assertGreaterThanOrEqual(5, ComplaintType::count());
        $this->assertGreaterThanOrEqual(5, Holiday::count());
    }

    /**
     * Memastikan validasi IP Wi-Fi kantor dan penanda gangguan Wi-Fi sementara.
     */
    public function test_office_wifi_validation_and_incident_flag(): void
    {
        $office = OfficeLocation::first();
        $office->update([
            'valid_wifi_ips' => ['192.168.1.1', '10.10.0.1'],
            'wifi_incident_active' => false,
        ]);

        $this->assertTrue($office->isValidWifiIp('192.168.1.1'));
        $this->assertFalse($office->isValidWifiIp('172.16.0.1'));

        // Saat ada insiden wifi kantor, IP diizinkan lewat
        $office->update(['wifi_incident_active' => true]);
        $this->assertTrue($office->isValidWifiIp('172.16.0.1'));
    }

    /**
     * Memastikan PWA device binding: maksimal 2 perangkat per akun dan 1 sesi aktif.
     */
    public function test_pwa_device_binding_max_2_devices_and_single_active_session(): void
    {
        $user = User::factory()->create([
            'status' => 'active',
            'password' => bcrypt('password123'),
        ]);
        $user->assignRole('Teknisi');

        // Login dari perangkat 1
        $response1 = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'password123',
            'device_uuid' => 'UUID-DEVICE-01',
            'client_type' => 'pwa',
        ]);
        $response1->assertOk();
        $token1 = $response1->json('data.access_token');
        $this->assertDatabaseCount('personal_access_tokens', 1);

        // Login dari perangkat 2 (mengakhiri sesi perangkat 1 per PRD: 1 sesi aktif)
        $response2 = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'password123',
            'device_uuid' => 'UUID-DEVICE-02',
            'client_type' => 'pwa',
        ]);
        $response2->assertOk();
        $token2 = $response2->json('data.access_token');

        // Token 1 harus sudah tidak berlaku karena token user dipurge saat login baru
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->withToken($token1)->getJson('/api/auth/me')->assertStatus(401);
        $this->withToken($token2)->getJson('/api/auth/me')->assertOk();

        // Mencoba login dari perangkat ke-3 harus ditolak (maksimal 2 perangkat per akun)
        $response3 = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'password123',
            'device_uuid' => 'UUID-DEVICE-03',
            'client_type' => 'pwa',
        ]);
        $response3->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    /**
     * Memastikan pencabutan perangkat seketika mematikan token pengguna.
     */
    public function test_device_revocation_invalidates_tokens_immediately(): void
    {
        $user = User::factory()->create([
            'status' => 'active',
            'password' => bcrypt('password123'),
        ]);
        $user->assignRole('Teknisi');

        $device = Device::create([
            'user_id' => $user->id,
            'device_uuid' => 'UUID-TEST-REVOKE',
            'approved_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'password123',
            'device_uuid' => 'UUID-TEST-REVOKE',
            'client_type' => 'pwa',
        ]);
        $token = $loginResponse->json('data.access_token');

        // Sebelum dicabut: token valid
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();

        // Cabut perangkat lewat DeviceController
        $admin = User::role('Superadmin')->first();
        $this->actingAs($admin)->putJson("/api/devices/{$device->id}/revoke")->assertOk();

        // Setelah dicabut: token langsung gugur seketika
        auth('sanctum')->forgetUser();
        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }

    /**
     * Memastikan staf dinonaktifkan seketika kehilangan token dan perangkatnya dicabut.
     */
    public function test_user_deactivation_invalidates_tokens_and_revokes_devices(): void
    {
        $user = User::factory()->create([
            'status' => 'active',
            'password' => bcrypt('password123'),
        ]);
        $user->assignRole('Teknisi');

        $device = Device::create([
            'user_id' => $user->id,
            'device_uuid' => 'UUID-TEST-USER-STATUS',
            'approved_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'login' => $user->email,
            'password' => 'password123',
            'device_uuid' => 'UUID-TEST-USER-STATUS',
            'client_type' => 'pwa',
        ]);
        $token = $loginResponse->json('data.access_token');
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();

        // Ubah status staf menjadi nonaktif
        $user->update(['status' => 'inactive']);

        // Token terhapus dan perangkat tercabut
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertNotNull($device->fresh()->revoked_at);
        auth('sanctum')->forgetUser();
        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);
    }

    /**
     * Memastikan port ODP unik agnostik (MySQL 8 / Postgres) via active_port_key:
     * Port yang sama tidak boleh aktif bersamaan, tapi boleh dipakai jika pelanggan terminated atau soft deleted.
     */
    public function test_odp_port_database_agnostic_constraint(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-TEST-UNIQUE-01',
            'name' => 'ODP Test Unique Constraint',
            'port_capacity' => 8,
        ]);

        // Pelanggan 1 aktif di Port 8
        $cust1 = Customer::create([
            'customer_code' => 'FMP-PORT-01',
            'name' => 'Pelanggan Port 1',
            'address' => 'Jl. Mawar No. 1',
            'phone' => '081299990001',
            'status' => 'active',
            'odp_id' => $odp->id,
            'odp_port' => 8,
        ]);
        $cust1->refresh();

        $this->assertNotNull($cust1->active_port_key);

        // Pelanggan 2 mencoba memakai Port 8 saat pelanggan 1 masih active -> Gagal integritas unik
        $duplicateExceptionCaught = false;
        try {
            Customer::create([
                'customer_code' => 'FMP-PORT-02',
                'name' => 'Pelanggan Port 2',
                'address' => 'Jl. Mawar No. 2',
                'phone' => '081299990002',
                'status' => 'active',
                'odp_id' => $odp->id,
                'odp_port' => 8,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            $duplicateExceptionCaught = true;
        }
        $this->assertTrue($duplicateExceptionCaught, 'Database wajib menolak duplikasi active_port_key pada port yang sama.');

        // Saat pelanggan 1 terminated, active_port_key menjadi NULL dan port dapat digunakan
        $cust1->update(['status' => 'terminated']);
        $cust1->refresh();
        $this->assertNull($cust1->active_port_key);

        $cust2 = Customer::create([
            'customer_code' => 'FMP-PORT-02',
            'name' => 'Pelanggan Port 2 Baru',
            'address' => 'Jl. Mawar No. 2',
            'phone' => '081299990002',
            'status' => 'active',
            'odp_id' => $odp->id,
            'odp_port' => 8,
        ]);
        $this->assertNotNull($cust2->id);
    }

    /**
     * PRD v1.2: Memastikan port ODP ditahan 30 hari kalender setelah pelanggan terminated
     * dan otomatis dilepas oleh perintah artisan odp:release-held-ports.
     */
    public function test_terminated_customer_port_is_held_and_released(): void
    {
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('Superadmin');
        $odp = Odp::first();

        $cust = Customer::create([
            'customer_code' => 'FMP-HOLD-01',
            'name' => 'Pelanggan Uji Held',
            'address' => 'Jl. Anggrek No. 1',
            'phone' => '081299998888',
            'status' => 'active',
            'odp_id' => $odp->id,
            'odp_port' => 7,
        ]);

        // 1. Admin mengubah status pelanggan menjadi terminated lewat API endpoint
        $response = $this->actingAs($admin)->putJson("/api/customers/{$cust->id}/status", [
            'status' => 'terminated',
            'notes' => 'Pelanggan minta putus langganan.',
        ]);

        $response->assertOk();
        $cust->refresh();

        // Status di DB adalah 'held' dan tercatat di odp_port_history
        $this->assertEquals('held', $cust->status);
        $this->assertDatabaseHas('odp_port_history', [
            'odp_id' => $odp->id,
            'port_number' => 7,
            'customer_id' => $cust->id,
            'action' => 'held',
        ]);

        // 2. Jalankan perintah pelepasan saat belum kedaluwarsa: port tetap held
        $this->artisan('odp:release-held-ports')->assertSuccessful();
        $cust->refresh();
        $this->assertEquals('held', $cust->status);
        $this->assertEquals(7, $cust->odp_port);

        // 3. Simulasikan waktu lewat 31 hari ke depan
        $history = \App\Models\OdpPortHistory::where('customer_id', $cust->id)->first();
        $history->update(['held_until' => now()->subDay()]);

        // 4. Jalankan perintah pelepasan kembali: port dilepas dan status menjadi terminated
        $this->artisan('odp:release-held-ports')->assertSuccessful();
        $cust->refresh();
        $this->assertEquals('terminated', $cust->status);
        $this->assertNull($cust->odp_port);

        $this->assertDatabaseHas('odp_port_history', [
            'id' => $history->id,
            'action' => 'released',
        ]);
    }

    /**
     * Memastikan SoftDeletes aktif pada customers, odps, tasks, complaints.
     */
    public function test_soft_deletes_on_critical_entities(): void
    {
        $customer = Customer::first();
        $customer->delete();
        $this->assertSoftDeleted('customers', ['id' => $customer->id]);

        $odp = Odp::first();
        $odp->delete();
        $this->assertSoftDeleted('odps', ['id' => $odp->id]);

        $task = Task::factory()->create();
        $task->delete();
        $this->assertSoftDeleted('tasks', ['id' => $task->id]);

        $complaint = Complaint::create([
            'ticket_number' => 'TCK-TEST-SD-01',
            'customer_id' => $customer->id,
            'customer_name' => 'Uji Soft Delete',
            'customer_phone' => '081200000001',
            'customer_address' => 'Jl. Mawar No. 1',
            'area' => 'Bululawang',
            'category' => 'no_signal',
            'subject' => 'LOS Redaman',
            'description' => 'Deskripsi pengaduan uji coba',
            'status' => 'open',
            'priority' => 'critical',
            'created_by_id' => User::first()->id,
        ]);
        $complaint->delete();
        $this->assertSoftDeleted('complaints', ['id' => $complaint->id]);
    }
}
