<?php

namespace Tests\Feature\Network;

use App\Jobs\SyncBrasSessionsJob;
use App\Models\BrasDevice;
use App\Models\Customer;
use App\Models\User;
use App\Services\Mikrotik\BrasSyncService;
use App\Services\Mikrotik\MikrotikApiClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrasSessionSyncTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected BrasDevice $brasDevice;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create([
            'name' => 'Admin Network',
        ]);
        $this->admin->assignRole('Admin');

        $this->brasDevice = BrasDevice::create([
            'name' => 'BRAS-UTAMA-01',
            'ip_address' => '10.200.0.1',
            'api_port' => 8728,
            'username' => 'api_admin',
            'password' => 'secret123',
            'is_active' => true,
        ]);
    }

    protected function tearDown(): void
    {
        MikrotikApiClient::restore();
        parent::tearDown();
    }

    protected function createCustomer(array $attributes = []): Customer
    {
        static $seq = 1;
        $idx = $seq++;

        return Customer::create(array_merge([
            'customer_code' => "CUST-BR-{$idx}",
            'name' => "Customer BRAS {$idx}",
            'phone' => "0812999900{$idx}",
            'address' => 'Jl. Jaringan No. '.$idx,
            'package' => '20 Mbps Home',
            'status' => 'active',
            'is_online' => false,
        ], $attributes));
    }

    public function test_it_fetches_active_pppoe_sessions_and_marks_customer_online_as_hint_without_overwriting_service_status(): void
    {
        // Setup customer 1: active service status
        $custActive = $this->createCustomer([
            'bras_id' => $this->brasDevice->id,
            'customer_code' => 'CUST-001',
            'username' => 'user_active_01',
            'status' => 'active',
            'is_online' => false,
        ]);

        // Setup customer 2: suspended service status (e.g. unpaid)
        $custSuspended = $this->createCustomer([
            'bras_id' => $this->brasDevice->id,
            'customer_code' => 'CUST-002',
            'username' => 'user_suspended_02',
            'status' => 'suspended',
            'is_online' => false,
        ]);

        // Mock sessions from RouterOS API
        MikrotikApiClient::fake([
            '10.200.0.1:8728' => [
                [
                    'name' => 'user_active_01',
                    'service' => 'pppoe',
                    'caller_id' => '00:11:22:33:44:55',
                    'address' => '100.64.0.10',
                    'uptime' => '2h35m',
                    'session_id' => 'sess-001',
                ],
                [
                    'name' => 'user_suspended_02',
                    'service' => 'pppoe',
                    'caller_id' => 'AA:BB:CC:DD:EE:FF',
                    'address' => '100.64.0.11',
                    'uptime' => '12m',
                    'session_id' => 'sess-002',
                ],
            ],
        ]);

        $service = app(BrasSyncService::class);
        $result = $service->syncDevice($this->brasDevice);

        $this->assertTrue($result['success']);
        $this->assertEquals(2, $result['active_sessions']);

        // Customer 1 check: online hint updated, service status NOT changed
        $custActive->refresh();
        $this->assertTrue($custActive->is_online);
        $this->assertEquals('100.64.0.10', $custActive->current_ip_address);
        $this->assertEquals('00:11:22:33:44:55', $custActive->current_mac_address);
        $this->assertEquals('2h35m', $custActive->session_uptime);
        $this->assertEquals('active', $custActive->status, 'Service status must remain active');

        // Customer 2 check: online hint updated, service status must NOT be overridden to active!
        $custSuspended->refresh();
        $this->assertTrue($custSuspended->is_online);
        $this->assertEquals('100.64.0.11', $custSuspended->current_ip_address);
        $this->assertEquals('AA:BB:CC:DD:EE:FF', $custSuspended->current_mac_address);
        $this->assertEquals('suspended', $custSuspended->status, 'Service status must remain suspended');

        // Device stats check
        $this->brasDevice->refresh();
        $this->assertEquals('success', $this->brasDevice->last_sync_status);
        $this->assertEquals(2, $this->brasDevice->active_sessions_count);
        $this->assertNotNull($this->brasDevice->last_synced_at);
    }

    public function test_it_records_session_log_with_source_bras(): void
    {
        $customer = $this->createCustomer([
            'bras_id' => $this->brasDevice->id,
            'username' => 'user_log_test',
            'status' => 'active',
            'is_online' => false,
        ]);

        MikrotikApiClient::fake([
            '10.200.0.1:8728' => [
                [
                    'name' => 'user_log_test',
                    'service' => 'pppoe',
                    'caller_id' => '11:22:33:44:55:66',
                    'address' => '100.64.1.20',
                    'uptime' => '45m',
                    'session_id' => 'sess-log-1',
                ],
            ],
        ]);

        $service = app(BrasSyncService::class);
        $service->syncDevice($this->brasDevice);

        // Verify bras_session_logs table record
        $this->assertDatabaseHas('bras_session_logs', [
            'bras_device_id' => $this->brasDevice->id,
            'customer_id' => $customer->id,
            'username' => 'user_log_test',
            'event' => 'online',
            'source' => 'bras',
            'ip_address' => '100.64.1.20',
        ]);
    }

    public function test_it_marks_customer_offline_when_session_drops_without_touching_service_status(): void
    {
        $customer = $this->createCustomer([
            'bras_id' => $this->brasDevice->id,
            'username' => 'user_disconnect_test',
            'status' => 'active',
            'is_online' => true,
            'current_ip_address' => '100.64.1.50',
            'session_uptime' => '5h',
        ]);

        // Empty session list represents disconnected user
        MikrotikApiClient::fake([
            '10.200.0.1:8728' => [],
        ]);

        $service = app(BrasSyncService::class);
        $service->syncDevice($this->brasDevice);

        $customer->refresh();
        $this->assertFalse($customer->is_online);
        $this->assertNotNull($customer->last_offline_at);
        $this->assertNull($customer->session_uptime);
        $this->assertEquals('active', $customer->status, 'Service status must remain active');

        // Assert log entry for offline with source = 'bras'
        $this->assertDatabaseHas('bras_session_logs', [
            'bras_device_id' => $this->brasDevice->id,
            'customer_id' => $customer->id,
            'username' => 'user_disconnect_test',
            'event' => 'offline',
            'source' => 'bras',
        ]);
    }

    public function test_it_handles_connection_failure_gracefully_without_unhandled_exception(): void
    {
        MikrotikApiClient::fake([
            '10.200.0.1:8728' => new Exception('Connection timed out after 5000ms'),
        ]);

        $service = app(BrasSyncService::class);
        $result = $service->syncDevice($this->brasDevice);

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Connection timed out', $result['message']);

        $this->brasDevice->refresh();
        $this->assertEquals('failed', $this->brasDevice->last_sync_status);
        $this->assertStringContainsString('Connection timed out', $this->brasDevice->last_sync_error);
    }

    public function test_scheduled_job_and_artisan_command_run_successfully(): void
    {
        $this->createCustomer([
            'bras_id' => $this->brasDevice->id,
            'username' => 'user_artisan_test',
            'status' => 'active',
            'is_online' => false,
        ]);

        MikrotikApiClient::fake([
            '10.200.0.1:8728' => [
                [
                    'name' => 'user_artisan_test',
                    'service' => 'pppoe',
                    'address' => '100.64.0.99',
                    'uptime' => '10m',
                ],
            ],
        ]);

        // Test dispatching the job
        SyncBrasSessionsJob::dispatchSync($this->brasDevice->id);

        $this->brasDevice->refresh();
        $this->assertEquals(1, $this->brasDevice->active_sessions_count);

        // Test Artisan command execution
        $this->artisan('bras:sync-sessions', ['--bras_id' => $this->brasDevice->id])
            ->assertExitCode(0);
    }

    public function test_admin_api_endpoints_for_bras_and_sync(): void
    {
        $this->createCustomer([
            'bras_id' => $this->brasDevice->id,
            'username' => 'user_api_test',
            'status' => 'active',
            'is_online' => false,
        ]);

        MikrotikApiClient::fake([
            '10.200.0.1:8728' => [
                [
                    'name' => 'user_api_test',
                    'service' => 'pppoe',
                    'address' => '100.64.0.88',
                    'uptime' => '30m',
                ],
            ],
        ]);

        // 1. List BRAS devices
        $resList = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/network/bras-devices');
        $resList->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.name', 'BRAS-UTAMA-01');

        // 2. Trigger sync
        $resSync = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/network/bras-devices/{$this->brasDevice->id}/sync");
        $resSync->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.active_sessions', 1);

        // 3. Inspect logs with source = 'bras'
        $resLogs = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/network/bras-devices/{$this->brasDevice->id}/logs");
        $resLogs->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.data.0.source', 'bras')
            ->assertJsonPath('data.data.0.username', 'user_api_test');
    }
}
