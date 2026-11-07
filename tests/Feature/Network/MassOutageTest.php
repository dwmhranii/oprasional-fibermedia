<?php

namespace Tests\Feature\Network;

use App\Models\CableTrack;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\DispatchSetting;
use App\Models\Incident;
use App\Models\IncidentCustomer;
use App\Models\NetworkCable;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Modules\Network\Services\AffectedCustomersResolver;
use App\Modules\Network\Services\IncidentService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MassOutageTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;

    protected User $adminUser;

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
                'incident_auto_create' => false,
            ]
        );

        // Setup Superadmin user
        $this->superadmin = User::factory()->create(['name' => 'Superadmin Network']);
        $this->superadmin->assignRole('Superadmin');
        Sanctum::actingAs($this->superadmin);

        // Setup regular Admin user
        $this->adminUser = User::factory()->create(['name' => 'Staff CS Admin']);
        $this->adminUser->assignRole('Admin');

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
            'status' => 'isolated',
        ]);

        // Pelanggan terminated di ODP yang sama (tidak boleh masuk hitungan)
        Customer::create([
            'customer_code' => 'CUST-004-TERM',
            'name' => 'Pelanggan Berhenti',
            'phone' => '081200000004',
            'address' => 'Jl. Mawar No 4',
            'odp_id' => $odp->id,
            'status' => 'terminated',
        ]);

        // 1 Pelanggan di ODP lain (tidak terdampak)
        Customer::create([
            'customer_code' => 'CUST-999',
            'name' => 'Pelanggan ODP Lain',
            'phone' => '081299999999',
            'address' => 'Jl. Melati No 99',
            'odp_id' => $otherOdp->id,
            'status' => 'active',
        ]);

        $response = $this->getJson("/api/network/mass-outage/affected-customers?element_type=odp&element_id={$odp->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_affected', 3)
            ->assertJsonPath('data.isolated_count', 1);

        $customerIds = collect($response->json('data.customers'))->pluck('id')->toArray();
        $this->assertContains($c1->id, $customerIds);
        $this->assertContains($c2->id, $customerIds);
        $this->assertContains($c3->id, $customerIds);
    }

    public function test_odc_affected_customers_preview_returns_all_customers_under_child_odps(): void
    {
        $odc = Odc::create([
            'code' => 'ODC-MLG-01',
            'name' => 'ODC Malang Pusat 01',
            'capacity_odp' => 12,
        ]);

        $odpA = Odp::create([
            'code' => 'ODP-MLG-01A',
            'name' => 'ODP Malang 01A',
            'odc_id' => $odc->id,
            'port_capacity' => 8,
        ]);

        $odpB = Odp::create([
            'code' => 'ODP-MLG-01B',
            'name' => 'ODP Malang 01B',
            'odc_id' => $odc->id,
            'port_capacity' => 8,
        ]);

        $cA1 = Customer::create([
            'customer_code' => 'CUST-A1',
            'name' => 'Pelanggan ODP A1',
            'phone' => '081300000001',
            'address' => 'Jl. Ijen No 10',
            'odp_id' => $odpA->id,
            'status' => 'active',
            'package' => '50 Mbps',
        ]);

        $cB1 = Customer::create([
            'customer_code' => 'CUST-B1',
            'name' => 'Pelanggan ODP B1',
            'phone' => '081300000002',
            'address' => 'Jl. Semeru No 20',
            'odp_id' => $odpB->id,
            'status' => 'active',
            'package' => '100 Mbps',
        ]);

        $response = $this->getJson("/api/network/mass-outage/affected-customers?element_type=odc&element_id={$odc->id}");

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
        $res = $this->postJson('/api/network/mass-outage/trigger', [
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
        $this->assertEquals('disrupted', $odp->status ?? $odp->operational_status);

        // 2. Verifikasi HANYA SATU tiket (Complaint) yang dibuat di basis data
        $complaintId = $res->json('data.complaint.id');
        $this->assertNotNull($complaintId);

        $complaintsCount = Complaint::where('is_mass', true)
            ->where('affected_element_type', 'odp')
            ->where('affected_element_id', $odp->id)
            ->count();
        $this->assertEquals(1, $complaintsCount);

        // 3. Verifikasi tiket gangguan massal & geofence target koordinat simpul
        $complaint = Complaint::find($complaintId);
        $this->assertTrue($complaint->is_mass);
        $this->assertEquals(-8.090000, (float) $complaint->customer_lat);
        $this->assertEquals(112.600000, (float) $complaint->customer_lng);
        $this->assertEquals('critical', $complaint->priority->value ?? (string) $complaint->priority);
        $this->assertEquals('mass_outage', $complaint->category->value ?? (string) $complaint->category);
        $this->assertStringContainsString('Gangguan Massal', $complaint->subject);

        // 4. Verifikasi seluruh pelanggan tertaut ke tiket via IncidentCustomer
        $incident = Incident::where('node_type', 'odp')->where('node_id', $odp->id)->where('status', 'open')->first();
        $this->assertNotNull($incident);
        $this->assertCount(2, $incident->customers);

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

    public function test_resolving_mass_outage_restores_element_status_and_resolves_complaints(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-RES-01',
            'name' => 'ODP Resolve Test',
            'status' => 'disrupted',
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

        $incident = Incident::create([
            'code' => 'INC-202610-0099',
            'node_type' => 'odp',
            'node_id' => $odp->id,
            'status' => 'open',
            'severity' => 'disrupted',
        ]);

        IncidentCustomer::create([
            'incident_id' => $incident->id,
            'customer_id' => $cust->id,
            'state' => 'affected',
        ]);

        $complaint = Complaint::create([
            'ticket_number' => 'CMP-MASS-RES',
            'incident_id' => $incident->id,
            'customer_id' => $cust->id,
            'customer_name' => $cust->name,
            'customer_phone' => $cust->phone,
            'customer_address' => $cust->address,
            'area' => 'Wilayah Sukun',
            'category' => 'mass_outage',
            'subject' => 'Gangguan Massal ODP-RES-01',
            'description' => 'Gangguan massal pada ODP',
            'created_by_id' => $this->superadmin->id,
            'is_mass' => true,
            'is_mass_outage' => true,
            'affected_element_type' => 'odp',
            'affected_element_id' => $odp->id,
            'status' => 'assigned',
            'priority' => 'critical',
        ]);

        // Pulihkan jaringan
        $res = $this->postJson('/api/network/mass-outage/resolve', [
            'element_type' => 'odp',
            'element_id' => $odp->id,
            'resolution_notes' => 'Splicing ulang kabel ODP selesai dan redaman normal -18.5 dBm',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        // Status ODP kembali normal
        $odp->refresh();
        $this->assertEquals('normal', $odp->status);

        // Insiden selesai dan pelanggan restored
        $incident->refresh();
        $this->assertEquals('resolved', $incident->status);
        $this->assertDatabaseHas('incident_customers', [
            'incident_id' => $incident->id,
            'customer_id' => $cust->id,
            'state' => 'restored',
        ]);

        // Tiket terselesaikan
        $complaint->refresh();
        $this->assertEquals('resolved', $complaint->status->value ?? (string) $complaint->status);
    }

    public function test_child_incident_merges_into_parent_and_closes_child_ticket(): void
    {
        $odc = Odc::create([
            'code' => 'ODC-PARENT-01',
            'name' => 'ODC Induk',
            'capacity_odp' => 12,
        ]);

        $odp = Odp::create([
            'code' => 'ODP-CHILD-01',
            'name' => 'ODP Anak',
            'odc_id' => $odc->id,
            'port_capacity' => 8,
        ]);

        $cust = Customer::create([
            'customer_code' => 'CUST-MRG-01',
            'name' => 'Pelanggan Merge',
            'phone' => '081222222222',
            'address' => 'Jl. Merge No 1',
            'odp_id' => $odp->id,
            'status' => 'active',
        ]);

        // 1. ODP anak mengalami gangguan lebih dulu
        $resChild = $this->postJson('/api/network/mass-outage/trigger', [
            'element_type' => 'odp',
            'element_id' => $odp->id,
            'status' => 'disrupted',
            'notes' => 'Splitter ODP rusak',
        ]);
        $resChild->assertStatus(201);
        $childIncident = Incident::where('node_type', 'odp')->where('node_id', $odp->id)->where('status', 'open')->first();
        $this->assertNotNull($childIncident);
        $childComplaint = $childIncident->complaint;

        // 2. Sekarang ODC induk juga mengalami gangguan (cut)
        $resParent = $this->postJson('/api/network/mass-outage/trigger', [
            'element_type' => 'odc',
            'element_id' => $odc->id,
            'status' => 'cut',
            'notes' => 'Kabel feeder ke ODC putus',
        ]);
        $resParent->assertStatus(201);

        // 3. Verifikasi ODP anak digabung ke ODC induk
        $childIncident->refresh();
        $parentIncident = Incident::where('node_type', 'odc')->where('node_id', $odc->id)->where('status', 'open')->first();
        $this->assertEquals('merged', $childIncident->status);
        $this->assertEquals($parentIncident->id, $childIncident->merged_into_id);

        // Tiket anak ditutup dengan alasan digabung
        $childComplaint->refresh();
        $this->assertEquals('closed', $childComplaint->status->value ?? (string) $childComplaint->status);
        $this->assertStringContainsString('digabung', $childComplaint->status_reason);

        // Pelanggan ODP otomatis tertaut ke insiden induk ODC
        $this->assertDatabaseHas('incident_customers', [
            'incident_id' => $parentIncident->id,
            'customer_id' => $cust->id,
            'state' => 'affected',
        ]);
    }

    public function test_split_customer_creates_individual_ticket(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-SPLIT-01',
            'name' => 'ODP Split Test',
            'port_capacity' => 8,
        ]);

        $cust = Customer::create([
            'customer_code' => 'CUST-SPLIT-01',
            'name' => 'Pelanggan Butuh Splicing Khusus',
            'phone' => '081777777777',
            'address' => 'Jl. Rumah Pelanggan',
            'odp_id' => $odp->id,
            'package' => '20 Mbps',
            'status' => 'active',
        ]);

        $incident = Incident::create([
            'code' => 'INC-202610-0088',
            'node_type' => 'odp',
            'node_id' => $odp->id,
            'status' => 'open',
            'severity' => 'disrupted',
        ]);

        IncidentCustomer::create([
            'incident_id' => $incident->id,
            'customer_id' => $cust->id,
            'state' => 'affected',
        ]);

        $res = $this->postJson('/api/network/mass-outage/split', [
            'incident_id' => $incident->id,
            'customer_id' => $cust->id,
            'reason' => 'Dropcore di rumah pelanggan putus digigit tikus',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true);

        // Status di pivot berubah menjadi split
        $this->assertDatabaseHas('incident_customers', [
            'incident_id' => $incident->id,
            'customer_id' => $cust->id,
            'state' => 'split',
        ]);

        // Tiket individual mandiri dibuat
        $individualTicketId = $res->json('data.complaint.id');
        $individualTicket = Complaint::find($individualTicketId);
        $this->assertNotNull($individualTicket);
        $this->assertFalse($individualTicket->is_mass);
        $this->assertEquals($cust->id, $individualTicket->customer_id);
    }

    public function test_admin_cannot_create_or_modify_incident_403_and_superadmin_can(): void
    {
        $odp = Odp::create([
            'code' => 'ODP-PERM-01',
            'name' => 'ODP Perm Test',
            'port_capacity' => 8,
        ]);

        // Sebagai Admin biasa (CS) -> 403 Forbidden
        Sanctum::actingAs($this->adminUser);
        $resForbidden = $this->postJson('/api/network/mass-outage/trigger', [
            'element_type' => 'odp',
            'element_id' => $odp->id,
            'status' => 'disrupted',
        ]);
        $resForbidden->assertStatus(403);

        // Sebagai Superadmin -> 201 Created
        Sanctum::actingAs($this->superadmin);
        $resAllowed = $this->postJson('/api/network/mass-outage/trigger', [
            'element_type' => 'odp',
            'element_id' => $odp->id,
            'status' => 'disrupted',
        ]);
        $resAllowed->assertStatus(201);
    }

    public function test_resolver_performance_for_large_customer_topology(): void
    {
        $olt = Olt::create([
            'code' => 'OLT-TEST-PERF',
            'name' => 'OLT Performance Test',
        ]);

        $odc = Odc::create([
            'olt_id' => $olt->id,
            'code' => 'ODC-PERF-01',
            'name' => 'ODC Perf',
        ]);

        $odp = Odp::create([
            'odc_id' => $odc->id,
            'code' => 'ODP-PERF-01',
            'name' => 'ODP Perf',
        ]);

        // Buat 100 pelanggan contoh (dalam tes in-memory)
        $records = [];
        for ($i = 1; $i <= 100; $i++) {
            $records[] = [
                'customer_code' => sprintf('CUST-PERF-%04d', $i),
                'name' => "Pelanggan {$i}",
                'phone' => sprintf('08123456%04d', $i),
                'address' => 'Jl. Uji Kinerja No '.$i,
                'odp_id' => $odp->id,
                'package' => '20 Mbps',
                'status' => $i % 10 === 0 ? 'isolated' : 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        Customer::insert($records);

        $resolver = app(AffectedCustomersResolver::class);
        $start = microtime(true);
        $resolved = $resolver->resolve('olt', $olt->id);
        $elapsedMs = (microtime(true) - $start) * 1000;

        $this->assertEquals(100, $resolved['total_affected']);
        $this->assertLessThan(200, $elapsedMs, "Resolver took {$elapsedMs}ms, expected under 200ms");
    }
}
