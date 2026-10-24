<?php

namespace Tests\Feature\Network;

use App\Models\BrasDevice;
use App\Models\CableTrack;
use App\Models\Customer;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Package;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NetworkSyncTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);

        $this->admin = User::factory()->create([
            'email' => 'admin.net@fibermedia.test',
        ]);
        $this->admin->assignRole('Admin');
    }

    public function test_odc_crud_and_resource_structure(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/odcs', [
            'code' => 'ODC-TEST-01',
            'name' => 'ODC Test Sentral',
            'capacity_odp' => 24,
            'operational_status' => 'normal',
            'wilayah' => 'Malang',
            'latitude' => -7.9824,
            'longitude' => 112.6304,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.code', 'ODC-TEST-01')
            ->assertJsonPath('data.capacity_odp', 24)
            ->assertJsonPath('data.operational_status', 'normal');

        $odcId = $response->json('data.id');

        // Show
        $showRes = $this->actingAs($this->admin)->getJson("/api/admin/odcs/{$odcId}");
        $showRes->assertStatus(200)
            ->assertJsonPath('data.name', 'ODC Test Sentral');

        // Update status to disrupted
        $updateRes = $this->actingAs($this->admin)->putJson("/api/admin/odcs/{$odcId}", [
            'code' => 'ODC-TEST-01',
            'name' => 'ODC Test Sentral Updated',
            'capacity_odp' => 24,
            'operational_status' => 'disrupted',
        ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.operational_status', 'disrupted');
    }

    public function test_odp_port_box_visualizer_and_coordinate_relocation_approval(): void
    {
        $odc = Odc::create([
            'code' => 'ODC-01',
            'name' => 'ODC Pusat',
            'capacity_odp' => 48,
            'operational_status' => 'normal',
        ]);

        $odp = Odp::create([
            'odc_id' => $odc->id,
            'code' => 'ODP-01',
            'name' => 'ODP Tiang 1',
            'latitude' => -7.9800,
            'longitude' => 112.6300,
            'proposed_latitude' => -7.9810,
            'proposed_longitude' => 112.6310,
            'port_capacity' => 8,
            'operational_status' => 'normal',
            'is_approved' => false,
        ]);

        $pkg = Package::create([
            'code' => 'PKG-50M',
            'name' => 'Paket Fiber 50M',
            'speed_mbps' => 50,
            'price' => 250000,
            'is_active' => true,
        ]);

        // Attach a customer to port 3
        Customer::create([
            'customer_code' => 'CUST-PORT-03',
            'name' => 'Budi Santoso',
            'phone' => '081234567890',
            'address' => 'Jl. Mawar No. 1',
            'service_type' => 'pppoe',
            'package_id' => $pkg->id,
            'odp_id' => $odp->id,
            'odp_port' => 3,
            'status' => 'active',
        ]);

        // Show ODP
        $res = $this->actingAs($this->admin)->getJson("/api/admin/odps/{$odp->id}");
        $res->assertStatus(200)
            ->assertJsonPath('data.port_capacity', 8)
            ->assertJsonPath('data.occupied_ports_count', 1)
            ->assertJsonPath('data.available_ports_count', 7)
            ->assertJsonPath('data.has_pending_relocation', true);

        // Check port 3 is occupied and port 1 is vacant
        $ports = $res->json('data.ports');
        $this->assertCount(8, $ports);
        $this->assertFalse($ports[0]['is_occupied']); // Port 1
        $this->assertTrue($ports[2]['is_occupied']);  // Port 3
        $this->assertEquals('CUST-PORT-03', $ports[2]['customer']['customer_code']);

        // Approve coordinate relocation
        $approveRes = $this->actingAs($this->admin)->postJson("/api/admin/odps/{$odp->id}/approve", [
            'approve' => true,
        ]);
        $approveRes->assertStatus(200)
            ->assertJsonPath('data.is_approved', true)
            ->assertJsonPath('data.latitude', -7.981);

        $odp->refresh();
        $this->assertEquals(-7.9810, (float) $odp->latitude);
        $this->assertTrue($odp->is_approved);
    }

    public function test_cable_tracks_crud_undrawn_filter_and_approval(): void
    {
        // 1. Drawn cable
        $drawn = CableTrack::create([
            'client_uuid' => 'uuid-drawn-1',
            'name' => 'Kabel Feeder ODC-ODP',
            'coordinates' => [[112.63, -7.98], [112.635, -7.985]],
            'simplified_points_count' => 2,
            'total_length_meters' => 650.5,
            'status' => 'proposed',
            'operational_status' => 'normal',
        ]);

        // 2. Undrawn cable (empty coordinates)
        $undrawn = CableTrack::create([
            'client_uuid' => 'uuid-undrawn-1',
            'name' => 'Kabel Rencana Distribusi',
            'coordinates' => [],
            'simplified_points_count' => 0,
            'total_length_meters' => 0,
            'status' => 'proposed',
            'operational_status' => 'normal',
        ]);

        // Test normal index
        $resAll = $this->actingAs($this->admin)->getJson('/api/admin/cable-tracks');
        $resAll->assertStatus(200);
        $this->assertCount(2, $resAll->json('data'));

        // Test undrawn filter
        $resUndrawn = $this->actingAs($this->admin)->getJson('/api/admin/cable-tracks?undrawn=1');
        $resUndrawn->assertStatus(200);
        $this->assertCount(1, $resUndrawn->json('data'));
        $this->assertEquals('Kabel Rencana Distribusi', $resUndrawn->json('data.0.name'));
        $this->assertFalse($resUndrawn->json('data.0.is_drawn'));

        // Approve cable track
        $resApprove = $this->actingAs($this->admin)->postJson("/api/admin/cable-tracks/{$drawn->id}/approve");
        $resApprove->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $drawn->refresh();
        $this->assertEquals('approved', $drawn->status);
    }

    public function test_bras_device_resource_conceals_password(): void
    {
        $bras = BrasDevice::create([
            'name' => 'CCR-CORE-MALANG',
            'ip_address' => '10.20.0.1',
            'api_port' => 8728,
            'username' => 'api_user',
            'password' => 'secret_router_pass_123',
            'is_active' => true,
            'active_sessions_count' => 142,
            'total_active_sessions' => 142,
            'cpu_load' => 12,
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/admin/network/bras-devices');
        $res->assertStatus(200);

        // Password should NOT be exposed
        $data = $res->json('data.0');
        $this->assertEquals('CCR-CORE-MALANG', $data['name']);
        $this->assertEquals('10.20.0.1', $data['ip_address']);
        $this->assertTrue($data['has_password']);
        $this->assertArrayNotHasKey('password', $data);
        $this->assertEquals(142, $data['total_active_sessions']);
        $this->assertEquals(142, $data['active_sessions_count']);
    }

    public function test_network_approvals_and_logs_endpoints(): void
    {
        // Approvals endpoint
        $resApprovals = $this->actingAs($this->admin)->getJson('/api/admin/network/approvals');
        $resApprovals->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'pending_odps',
                    'pending_cable_tracks',
                ],
            ]);

        // Logs endpoint
        $resLogs = $this->actingAs($this->admin)->getJson('/api/admin/network/logs');
        $resLogs->assertStatus(200)
            ->assertJsonStructure(['data']);
    }
}
