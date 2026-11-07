<?php

namespace Tests\Feature\Customer;

use App\Exports\CustomersExport;
use App\Imports\CustomersImport;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Laravel\Sanctum\Sanctum;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CustomerSync35Test extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create(['name' => 'Admin Test', 'email' => 'admin@test.com']);
        $this->admin->assignRole('Admin');
    }

    public function test_customer_resource_masks_nik_and_never_exposes_password(): void
    {
        $package = Package::create([
            'name' => 'Paket Ultra 50M',
            'code' => 'ULTRA-50M',
            'speed' => 50,
            'price' => 250000,
            'is_active' => true,
        ]);

        $odp = Odp::create([
            'code' => 'ODP-KPN-01',
            'name' => 'ODP Kepanjen 01',
            'address' => 'Jl. Panglima Sudirman',
            'latitude' => -8.1234567,
            'longitude' => 112.5678901,
            'port_capacity' => 8,
            'status' => 'active',
            'is_approved' => true,
        ]);

        $customer = Customer::create([
            'customer_code' => 'FM-20261024-TEST',
            'name' => 'Ahmad Dahlan',
            'nik' => '3507123456780001',
            'password' => 'MySecretPassword123!',
            'phone' => '081234567890',
            'address' => 'Jl. Merdeka No. 45',
            'service_type' => 'pppoe',
            'username' => 'ahmad@fibermedia',
            'package_id' => $package->id,
            'monthly_price' => 250000,
            'odp_id' => $odp->id,
            'odp_port' => 1,
            'status' => 'active',
            'debt' => 0,
        ]);

        Sanctum::actingAs($this->admin);

        // 1. Detail endpoint: GET /api/customers/{id}
        $response = $this->getJson("/api/customers/{$customer->id}");
        $response->assertStatus(200);

        $data = $response->json('data');

        // NIK harus bertopeng (contoh: 3507••••••••0001)
        $this->assertEquals('3507••••••••0001', $data['nik']);
        $this->assertEquals('3507••••••••0001', $data['nik_masked']);

        // Password mentah TIDAK BOLEH pernah muncul di JSON
        $response->assertJsonMissing(['password' => 'MySecretPassword123!']);
        $this->assertArrayNotHasKey('password', $data);
        $this->assertEquals('••••••••', $data['password_masked']);

        // 2. Listing endpoint: GET /api/customers
        $listResponse = $this->getJson('/api/customers');
        $listResponse->assertStatus(200);
        $listResponse->assertJsonMissing(['password' => 'MySecretPassword123!']);
        $listRow = $listResponse->json('data.0');
        $this->assertEquals('3507••••••••0001', $listRow['nik']);
    }

    public function test_customer_secrets_endpoint_requires_permission_and_logs_activity(): void
    {
        $customer = Customer::create([
            'customer_code' => 'FM-20261024-SEC1',
            'name' => 'Bambang Sudiro',
            'nik' => '3507987654320002',
            'password' => 'SuperSecretPass#99',
            'phone' => '081234567891',
            'address' => 'Jl. Diponegoro 10',
            'service_type' => 'pppoe',
            'username' => 'bambang@fibermedia',
            'status' => 'active',
        ]);

        // User tanpa izin customers.view_secret
        $plainUser = User::factory()->create();
        Sanctum::actingAs($plainUser);

        $forbiddenRes = $this->getJson("/api/customers/{$customer->id}/secrets");
        $forbiddenRes->assertStatus(403);

        // User dengan izin customers.view_secret (tanpa harus role admin)
        $privilegedUser = User::factory()->create(['name' => 'Supervisor Security']);
        $privilegedUser->givePermissionTo('customers.view_secret');
        Sanctum::actingAs($privilegedUser);

        $secretRes = $this->getJson("/api/customers/{$customer->id}/secrets");
        $secretRes->assertStatus(200);

        $secretData = $secretRes->json('data');
        $this->assertEquals('3507987654320002', $secretData['nik']);
        $this->assertEquals('SuperSecretPass#99', $secretData['password']);
        $this->assertEquals('bambang@fibermedia', $secretData['username']);

        // Juga dapat diakses lewat /api/customers/{id}/secrets oleh Admin
        $this->admin->givePermissionTo('customers.view_secret');
        Sanctum::actingAs($this->admin);
        $adminSecretRes = $this->getJson("/api/customers/{$customer->id}/secrets");
        $adminSecretRes->assertStatus(200);

        // Pastikan terekam di ActivityLog
        $log = Activity::where('log_name', 'customer_security')
            ->where('subject_id', $customer->id)
            ->latest()
            ->first();

        $this->assertNotNull($log, 'Log audit keamanan wajib terekam saat kredensial dibuka');
        $this->assertEquals($privilegedUser->id, $log->causer_id);
        $this->assertStringContainsString('kredensial rahasia', $log->description);
    }

    public function test_customer_list_filters_and_fuzzy_search(): void
    {
        $odp1 = Odp::create([
            'code' => 'ODP-GDL-01',
            'name' => 'ODP Gondanglegi Utara',
            'address' => 'Gondanglegi',
            'port_capacity' => 8,
            'is_approved' => true,
        ]);
        $odp2 = Odp::create([
            'code' => 'ODP-KPN-02',
            'name' => 'ODP Kepanjen Pasar',
            'address' => 'Kepanjen',
            'port_capacity' => 8,
            'is_approved' => true,
        ]);

        $c1 = Customer::create([
            'customer_code' => 'FM-20261024-C001',
            'name' => 'Chandra Wijaya',
            'phone' => '081234567890',
            'address' => 'Jl. Anggrek No 1',
            'service_type' => 'pppoe',
            'username' => 'chandra.net',
            'odp_id' => $odp1->id,
            'odp_port' => 1,
            'status' => 'active',
            'wilayah' => 'Gondanglegi',
            'debt' => 150000,
            'expires_at' => '2026-11-01',
        ]);

        $c2 = Customer::create([
            'customer_code' => 'FM-20261024-C002',
            'name' => 'Dewi Lestari',
            'phone' => '085799998888',
            'address' => 'Jl. Mawar No 2',
            'service_type' => 'ipoe',
            'username' => 'dewi.ip',
            'odp_id' => $odp2->id,
            'odp_port' => 2,
            'status' => 'suspended',
            'wilayah' => 'Kepanjen',
            'debt' => 0,
            'expires_at' => '2026-10-25',
        ]);

        Sanctum::actingAs($this->admin);

        // 1. Search by name
        $res = $this->getJson('/api/customers?search=Chandra');
        $res->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertEquals('FM-20261024-C001', $res->json('data.0.customer_code'));

        // 2. Search by ODP code
        $resOdp = $this->getJson('/api/customers?search=ODP-KPN');
        $resOdp->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertEquals('FM-20261024-C002', $resOdp->json('data.0.customer_code'));

        // 3. Filter status
        $resStatus = $this->getJson('/api/customers?status=suspended');
        $resStatus->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertEquals('Dewi Lestari', $resStatus->json('data.0.name'));

        // 4. Filter hutang > 0
        $resDebt = $this->getJson('/api/customers?has_debt=true');
        $resDebt->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertEquals('Chandra Wijaya', $resDebt->json('data.0.name'));

        // 5. Filter wilayah
        $resWilayah = $this->getJson('/api/customers?wilayah=Kepanjen');
        $resWilayah->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertEquals('FM-20261024-C002', $resWilayah->json('data.0.customer_code'));
    }

    public function test_customer_form_request_validations(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-VAL-01',
            'name' => 'ODP Validation Test',
            'port_capacity' => 8,
            'is_approved' => true,
        ]);

        // Existing customer on port 1
        Customer::create([
            'customer_code' => 'FM-EXISTING-01',
            'name' => 'Existing User',
            'phone' => '081234567899',
            'address' => 'Jl. Tes No. 1',
            'service_type' => 'pppoe',
            'username' => 'existing.user',
            'odp_id' => $odp->id,
            'odp_port' => 1,
            'status' => 'active',
        ]);

        Sanctum::actingAs($this->admin);

        // 1. Invalid NIK (15 digit) -> harus gagal
        $invalidNikRes = $this->postJson('/api/customers', [
            'name' => 'Testing User',
            'nik' => '123456789012345', // 15 digit
            'phone' => '081234567890',
            'address' => 'Jl. Contoh 1',
            'service_type' => 'pppoe',
            'status' => 'active',
        ]);
        $invalidNikRes->assertStatus(422)->assertJsonValidationErrors(['nik']);

        // 2. Duplicate ODP port pada ODP yang sama -> harus gagal
        $duplicatePortRes = $this->postJson('/api/customers', [
            'name' => 'Testing Port Conflict',
            'phone' => '081234567892',
            'address' => 'Jl. Contoh 2',
            'service_type' => 'pppoe',
            'odp_id' => $odp->id,
            'odp_port' => 1, // Port 1 sudah dipakai
            'status' => 'active',
        ]);
        $duplicatePortRes->assertStatus(422)->assertJsonValidationErrors(['odp_port']);

        // 3. Valid creation -> harus berhasil dan customer_code dibuat otomatis
        $validRes = $this->postJson('/api/customers', [
            'name' => 'Budi Baru',
            'nik' => '3507112233445566',
            'phone' => '081234567893',
            'address' => 'Jl. Baru No. 3',
            'service_type' => 'pppoe',
            'username' => 'budi.baru@fibermedia',
            'odp_id' => $odp->id,
            'odp_port' => 2, // Port 2 belum dipakai
            'status' => 'active',
        ]);
        $validRes->assertStatus(201);
        $this->assertNotEmpty($validRes->json('data.customer_code'));
        $this->assertEquals('Budi Baru', $validRes->json('data.name'));
    }

    public function test_customer_export_and_import_excel_35_columns(): void
    {
        $customer = Customer::create([
            'customer_code' => 'FM-EXP-001',
            'name' => 'Eko Prasetyo',
            'nik' => '3507123456789012',
            'password' => 'PassExport123',
            'phone' => '081234567800',
            'address' => 'Jl. Cempaka No. 8',
            'service_type' => 'pppoe',
            'status' => 'active',
            'monthly_price' => 200000,
            'debt' => 50000,
        ]);

        // Export tanpa izin rahasia -> NIK masked dan password disembunyikan
        $exportMasked = new CustomersExport(null, null, false);
        $mappedMasked = $exportMasked->map($customer);
        $this->assertEquals('3507••••••••9012', $mappedMasked[4]); // Kolom NIK
        $this->assertEquals('••••••••', $mappedMasked[14]); // Kolom Password

        // Export dengan izin rahasia -> NIK dan password muncul
        $exportPrivileged = new CustomersExport(null, null, true);
        $mappedPrivileged = $exportPrivileged->map($customer);
        $this->assertEquals('3507123456789012', $mappedPrivileged[4]);
        $this->assertEquals('PassExport123', $mappedPrivileged[14]);

        // Import memvalidasi per baris
        $import = new CustomersImport;
        $rows = collect([
            [
                'nama_pelanggan' => 'Pelanggan Valid Import',
                'nik' => '3507111122223333',
                'nomor_telepon' => '081299990001',
                'alamat_lengkap' => 'Jl. Import Sukses',
                'tipe_layanan' => 'pppoe',
                'status' => 'active',
            ],
            [
                'nama_pelanggan' => 'Pelanggan NIK Salah',
                'nik' => '12345', // Kurang dari 16 digit
                'nomor_telepon' => '081299990002',
                'alamat_lengkap' => 'Jl. Import Gagal',
                'status' => 'active',
            ],
        ]);

        $import->collection($rows);

        $this->assertEquals(1, $import->getImportedCount());
        $this->assertEquals(1, $import->getSkippedCount());
        $this->assertCount(1, $import->getErrors());
        $this->assertStringContainsString('NIK harus 16 digit angka', $import->getErrors()[0]);

        // Pastikan pelanggan yang valid tersimpan di database
        $this->assertDatabaseHas('customers', [
            'name' => 'Pelanggan Valid Import',
            'phone' => '081299990001',
        ]);
    }
}
