<?php

namespace Tests\Feature\Network;

use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\DispatchSetting;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MassOutageTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Team $readyTeam;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        // Ensure Dispatch Settings exist
        DispatchSetting::firstOrCreate(
            ['key' => 'default'],
            [
                'min_members_present' => 1,
                'accept_timeout_minutes' => 15,
                'max_reassignments' => 3,
            ]
        );

        // Setup Admin user
        $this->admin = User::factory()->create(['name' => 'Admin Network']);
        $this->admin->assignRole('Admin');
        Sanctum::actingAs($this->admin);

        // Setup a ready team for complaint dispatch
        $this->readyTeam = Team::create(['name' => 'Tim Reaksi Cepat', 'is_active' => true, 'order_index' => 1]);
        $tech = User::factory()->create(['name' => 'Teknisi Jaringan']);
        $tech->assignRole('Teknisi');
        TeamMember::create(['team_id' => $this->readyTeam->id, 'user_id' => $tech->id, 'is_active' => true]);

        DailyAttendance::create([
            'user_id' => $tech->id,
            'work_date' => now()->toDateString(),
            'check_in_at' => now()->subHours(1),
            'status' => 'hadir',
            'geofence_status' => 'inside',
        ]);
    }

    public function test_odp_affected_customers_preview_returns_correct_customers_via_odp_id(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-BLW-01',
            'name' => 'ODP Bululawang 01',
            'latitude' => -8.081234,
            'longitude' => 112.631234,
            'port_capacity' => 8,
            'wilayah' => 'Bululawang',
        ]);

        $otherOdp = Odp::create([
            'code' => 'ODP-BLW-02',
            'name' => 'ODP Bululawang 02',
            'port_capacity' => 8,
        ]);

        // 3 Pelanggan aktif di ODP-BLW-01
        $c1 = Customer::create([
            'customer_code' => 'CUST-001',
            'name' => 'Pelanggan Satu',
            'phone' => '081200000001',
            'address' => 'Jl. Mawar No 1',
            'odp_id' => $odp->id,
            'odp_port' => 1,
            'package' => '20 Mbps',
            'status' => 'active',
        ]);

        $c2 = Customer::create([
            'customer_code' => 'CUST-002',
            'name' => 'Pelanggan Dua',
            'phone' => '081200000002',
            'address' => 'Jl. Mawar No 2',
            'odp_id' => $odp->id,
            'odp_port' => 2,
            'package' => '30 Mbps',
            'status' => 'active',
        ]);

        $c3 = Customer::create([
            'customer_code' => 'CUST-003',
            'name' => 'Pelanggan Tiga',
            'phone' => '081200000003',
            'address' => 'Jl. Mawar No 3',
            'odp_id' => $odp->id,
            'odp_port' => 3,
            'package' => '50 Mbps',
            'status' => 'active',
        ]);

        // 1 Pelanggan terminated (tidak ikut terdampak)
        Customer::create([
            'customer_code' => 'CUST-004',
            'name' => 'Pelanggan Terminated',
            'phone' => '081200000004',
            'address' => 'Jl. Mawar No 4',
            'odp_id' => $odp->id,
            'odp_port' => 4,
            'package' => '20 Mbps',
            'status' => 'terminated',
        ]);

        // 1 Pelanggan di ODP lain (tidak ikut terdampak)
        Customer::create([
            'customer_code' => 'CUST-005',
            'name' => 'Pelanggan ODP Lain',
            'phone' => '081200000005',
            'address' => 'Jl. Melati No 5',
            'odp_id' => $otherOdp->id,
            'odp_port' => 1,
            'package' => '20 Mbps',
            'status' => 'active',
        ]);

        $response = $this->getJson("/api/admin/network/mass-outage/affected-customers?element_type=odp&element_id={$odp->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_affected', 3);

        $customerIds = collect($response->json('data.customers'))->pluck('id')->toArray();
        $this->assertEquals([$c1->id, $c2->id, $c3->id], $customerIds);
    }

    public function test_odc_affected_customers_preview_returns_all_customers_under_child_odps(): void
    {
        $odc = Odc::create([
            'code' => 'ODC-KPN-01',
            'name' => 'ODC Kepanjen Pusat',
            'latitude' => -8.123456,
            'longitude' => 112.567890,
            'capacity_odp' => 24,
            'wilayah' => 'Kepanjen',
        ]);

        $odpA = Odp::create([
            'odc_id' => $odc->id,
            'code' => 'ODP-KPN-A1',
            'name' => 'ODP Kepanjen A1',
            'port_capacity' => 8,
        ]);

        $odpB = Odp::create([
            'odc_id' => $odc->id,
            'code' => 'ODP-KPN-B1',
            'name' => 'ODP Kepanjen B1',
            'port_capacity' => 8,
        ]);

        $cA1 = Customer::create([
            'customer_code' => 'CUST-KPN-01',
            'name' => 'Pelanggan ODC 1',
            'phone' => '081311111111',
            'address' => 'Jl. Kepanjen 1',
            'odp_id' => $odpA->id,
            'status' => 'active',
            'package' => '30 Mbps',
        ]);

        $cB1 = Customer::create([
            'customer_code' => 'CUST-KPN-02',
            'name' => 'Pelanggan ODC 2',
            'phone' => '081322222222',
            'address' => 'Jl. Kepanjen 2',
            'odp_id' => $odpB->id,
            'status' => 'active',
            'package' => '50 Mbps',
        ]);

        $response = $this->getJson("/api/admin/network/mass-outage/affected-customers?element_type=odc&element_id={$odc->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_affected', 2);

        $customerIds = collect($response->json('data.customers'))->pluck('id')->toArray();
        $this->assertContains($cA1->id, $customerIds);
        $this->assertContains($cB1->id, $customerIds);
    }

    public function test_triggering_mass_outage_on_odp_creates_single_ticket_and_links_all_customers(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-TRG-01',
            'name' => 'ODP Trigger Test',
            'address' => 'Jl. Raya Simpang No 10',
            'latitude' => -8.090000,
            'longitude' => 112.600000,
            'wilayah' => 'Sukun',
            'port_capacity' => 8,
        ]);

        $cust1 = Customer::create([
            'customer_code' => 'CUST-T1',
            'name' => 'Bpk. Herman',
            'phone' => '081234000001',
            'address' => 'Jl. Simpang 1',
            'odp_id' => $odp->id,
            'status' => 'active',
            'package' => '20 Mbps',
        ]);

        $cust2 = Customer::create([
            'customer_code' => 'CUST-T2',
            'name' => 'Ibu Maria',
            'phone' => '081234000002',
            'address' => 'Jl. Simpang 2',
            'odp_id' => $odp->id,
            'status' => 'active',
            'package' => '50 Mbps',
        ]);

        // Kirim pemicu gangguan massal status = disrupted
        $res = $this->postJson('/api/admin/network/mass-outage/trigger', [
            'element_type' => 'odp',
            'element_id' => $odp->id,
            'status' => 'disrupted',
            'notes' => 'Port splitter ODP pecah tertimpa dahan pohon',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.affected_count', 2);

        // 1. Verifikasi status operasional ODP berubah menjadi disrupted
        $odp->refresh();
        $this->assertEquals('disrupted', $odp->operational_status);

        // 2. Verifikasi HANYA SATU tiket (Complaint) yang dibuat di basis data
        $complaintId = $res->json('data.complaint.id');
        $this->assertNotNull($complaintId);

        $complaintsCount = Complaint::where('is_mass_outage', true)
            ->where('affected_element_type', 'odp')
            ->where('affected_element_id', $odp->id)
            ->count();
        $this->assertEquals(1, $complaintsCount);

        // 3. Verifikasi tiket gangguan massal
        $complaint = Complaint::find($complaintId);
        $this->assertTrue($complaint->is_mass_outage);
        $this->assertEquals('critical', $complaint->priority->value ?? (string) $complaint->priority);
        $this->assertEquals('mass_outage', $complaint->category->value ?? (string) $complaint->category);
        $this->assertStringContainsString('Gangguan Massal', $complaint->subject);
        $this->assertStringContainsString('disrupted', $complaint->subject);

        // 4. Verifikasi seluruh pelanggan tertaut ke tiket tersebut via relasi affectedCustomers
        $linkedCustomerIds = $complaint->affectedCustomers()->pluck('customers.id')->toArray();
        $this->assertCount(2, $linkedCustomerIds);
        $this->assertContains($cust1->id, $linkedCustomerIds);
        $this->assertContains($cust2->id, $linkedCustomerIds);

        // Inverse relation dari sisi Customer
        $this->assertCount(1, $cust1->massOutageComplaints);
        $this->assertEquals($complaint->id, $cust1->massOutageComplaints->first()->id);
        $this->assertEquals($complaint->id, $cust2->massOutageComplaints->first()->id);

        // 5. Tiket langsung dialokasikan ke tim yang siap (Dispatch)
        $this->assertEquals($this->readyTeam->id, $complaint->assigned_team_id);
        $this->assertEquals('assigned', $complaint->status->value ?? (string) $complaint->status);

        // 6. Verifikasi TicketEvent mencatat pemicuan gangguan massal
        $this->assertDatabaseHas('ticket_events', [
            'eventable_type' => Complaint::class,
            'eventable_id' => $complaint->id,
            'event' => 'mass_outage_created',
        ]);
    }

    public function test_triggering_mass_outage_on_cable_with_cut_status(): void
    {
        $odp1 = Odp::create([
            'code' => 'ODP-CBL-01',
            'name' => 'ODP Cable 01',
            'port_capacity' => 8,
        ]);

        $odp2 = Odp::create([
            'code' => 'ODP-CBL-02',
            'name' => 'ODP Cable 02',
            'port_capacity' => 8,
        ]);

        $cable = CableTrack::create([
            'client_uuid' => 'uuid_cbl_test_99',
            'name' => 'Kabel Feeder Sukun - Gadang',
            'coordinates' => [[112.60, -8.09], [112.61, -8.10]],
            'downstream_odp_ids' => [$odp1->id, $odp2->id],
            'total_length_meters' => 1250,
        ]);

        $cust = Customer::create([
            'customer_code' => 'CUST-CBL-01',
            'name' => 'Pelanggan Kabel Putus',
            'phone' => '081999999999',
            'address' => 'Jl. Gadang No 5',
            'odp_id' => $odp1->id,
            'status' => 'active',
            'package' => '100 Mbps',
        ]);

        // Pemicu gangguan massal kabel putus (status = cut)
        $res = $this->postJson('/api/admin/network/mass-outage/trigger', [
            'element_type' => 'cable_track',
            'element_id' => $cable->id,
            'status' => 'cut',
            'notes' => 'Kabel FO 24 core terputus akibat tersangkut truk kontainer',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true);

        $cable->refresh();
        $this->assertEquals('cut', $cable->operational_status);

        $complaintId = $res->json('data.complaint.id');
        $complaint = Complaint::find($complaintId);
        $this->assertNotNull($complaint);
        $this->assertTrue($complaint->is_mass_outage);
        $this->assertEquals('cable_track', $complaint->affected_element_type);
        $this->assertEquals($cable->id, $complaint->affected_element_id);

        $this->assertTrue($complaint->affectedCustomers()->where('customers.id', $cust->id)->exists());
    }

    public function test_resolving_mass_outage_restores_element_status_and_resolves_complaints(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-RES-01',
            'name' => 'ODP Resolve Test',
            'operational_status' => 'disrupted',
            'port_capacity' => 8,
        ]);

        $cust = Customer::create([
            'customer_code' => 'CUST-RES-01',
            'name' => 'Pelanggan Pulih',
            'phone' => '081888888888',
            'address' => 'Jl. Pemulihan No 1',
            'odp_id' => $odp->id,
            'status' => 'active',
            'package' => '30 Mbps',
        ]);

        $complaint = Complaint::create([
            'ticket_number' => 'CMP-MASS-RES',
            'customer_id' => $cust->id,
            'customer_name' => $cust->name,
            'customer_phone' => $cust->phone,
            'customer_address' => $cust->address,
            'area' => 'Wilayah Sukun',
            'category' => 'mass_outage',
            'subject' => 'Gangguan Massal ODP-RES-01',
            'description' => 'Gangguan massal pada ODP',
            'created_by_id' => $this->admin->id,
            'is_mass_outage' => true,
            'affected_element_type' => 'odp',
            'affected_element_id' => $odp->id,
            'status' => 'assigned',
            'priority' => 'critical',
        ]);

        // Pulihkan jaringan
        $res = $this->postJson('/api/admin/network/mass-outage/resolve', [
            'element_type' => 'odp',
            'element_id' => $odp->id,
            'resolution_notes' => 'Splicing ulang kabel ODP selesai dan redaman normal -18.5 dBm',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        // Status ODP kembali normal
        $odp->refresh();
        $this->assertEquals('normal', $odp->operational_status);

        // Tiket terselesaikan
        $complaint->refresh();
        $this->assertEquals('resolved', $complaint->status->value ?? (string) $complaint->status);
        $this->assertNotNull($complaint->resolved_at);

        // Riwayat tercatat di ticket_events
        $this->assertDatabaseHas('ticket_events', [
            'eventable_type' => Complaint::class,
            'eventable_id' => $complaint->id,
            'event' => 'mass_outage_resolved',
        ]);
    }
}
