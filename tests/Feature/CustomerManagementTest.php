<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_admin_can_list_customers_and_filter_by_status(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        Customer::create([
            'customer_code' => 'CUST-001',
            'name' => 'Budi Santoso',
            'address' => 'Jl. Merdeka No 1',
            'phone' => '081234567890',
            'package' => '50 Mbps',
            'odp_code' => 'ODP-JKT-01',
            'status' => 'active',
        ]);

        Customer::create([
            'customer_code' => 'CUST-002',
            'name' => 'Siti Rahma',
            'address' => 'Jl. Sudirman No 2',
            'phone' => '081234567891',
            'package' => '100 Mbps',
            'odp_code' => 'ODP-JKT-02',
            'status' => 'suspended',
        ]);

        Sanctum::actingAs($admin);

        // 1. List all
        $response = $this->getJson('/api/admin/customers');
        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        // 2. Filter active
        $activeResponse = $this->getJson('/api/admin/customers?status=active');
        $activeResponse->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_code', 'CUST-001');

        // 3. Stats
        $statsResponse = $this->getJson('/api/admin/customers/stats');
        $statsResponse->assertStatus(200)
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.active', 1)
            ->assertJsonPath('data.suspended', 1)
            ->assertJsonPath('data.terminated', 0);
    }

    public function test_admin_can_view_and_update_customer_status(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $customer = Customer::create([
            'customer_code' => 'CUST-003',
            'name' => 'Ahmad Dahlan',
            'address' => 'Jl. Gatot Subroto No 3',
            'phone' => '081234567892',
            'package' => '30 Mbps',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        // 1. View detail
        $detailResponse = $this->getJson("/api/admin/customers/{$customer->id}");
        $detailResponse->assertStatus(200)
            ->assertJsonPath('data.name', 'Ahmad Dahlan');

        // 2. Update status to suspended
        $patchResponse = $this->patchJson("/api/admin/customers/{$customer->id}/status", [
            'status' => 'suspended',
            'notes' => 'Menunggak pembayaran 1 bulan',
        ]);

        $patchResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'suspended');

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'status' => 'suspended',
        ]);
    }

    public function test_admin_cannot_delete_customer(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $customer = Customer::create([
            'customer_code' => 'FMP-202608-0004',
            'name' => 'Hendro',
            'address' => 'Jl. Diponegoro No 4',
            'phone' => '081234567893',
            'package' => '50 Mbps',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/superadmin/customers/{$customer->id}");
        $response->assertStatus(403);

        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
    }

    public function test_superadmin_can_delete_customer(): void
    {
        $superadmin = User::factory()->create();
        $superadmin->assignRole('Superadmin');

        $customer = Customer::create([
            'customer_code' => 'FMP-202608-0005',
            'name' => 'Bambang',
            'address' => 'Jl. Pahlawan No 5',
            'phone' => '081234567894',
            'package' => '100 Mbps',
            'status' => 'active',
        ]);

        Sanctum::actingAs($superadmin);

        $response = $this->deleteJson("/api/superadmin/customers/{$customer->id}");
        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('customers', ['id' => $customer->id]);
    }
}
