<?php

namespace Tests\Feature\Kpi;

use App\Models\AssignmentLog;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\DispatchSetting;
use App\Models\KpiSetting;
use App\Models\KpiSnapshot;
use App\Models\Package;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Database\Seeders\RolesAndPermissionsSeeder;
use Tests\TestCase;

class KpiAndDispatchSyncTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Team $team;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create(['email' => 'admin.kpi@fibermedia.test']);
        $this->admin->assignRole('Admin');

        $this->team = Team::create([
            'name' => 'Tim Delta KPI',
            'order_index' => 1,
            'is_active' => true,
        ]);
    }

    public function test_dispatch_settings_get_and_update(): void
    {
        // 1. Get default settings
        $res = $this->actingAs($this->admin)->getJson('/api/admin/dispatch-settings');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'min_members_present',
                    'accept_timeout_menit',
                    'max_oper',
                ],
            ]);

        // 2. Update settings
        $updateRes = $this->actingAs($this->admin)->putJson('/api/admin/dispatch-settings', [
            'min_members_present' => 2,
            'accept_timeout_menit' => 20,
            'max_oper' => 4,
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.min_members_present', 2)
            ->assertJsonPath('data.accept_timeout_menit', 20)
            ->assertJsonPath('data.max_oper', 4);
    }

    public function test_assignment_logs_endpoint_returns_resource(): void
    {
        $log = AssignmentLog::create([
            'assignable_type' => Team::class,
            'assignable_id' => $this->team->id,
            'ticket_type' => 'complaint',
            'ticket_id' => 101,
            'team_id' => $this->team->id,
            'action' => 'assigned',
            'reason' => 'Auto dispatch sistem',
            'actor_id' => $this->admin->id,
            'attempt_no' => 1,
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/admin/assignment-logs');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $log->id)
            ->assertJsonPath('data.0.team_id', $this->team->id)
            ->assertJsonPath('data.0.team.name', 'Tim Delta KPI')
            ->assertJsonPath('data.0.action', 'assigned')
            ->assertJsonPath('data.0.actor.name', $this->admin->name);
    }

    public function test_kpi_settings_get_and_versioning(): void
    {
        // Ensure initial setting exists
        $initial = KpiSetting::where('category', 'team')->where('is_active', true)->first();
        if (! $initial) {
            $initial = KpiSetting::create([
                'key' => 'kpi_team_v1',
                'version' => 1,
                'category' => 'team',
                'value' => ['description' => 'Initial Team KPI'],
                'weights' => [
                    'sla_compliance' => 0.25,
                    'acceptance_speed' => 0.15,
                    'productivity' => 0.15,
                    'evidence_quality' => 0.15,
                    'customer_rating' => 0.15,
                    'attendance' => 0.15,
                ],
                'is_active' => true,
            ]);
        }

        // Get settings
        $res = $this->actingAs($this->admin)->getJson('/api/admin/kpi/settings');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('active.team.version', 1)
            ->assertJsonPath('active.team.category', 'team');

        // Update settings creates v2
        $updateRes = $this->actingAs($this->admin)->putJson('/api/admin/kpi/settings', [
            'category' => 'team',
            'weights' => [
                'sla_compliance' => 0.30,
                'acceptance_speed' => 0.10,
                'productivity' => 0.20,
                'evidence_quality' => 0.10,
                'customer_rating' => 0.15,
                'attendance' => 0.15,
            ],
            'notes' => 'Penyesuaian bobot Q4',
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.notes', 'Penyesuaian bobot Q4');

        // Verify v1 is now deactivated
        $initial->refresh();
        $this->assertFalse($initial->is_active);
    }

    public function test_customer_rating_and_kpi_snapshot_computation(): void
    {
        $pkg = Package::create([
            'code' => 'PKG-KPI',
            'name' => 'Paket KPI',
            'speed_mbps' => 50,
            'price' => 200000,
            'is_active' => true,
        ]);

        $cust = Customer::create([
            'customer_code' => 'CUST-KPI-01',
            'name' => 'Budi Santoso',
            'phone' => '081234567890',
            'address' => 'Jl. Ijen No. 1 Malang',
            'service_type' => 'pppoe',
            'package_id' => $pkg->id,
            'status' => 'active',
        ]);

        $complaint = Complaint::create([
            'ticket_number' => 'CMP-KPI-001',
            'customer_id' => $cust->id,
            'customer_name' => $cust->name,
            'customer_phone' => $cust->phone,
            'customer_address' => $cust->address,
            'assigned_team_id' => $this->team->id,
            'category' => 'no_signal',
            'created_by_id' => $this->admin->id,
            'status' => 'resolved',
            'resolved_at' => now(),
            'area' => 'Klojen',
            'subject' => 'LOS Merah',
            'description' => 'Kabel dropcore putus',
        ]);

        // Record rating 5
        $ratingRes = $this->actingAs($this->admin)->postJson('/api/admin/kpi/rating', [
            'ticket_type' => 'complaint',
            'ticket_id' => $complaint->id,
            'rating' => 5,
            'note' => 'Pelayanan sangat cepat dan rapi',
        ]);

        $ratingRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $complaint->refresh();
        $this->assertEquals(5, $complaint->customer_rating);
        $this->assertEquals('Pelayanan sangat cepat dan rapi', $complaint->rating_note);

        // Generate WA link
        $waRes = $this->actingAs($this->admin)->getJson("/api/admin/kpi/whatsapp-link?ticket_type=complaint&ticket_id={$complaint->id}");

        $waRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.ticket_number', 'CMP-KPI-001');

        $this->assertStringContainsString('wa.me', $waRes->json('data.url'));
    }
}
