<?php

namespace Tests\Feature\Customer;

use App\Exports\CustomerTemplateExport;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\Olt;
use App\Models\Package;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerImport35Test extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->superadmin = User::factory()->create([
            'name' => 'Superadmin Master',
            'email' => 'superadmin@fibermedia.test',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->admin = User::factory()->create([
            'name' => 'Admin Ops',
            'email' => 'admin@fibermedia.test',
        ]);
        $this->admin->assignRole('Admin/CS');
    }

    public function test_customer_template_has_exact_35_headers_and_can_be_downloaded(): void
    {
        $template = new CustomerTemplateExport;
        $headings = $template->headings();

        $this->assertCount(35, $headings, 'Template CSV/Excel wajib memiliki tepat 35 kolom sesuai PRD v1.2 Bagian 11.');
        $this->assertEquals('No', $headings[0]);
        $this->assertEquals('ID User', $headings[1]);
        $this->assertEquals('ID Pelanggan', $headings[2]);
        $this->assertEquals('Tanggal Dibuat', $headings[3]);
        $this->assertEquals('Nama', $headings[4]);
        $this->assertEquals('NIK', $headings[5]);
        $this->assertEquals('Nomor Telepon', $headings[9]);
        $this->assertEquals('Tipe', $headings[10]);
        $this->assertEquals('Server', $headings[11]);
        $this->assertEquals('Paket', $headings[15]);
        $this->assertEquals('Harga', $headings[16]);
        $this->assertEquals('Status', $headings[23]);
        $this->assertEquals('Nama ODP', $headings[25]);
        $this->assertEquals('Port ODP', $headings[29]);
        $this->assertEquals('Catatan', $headings[34]);

        Sanctum::actingAs($this->admin);

        // Unduh template Excel
        $resExcel = $this->get('/api/customers/import-template');
        $resExcel->assertStatus(200);

        // Unduh template CSV
        $resCsv = $this->get('/api/customers/import-template?format=csv');
        $resCsv->assertStatus(200);

        // Unduh lewat route alias
        $resAlias = $this->get('/api/customers/import/template?format=csv');
        $resAlias->assertStatus(200);
    }

    public function test_artisan_customers_import_command_supports_dry_run_and_commit(): void
    {
        $headers = (new CustomerTemplateExport)->headings();
        $rows = [
            $headers,
            [
                '1', 'USR-101', 'FM-TEST-001', '01 May 2026', 'Budi Santoso', '3507111122223333',
                'budi@test.com', 'Jl. Mawar 1', '-7.94,112.61', '081234567890', 'PPPOE', 'Server X86',
                'Kolektor 1', 'budi.santoso@fm', 'Secret123', '50 Mbps Home', 'Rp. 155.000', '', '',
                'none', '50M/50M', '1 Bulan', '01 Jun 2026', 'Active', '1/1/1:1', 'ODP-TEST-01',
                'Jl. Mawar Tiang 1', '-7.94,112.61', 'Ket 1', '1', '0', 'Malang', 'Tim A', 'Sales A', 'Migrasi',
            ],
            [
                '2', 'USR-102', 'FM-TEST-002', '02 May 2026', 'Siti Salah', '12345',
                'siti@test.com', 'Jl. Melati 2', '-7.95,112.62', '085678901234', 'PPPOE', 'Server X86',
                'Kolektor 1', 'siti.salah@fm', 'Secret456', '50 Mbps Home', 'Rp. 155.000', '', '',
                'none', '50M/50M', '1 Bulan', '02 Jun 2026', 'Active', '1/1/1:2', 'ODP-TEST-01',
                'Jl. Mawar Tiang 1', '-7.94,112.61', 'Ket 1', '2', '0', 'Malang', 'Tim A', 'Sales A', 'Migrasi',
            ],
            [
                '3', 'USR-103', 'FM-TEST-003', '03 May 2026', 'Hendra Sukses', '',
                'hendra@test.com', 'Jl. Kenanga 3', '-7.96,112.63', '081398765432', 'PPPOE', 'Server X86',
                'Kolektor 1', 'hendra.sukses@fm', 'Secret789', '30 Mbps Home', 'Rp. 135.000', '', '',
                'none', '30M/30M', '1 Bulan', '03 Jun 2026', 'Active', '', 'ODP-TEST-02',
                'Jl. Kenanga Tiang 3', '-7.96,112.63', 'Ket 2', '1', '0', 'Malang', '', '', 'Migrasi',
            ],
        ];

        $tempFile = tempnam(sys_get_temp_dir(), 'csv_import_').'.csv';
        $fp = fopen($tempFile, 'w');
        foreach ($rows as $r) {
            fputcsv($fp, $r);
        }
        fclose($fp);

        // 1. Jalankan mode --dry-run
        $exitDry = Artisan::call('customers:import', [
            'file' => $tempFile,
            '--dry-run' => true,
        ]);
        $this->assertEquals(0, $exitDry);
        $outputDry = Artisan::output();
        $this->assertStringContainsString('DRY-RUN', $outputDry);
        $this->assertStringContainsString('Pelanggan Baru', $outputDry);
        $this->assertStringContainsString('NIK harus 16 digit angka', $outputDry);

        // Pastikan tidak ada data yang masuk ke database saat dry-run
        $this->assertEquals(0, Customer::count());

        // 2. Jalankan impor sebenarnya
        $exitCommit = Artisan::call('customers:import', [
            'file' => $tempFile,
        ]);
        $this->assertEquals(0, $exitCommit);
        $outputCommit = Artisan::output();
        $this->assertStringContainsString('Sukses! 2 pelanggan baru ditambahkan', $outputCommit);

        // Pastikan 2 pelanggan valid berhasil tersimpan dan langsung berstatus active
        $this->assertEquals(2, Customer::count());
        $c1 = Customer::where('customer_code', 'FM-TEST-001')->first();
        $this->assertNotNull($c1);
        $this->assertEquals('Budi Santoso', $c1->name);
        $this->assertEquals('active', $c1->status);
        $this->assertEquals(155000, (float) $c1->monthly_price);
        $this->assertEquals('import', $c1->location_source);

        // Master ODP otomatis dibuat
        $odp1 = Odp::where('code', 'ODP-TEST-01')->first();
        $this->assertNotNull($odp1);
        $this->assertEquals($odp1->id, $c1->odp_id);
        $this->assertEquals(1, $c1->odp_port);

        @unlink($tempFile);
    }

    public function test_csv_import_detects_and_rejects_odp_port_conflicts(): void
    {
        // Buat ODP dan pelanggan aktif yang sudah menempati port 1
        $odp = Odp::create([
            'code' => 'ODP-PORT-01',
            'name' => 'ODP Port Conflict Test',
            'port_capacity' => 8,
            'is_active' => true,
        ]);

        Customer::create([
            'customer_code' => 'FM-EXISTING-PORT1',
            'name' => 'Pelanggan Eksisting Port 1',
            'phone' => '081234567000',
            'address' => 'Jl. Eksisting',
            'service_type' => 'pppoe',
            'odp_id' => $odp->id,
            'odp_port' => 1,
            'status' => 'active',
        ]);

        $headers = (new CustomerTemplateExport)->headings();
        $rows = [
            $headers,
            [
                '1', 'USR-201', 'FM-CONFLICT', '01 May 2026', 'Pelanggan Bentrok', '',
                'b@test.com', 'Alamat', '-7.9,112.6', '081299990001', 'PPPOE', 'Server X',
                '', 'user.b@fm', 'pass123', '50 Mbps', '150000', '', '',
                'none', '50M', '1 Bulan', '01 Jun 2026', 'Active', '', 'ODP-PORT-01',
                '', '', '', '1', '0', 'Malang', '', '', 'Catatan',
            ],
            [
                '2', 'USR-202', 'FM-SUCCESS', '01 May 2026', 'Pelanggan Sukses Port 2', '',
                'c@test.com', 'Alamat', '-7.9,112.6', '081299990002', 'PPPOE', 'Server X',
                '', 'user.c@fm', 'pass123', '50 Mbps', '150000', '', '',
                'none', '50M', '1 Bulan', '01 Jun 2026', 'Active', '', 'ODP-PORT-01',
                '', '', '', '2', '0', 'Malang', '', '', 'Catatan',
            ],
        ];

        $tempFile = tempnam(sys_get_temp_dir(), 'csv_port_').'.csv';
        $fp = fopen($tempFile, 'w');
        foreach ($rows as $r) {
            fputcsv($fp, $r);
        }
        fclose($fp);

        $exitCode = Artisan::call('customers:import', ['file' => $tempFile]);
        $this->assertEquals(0, $exitCode);
        $output = Artisan::output();

        $this->assertStringContainsString('Port 1 pada ODP ODP-PORT-01 sudah digunakan pelanggan aktif lain', $output);
        $this->assertStringContainsString('Bentrok Port ODP Terdeteksi', $output);

        // Pelanggan bentrok tidak disimpan
        $this->assertDatabaseMissing('customers', ['customer_code' => 'FM-CONFLICT']);
        // Pelanggan port 2 tersimpan
        $this->assertDatabaseHas('customers', ['customer_code' => 'FM-SUCCESS', 'odp_port' => 2]);

        @unlink($tempFile);
    }

    public function test_web_api_customer_import_supports_dry_run_and_commit(): void
    {
        Sanctum::actingAs($this->admin);

        $csvContent = implode(',', (new CustomerTemplateExport)->headings())."\n".
            '1,USR-WEB-01,FM-WEB-001,01 May 2026,Pelanggan Web API,,web@test.com,Alamat,-7.9,112.6,081234567811,PPPOE,Server X,,web.user,pass,50 Mbps,150000,,,none,50M,1 Bulan,01 Jun 2026,Active,,ODP-WEB-01,,,,1,0,Malang,,,Catatan'."\n";

        $file = UploadedFile::fake()->createWithContent('import-test.csv', $csvContent);

        // 1. Dry-run lewat API
        $resDry = $this->postJson('/api/customers/import', [
            'file' => $file,
            'dry_run' => true,
        ]);

        $resDry->assertStatus(200);
        $this->assertTrue($resDry->json('data.dry_run'));
        $this->assertEquals(1, $resDry->json('data.imported'));
        $this->assertEquals(0, Customer::count());

        // 2. Commit lewat API
        $resCommit = $this->postJson('/api/customers/import', [
            'file' => $file,
            'dry_run' => false,
        ]);

        $resCommit->assertStatus(200);
        $this->assertFalse($resCommit->json('data.dry_run'));
        $this->assertEquals(1, $resCommit->json('data.imported'));
        $this->assertDatabaseHas('customers', ['customer_code' => 'FM-WEB-001', 'name' => 'Pelanggan Web API']);
    }

    public function test_master_data_packages_olts_odps_crud(): void
    {
        Sanctum::actingAs($this->superadmin);

        // 1. Package CRUD
        $pkgRes = $this->postJson('/api/packages', [
            'name' => 'Super Fiber 100 Mbps',
            'speed_mbps' => 100,
            'price' => 350000,
            'category' => 'Home Ultra',
            'description' => 'Paket internet super cepat tanpa FUP',
            'is_active' => true,
        ]);
        $pkgRes->assertStatus(201);
        $pkgId = $pkgRes->json('data.id');

        $pkgList = $this->getJson('/api/packages?all=true');
        $pkgList->assertStatus(200);

        $pkgUpdate = $this->putJson("/api/packages/{$pkgId}", [
            'price' => 375000,
        ]);
        $pkgUpdate->assertStatus(200);
        $this->assertEquals(375000, (float) Package::find($pkgId)->price);

        // 2. OLT CRUD
        $oltRes = $this->postJson('/api/network/olts', [
            'code' => 'OLT-MLG-01',
            'name' => 'OLT Malang Kota Center',
            'ip_address' => '10.100.1.1',
            'address' => 'Sentral Telepon Otomat Malang',
            'latitude' => -7.9789,
            'longitude' => 112.6312,
            'status' => 'normal',
            'is_active' => true,
        ]);
        $oltRes->assertStatus(201);
        $oltId = $oltRes->json('data.id');

        $oltList = $this->getJson('/api/network/olts');
        $oltList->assertStatus(200);

        // 3. ODP CRUD
        $odpRes = $this->postJson('/api/network/odps', [
            'code' => 'ODP-DNY-08',
            'name' => 'ODP Dinoyo Tiang 08',
            'address' => 'Jl. MT Haryono No. 12',
            'latitude' => -7.9455,
            'longitude' => 112.6144,
            'port_capacity' => 16,
            'status' => 'normal',
            'is_active' => true,
        ]);
        $odpRes->assertStatus(201);
        $odpId = $odpRes->json('data.id');

        $odpList = $this->getJson('/api/network/odps');
        $odpList->assertStatus(200);
    }

    public function test_csv_import_handles_packages_with_similar_long_names_without_duplicate_code_conflict(): void
    {
        Sanctum::actingAs($this->admin);

        $headers = (new CustomerTemplateExport)->headings();
        $rows = [
            $headers,
            [
                '1', 'USR-PKG-1', 'FM-PKG-001', '01 Nov 2026', 'Pelanggan Paket A', '',
                'pkga@test.com', 'Jl. Test 1', '-7.9,112.6', '081234567901', 'PPPOE', 'Server X',
                '', 'pkga@fm', 'pass123', 'Paket-Big-Diamond-XGB-100-Mbps-155', '155000', '', '',
                'none', '100M', '1 Bulan', '01 Dec 2026', 'Active', '', 'ODP-PKG-01',
                '', '', '', '1', '0', 'Malang', '', '', 'Catatan',
            ],
            [
                '2', 'USR-PKG-2', 'FM-PKG-002', '01 Nov 2026', 'Pelanggan Paket B', '',
                'pkgb@test.com', 'Jl. Test 2', '-7.9,112.6', '081234567902', 'PPPOE', 'Server X',
                '', 'pkgb@fm', 'pass123', 'Paket-Big-Diamond-XGB-200-Mbps-155', '155000', '', '',
                'none', '200M', '1 Bulan', '01 Dec 2026', 'Active', '', 'ODP-PKG-01',
                '', '', '', '2', '0', 'Malang', '', '', 'Catatan',
            ],
            [
                '3', 'USR-PKG-3', 'FM-PKG-003', '01 Nov 2026', 'Pelanggan Paket C', '',
                'pkgc@test.com', 'Jl. Test 3', '-7.9,112.6', '081234567903', 'PPPOE', 'Server X',
                '', 'pkgc@fm', 'pass123', 'Paket-Big-Diamond-XGB-200-Mbps-155', '155000', '', '',
                'none', '200M', '1 Bulan', '01 Dec 2026', 'Active', '', 'ODP-PKG-01',
                '', '', '', '3', '0', 'Malang', '', '', 'Catatan',
            ],
        ];

        $tempFile = tempnam(sys_get_temp_dir(), 'csv_pkg_').'.csv';
        $fp = fopen($tempFile, 'w');
        foreach ($rows as $r) {
            fputcsv($fp, $r);
        }
        fclose($fp);

        $exitCode = Artisan::call('customers:import', ['file' => $tempFile]);
        $this->assertEquals(0, $exitCode);

        // Verify both customers and packages exist without duplicate key error
        $this->assertEquals(3, Customer::whereIn('customer_code', ['FM-PKG-001', 'FM-PKG-002', 'FM-PKG-003'])->count());

        $pkg100 = Package::where('name', 'Paket-Big-Diamond-XGB-100-Mbps-155')->first();
        $pkg200 = Package::where('name', 'Paket-Big-Diamond-XGB-200-Mbps-155')->first();

        $this->assertNotNull($pkg100);
        $this->assertNotNull($pkg200);
        $this->assertNotEquals($pkg100->code, $pkg200->code);

        @unlink($tempFile);
    }
}
