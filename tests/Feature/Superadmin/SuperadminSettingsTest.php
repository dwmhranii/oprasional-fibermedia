<?php

namespace Tests\Feature\Superadmin;

use App\Models\Complaint;
use App\Models\ComplaintType;
use App\Models\Holiday;
use App\Models\OfficeLocation;
use App\Models\PauseReason;
use App\Models\SlaSetting;
use App\Models\User;
use App\Services\TotpService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SuperadminSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected User $admin;

    protected User $teknisi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superadmin = User::role('Superadmin')->first();
        $this->admin = User::role('Admin/CS')->first() ?? User::role('Admin')->first();
        $this->teknisi = User::role('Teknisi')->first();
    }

    /**
     * Matriks Hak Akses: Superadmin tidak dapat mencabut izin Superadmin sendiri.
     */
    public function test_superadmin_cannot_revoke_own_role_permissions(): void
    {
        $superadminRole = Role::where('name', 'Superadmin')->first();

        $response = $this->actingAs($this->superadmin)
            ->putJson("/api/roles/{$superadminRole->id}/permissions", [
                'permissions' => [],
            ]);

        $response->assertStatus(422);
    }

    /**
     * Matriks Hak Akses: Role sistem bawaan tidak dapat dihapus.
     */
    public function test_system_core_roles_cannot_be_deleted(): void
    {
        $coreRoleNames = ['Superadmin', 'Admin/CS', 'NOC/Dispatcher', 'Teknisi', 'Sales', 'Collector'];

        foreach ($coreRoleNames as $name) {
            $role = Role::where('name', $name)->first();
            if ($role) {
                $response = $this->actingAs($this->superadmin)
                    ->deleteJson("/api/roles/{$role->id}");
                $response->assertStatus(403);
            }
        }
    }

    /**
     * Jenis Gangguan: CRUD dan proteksi jenis yang dipakai tiket (hanya dinonaktifkan).
     */
    public function test_complaint_type_crud_and_in_use_deactivation_rule(): void
    {
        // 1. Tambah jenis gangguan baru
        $storeRes = $this->actingAs($this->superadmin)->postJson('/api/complaint-types', [
            'name' => 'Kabel Drop Core Terbakar',
            'description' => 'Drop core terkena sambaran petir atau terbakar',
            'default_priority' => 'critical',
            'is_active' => true,
        ]);
        $storeRes->assertStatus(201);
        $typeId = $storeRes->json('data.id');

        // 2. Ubah jenis gangguan
        $updateRes = $this->actingAs($this->superadmin)->putJson("/api/complaint-types/{$typeId}", [
            'description' => 'Drop core terkena sambaran petir atau arus pendek',
        ]);
        $updateRes->assertOk();

        // 3. Buat pengaduan yang menggunakan jenis ini
        $customer = \App\Models\Customer::first();
        $complaint = Complaint::create([
            'ticket_number' => 'TCK-CT-001',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_address' => $customer->address,
            'area' => 'Bululawang',
            'category' => 'equipment',
            'complaint_type_id' => $typeId,
            'subject' => 'Drop core terbakar',
            'description' => 'Kabel drop core terbakar dekat tiang',
            'status' => 'open',
            'priority' => 'critical',
            'created_by_id' => $this->superadmin->id,
        ]);

        // 4. Mencoba menghapus jenis yang dipakai tiket -> Ditolak penghapusan fisik, otomatis dinonaktifkan
        $delRes = $this->actingAs($this->superadmin)->deleteJson("/api/complaint-types/{$typeId}");
        $delRes->assertOk();
        $this->assertEquals('deactivated', $delRes->json('data.action'));

        // Cek database: record masih ada dengan is_active = false
        $type = ComplaintType::withTrashed()->find($typeId);
        $this->assertNotNull($type);
        $this->assertFalse((bool) $type->is_active);

        // 5. Hapus jenis yang belum pernah dipakai tiket -> Soft delete
        $unusedType = ComplaintType::create([
            'name' => 'Jenis Tanpa Tiket',
            'default_priority' => 'medium',
            'is_active' => true,
        ]);
        $delUnused = $this->actingAs($this->superadmin)->deleteJson("/api/complaint-types/{$unusedType->id}");
        $delUnused->assertOk();
        $this->assertEquals('deleted', $delUnused->json('data.action'));
        $this->assertSoftDeleted('complaint_types', ['id' => $unusedType->id]);
    }

    /**
     * Pengaturan SLA: Memperbarui durasi target dan memastikan tercatat di audit log.
     */
    public function test_sla_settings_update_and_audit_logging(): void
    {
        $criticalSetting = SlaSetting::where('priority', 'critical')->first();

        $response = $this->actingAs($this->superadmin)->putJson("/api/sla-settings/{$criticalSetting->id}", [
            'resolution_hours' => 4,
            'description' => 'Target SLA penanganan kritis 4 jam operasional',
        ]);
        $response->assertOk();

        $criticalSetting->refresh();
        $this->assertEquals(4, $criticalSetting->resolution_hours);
        $this->assertEquals(240, $criticalSetting->resolution_minutes);

        // Verifikasi audit log tercatat
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'sla_settings',
            'causer_id' => $this->superadmin->id,
        ]);
    }

    /**
     * Lokasi Kantor: CRUD, saklar insiden Wi-Fi, dan deteksi kantor terdekat (Haversine).
     */
    public function test_office_locations_crud_incident_toggle_and_nearest_detection(): void
    {
        // 1. Buat kantor cabang baru
        $storeRes = $this->actingAs($this->superadmin)->postJson('/api/office-locations', [
            'name' => 'Kantor Cabang Kepanjen',
            'latitude' => -8.1300000,
            'longitude' => 112.5700000,
            'radius_meters' => 60,
            'valid_wifi_ips' => ['192.168.2.1', '10.20.0.1'],
            'is_active' => true,
        ]);
        $storeRes->assertStatus(201);
        $branchId = $storeRes->json('data.id');

        // 2. Saklar darurat gangguan Wi-Fi
        $toggleRes = $this->actingAs($this->superadmin)->postJson("/api/office-locations/{$branchId}/toggle-incident", [
            'wifi_incident_active' => true,
            'wifi_incident_note' => 'Modem Wi-Fi kantor cabang tersambar petir',
        ]);
        $toggleRes->assertOk();
        $this->assertDatabaseHas('office_locations', [
            'id' => $branchId,
            'wifi_incident_active' => 1,
            'wifi_incident_note' => 'Modem Wi-Fi kantor cabang tersambar petir',
        ]);

        // 3. Deteksi kantor terdekat (Haversine)
        // Posisi user sangat dekat dengan Cabang Kepanjen: -8.1301000, 112.5701000 (~15 meter)
        $nearestRes = $this->actingAs($this->superadmin)->getJson('/api/office-locations/nearest?latitude=-8.1301000&longitude=112.5701000');
        $nearestRes->assertOk();
        $this->assertEquals($branchId, $nearestRes->json('data.office.id'));
        $this->assertTrue($nearestRes->json('data.is_within_radius'));
        $this->assertLessThan(50, $nearestRes->json('data.distance_meters'));
    }

    /**
     * Hari Libur Nasional & Alasan Jeda SLA CRUD.
     */
    public function test_holidays_and_pause_reasons_crud(): void
    {
        // Holiday CRUD
        $holRes = $this->actingAs($this->superadmin)->postJson('/api/holidays', [
            'name' => 'Hari Libur Uji Coba',
            'holiday_date' => '2026-11-10',
            'description' => 'Hari Pahlawan Nasional',
        ]);
        $holRes->assertStatus(201);
        $holId = $holRes->json('data.id');

        $this->actingAs($this->superadmin)->deleteJson("/api/holidays/{$holId}")->assertOk();
        $this->assertDatabaseMissing('holidays', ['id' => $holId]);

        // Pause Reason CRUD
        $prRes = $this->actingAs($this->superadmin)->postJson('/api/pause-reasons', [
            'code' => 'bencana_alam',
            'reason' => 'Bencana Alam / Gempa Bumi',
            'requires_photo' => true,
            'is_active' => true,
        ]);
        $prRes->assertStatus(201);
        $prId = $prRes->json('data.id');

        $this->actingAs($this->superadmin)->putJson("/api/pause-reasons/{$prId}", [
            'reason' => 'Bencana Alam / Banjir Bandang',
        ])->assertOk();

        $this->assertDatabaseHas('pause_reasons', [
            'id' => $prId,
            'reason' => 'Bencana Alam / Banjir Bandang',
        ]);
    }

    /**
     * 2FA TOTP: Setup, verifikasi kode 6-digit, dan penonaktifan.
     */
    public function test_two_factor_totp_flow(): void
    {
        $totpService = app(TotpService::class);

        // 1. Status awal: belum aktif
        $statusRes = $this->actingAs($this->superadmin)->getJson('/api/user/2fa/status');
        $statusRes->assertOk();
        $this->assertFalse($statusRes->json('data.enabled'));

        // 2. Inisiasi setup
        $setupRes = $this->actingAs($this->superadmin)->postJson('/api/user/2fa/setup');
        $setupRes->assertOk();
        $secret = $setupRes->json('data.secret');
        $this->assertNotEmpty($secret);

        // 3. Coba konfirmasi dengan kode salah -> Ditolak
        $failConfirm = $this->actingAs($this->superadmin)->postJson('/api/user/2fa/confirm', [
            'code' => '000000',
        ]);
        $failConfirm->assertStatus(422);

        // 4. Konfirmasi dengan kode TOTP yang benar
        $validCode = $totpService->getCode($secret);
        $confirmRes = $this->actingAs($this->superadmin)->postJson('/api/user/2fa/confirm', [
            'code' => $validCode,
        ]);
        $confirmRes->assertOk();
        $this->assertTrue($confirmRes->json('data.enabled'));
        $this->assertCount(8, $confirmRes->json('data.recovery_codes'));

        $this->superadmin->refresh();
        $this->assertNotNull($this->superadmin->two_factor_confirmed_at);

        // 5. Nonaktifkan dengan kata sandi
        $disableRes = $this->actingAs($this->superadmin)->postJson('/api/user/2fa/disable', [
            'password' => 'password',
        ]);
        $disableRes->assertOk();

        $this->superadmin->refresh();
        $this->assertNull($this->superadmin->two_factor_confirmed_at);
        $this->assertNull($this->superadmin->two_factor_secret);
    }
}

