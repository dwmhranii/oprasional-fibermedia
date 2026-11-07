<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\NetworkCable;
use App\Models\NetworkStatusLog;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use App\Models\User;
use App\Modules\Network\Services\KmzExporterService;
use App\Modules\Network\Services\KmzImporterService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class NetworkFase1bTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $admin;
    protected string $kmzPath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->superadmin = User::factory()->create(['status' => 'active']);
        $this->superadmin->assignRole('Superadmin');

        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->assignRole('Admin');

        $this->kmzPath = storage_path('app/imports/Mapping_All_Point_-_FTTH_Area_Bululawang.kmz');
    }

    /**
     * 1. Uji dry-run tidak mengubah database sama sekali.
     */
    public function test_dry_run_does_not_modify_database(): void
    {
        if (! file_exists($this->kmzPath)) {
            $this->markTestSkipped('Berkas KMZ contoh belum tersedia.');
        }

        $exitCode = Artisan::call('network:import-kmz', [
            'file' => $this->kmzPath,
            '--dry-run' => true,
        ]);

        $this->assertEquals(0, $exitCode);
        $this->assertEquals(0, Olt::count());
        $this->assertEquals(0, Odc::count());
        $this->assertEquals(0, Odp::count());
        $this->assertEquals(0, NetworkCable::count());
        $this->assertEquals(0, NetworkStatusLog::count());
    }

    /**
     * 2. Uji impor berkas contoh menghasilkan data lengkap:
     * 1 OLT, 18 ODC (10 gangguan), 134 ODP, 157 kabel (10 putus), dan 30 koordinat salah.
     */
    public function test_kmz_import_creates_exact_counts_and_handles_statuses(): void
    {
        if (! file_exists($this->kmzPath)) {
            $this->markTestSkipped('Berkas KMZ contoh belum tersedia.');
        }

        $importer = new KmzImporterService();
        $res = $importer->import($this->kmzPath, false, $this->superadmin->id);

        $this->assertTrue($res['success']);
        $summary = $res['summary'];

        // Cek jumlah entitas yang dibuat
        $this->assertEquals(1, $summary['olts']['created']);
        $this->assertEquals(18, $summary['odcs']['created']);
        $this->assertEquals(134, $summary['odps']['created']);
        $this->assertEquals(157, $summary['cables']['created']);

        // Cek status khusus
        $this->assertEquals(10, $summary['odcs']['disrupted']);
        $this->assertEquals(10, $summary['cables']['cut']);

        // Cek 30 koordinat salah
        $this->assertEquals(30, $res['invalid_coordinates_count']);
        $this->assertEquals(30, $summary['total_rejected']);

        // Verifikasi langsung di database
        $this->assertEquals(1, Olt::count());
        $this->assertEquals(18, Odc::count());
        $this->assertEquals(10, Odc::where('status', 'disrupted')->count());
        $this->assertEquals(134, Odp::count());
        $this->assertEquals(157, NetworkCable::count());
        $this->assertEquals(10, NetworkCable::where('status', 'cut')->count());

        // Verifikasi log status awal sumber KMZ
        $this->assertEquals(20, NetworkStatusLog::where('source', 'kmz')->count());
        $this->assertEquals(10, NetworkStatusLog::where('node_type', 'odc')->where('to_status', 'disrupted')->count());
        $this->assertEquals(10, NetworkStatusLog::where('node_type', 'cable')->where('to_status', 'cut')->count());
    }

    /**
     * 3. Uji menjalankan ulang tidak membuat data ganda (idempoten).
     */
    public function test_kmz_import_idempotence(): void
    {
        if (! file_exists($this->kmzPath)) {
            $this->markTestSkipped('Berkas KMZ contoh belum tersedia.');
        }

        $importer = new KmzImporterService();
        
        // Impor pertama
        $importer->import($this->kmzPath, false);
        $countOlt1 = Olt::count();
        $countOdc1 = Odc::count();
        $countOdp1 = Odp::count();
        $countCable1 = NetworkCable::count();

        // Impor kedua
        $res2 = $importer->import($this->kmzPath, false);

        $this->assertEquals(0, $res2['summary']['total_created']);
        $this->assertEquals($countOlt1, Olt::count());
        $this->assertEquals($countOdc1, Odc::count());
        $this->assertEquals($countOdp1, Odp::count());
        $this->assertEquals($countCable1, NetworkCable::count());
    }

    /**
     * 4. Uji penolakan kode unik ganda (code kembar ditolak).
     */
    public function test_duplicate_node_codes_are_rejected(): void
    {
        Odc::create([
            'code' => 'ODC-TEST-01',
            'name' => 'ODC Test Satu',
            'capacity_odp' => 12,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Odc::create([
            'code' => 'ODC-TEST-01',
            'name' => 'ODC Test Duplikat',
            'capacity_odp' => 24,
        ]);
    }

    /**
     * 4b. Uji port ODP ganda ditolak oleh indeks unik.
     */
    public function test_duplicate_odp_port_assignment_is_rejected(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-PORT-TEST',
            'name' => 'ODP Port Test',
            'port_capacity' => 8,
        ]);

        Customer::create([
            'customer_code' => 'CUST-001',
            'name' => 'Pelanggan Satu',
            'address' => 'Jl. Sidomulyo No. 1',
            'phone' => '081234567891',
            'username' => 'user1@fibermedia',
            'odp_id' => $odp->id,
            'odp_port' => 1,
            'status' => 'active',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Customer::create([
            'customer_code' => 'CUST-002',
            'name' => 'Pelanggan Dua',
            'address' => 'Jl. Sidomulyo No. 2',
            'phone' => '081234567892',
            'username' => 'user2@fibermedia',
            'odp_id' => $odp->id,
            'odp_port' => 1, // Port 1 sama untuk ODP yang sama -> DITOLAK
            'status' => 'active',
        ]);
    }

    /**
     * 5. Uji panjang rute kabel (length_m sama dengan jumlah jarak antar titik jalur).
     */
    public function test_cable_length_calculation_matches_accumulated_route_distance(): void
    {
        // Rute 3 titik:
        // Titik 1: Lon 112.637789, Lat -8.081413
        // Titik 2: Lon 112.637225, Lat -8.086335 (~550 meter)
        // Titik 3: Lon 112.643738, Lat -8.051710 (~3800 meter)
        $route = [
            [112.637789, -8.081413],
            [112.637225, -8.086335],
            [112.643738, -8.051710],
        ];

        $calculatedDist = KmzImporterService::calculateRouteDistance($route);
        $this->assertGreaterThan(4000, $calculatedDist);

        $cable = NetworkCable::create([
            'code' => 'CBL-TEST-DIST',
            'name' => 'Kabel Test Jarak',
            'from_type' => 'olt',
            'to_type' => 'odc',
            'kind' => 'olt_odc',
            'route' => $route,
            'length_m' => $calculatedDist,
            'route_drawn' => true,
        ]);

        $this->assertEquals($calculatedDist, $cable->length_m);

        // Uji update rute via API PUT /api/network/cables/{id}/route
        $newRoute = [
            [112.637789, -8.081413],
            [112.637225, -8.086335],
        ];
        $expectedNewDist = KmzImporterService::calculateRouteDistance($newRoute);

        $response = $this->actingAs($this->superadmin)->putJson("/api/network/cables/{$cable->id}/route", [
            'route' => $newRoute,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.length_m', $expectedNewDist)
            ->assertJsonPath('data.route_drawn', true);
    }

    /**
     * 6. Uji GET /api/network/map mematuhi parameter bbox dan ETag.
     */
    public function test_get_map_obeys_bbox_and_returns_geojson(): void
    {
        Olt::create([
            'code' => 'OLT-IN',
            'name' => 'OLT Dalam Box',
            'latitude' => -8.0814,
            'longitude' => 112.6377,
        ]);

        Olt::create([
            'code' => 'OLT-OUT',
            'name' => 'OLT Luar Box',
            'latitude' => -7.5000,
            'longitude' => 113.5000,
        ]);

        // Bounding box mencakup Bululawang saja (lat -8.15 s.d. -8.00, lon 112.55 s.d. 112.75)
        $bbox = '112.55,-8.15,112.75,-8.00';

        $response = $this->actingAs($this->superadmin)->getJson("/api/network/map?bbox={$bbox}&types=olt");

        $response->assertStatus(200)
            ->assertHeader('ETag')
            ->assertJsonPath('type', 'FeatureCollection');

        $features = $response->json('features');
        $this->assertCount(1, $features);
        $this->assertEquals('OLT-IN', $features[0]['properties']['code']);
    }

    /**
     * 7. Uji ekspor lalu impor ulang menghasilkan data yang sama.
     */
    public function test_kmz_export_and_reimport_roundtrip(): void
    {
        $olt = Olt::create([
            'code' => 'OLT-ROUNDTRIP',
            'name' => 'OLT Roundtrip Test',
            'latitude' => -8.081413,
            'longitude' => 112.637789,
            'status' => 'normal',
        ]);

        $odc = Odc::create([
            'code' => 'ODC-ROUNDTRIP',
            'name' => 'ODC Roundtrip Test',
            'latitude' => -8.086335,
            'longitude' => 112.637225,
            'capacity_odp' => 12,
            'status' => 'disrupted',
        ]);

        $odp = Odp::create([
            'code' => 'ODP-ROUNDTRIP',
            'name' => 'ODP Roundtrip Test',
            'latitude' => -8.086323,
            'longitude' => 112.637217,
            'port_capacity' => 8,
            'status' => 'normal',
        ]);

        $exporter = new KmzExporterService();
        $exportedKmzPath = $exporter->export();

        $this->assertFileExists($exportedKmzPath);

        // Bersihkan data
        $olt->forceDelete();
        $odc->forceDelete();
        $odp->forceDelete();

        $this->assertEquals(0, Olt::count());
        $this->assertEquals(0, Odc::count());
        $this->assertEquals(0, Odp::count());

        // Impor kembali dari berkas hasil ekspor
        $importer = new KmzImporterService();
        $res = $importer->import($exportedKmzPath, false);

        $this->assertTrue($res['success']);
        $this->assertEquals(1, Olt::count());
        $this->assertEquals(1, Odc::count());
        $this->assertEquals(1, Odp::count());

        $this->assertEquals('OLT-ROUNDTRIP', Olt::first()->code);
        $this->assertEquals('ODC-ROUNDTRIP', Odc::first()->code);
        $this->assertEquals('disrupted', Odc::first()->status);
        $this->assertEquals('ODP-ROUNDTRIP', Odp::first()->code);
    }
}
