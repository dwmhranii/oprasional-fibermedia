<?php

namespace Tests\Feature\Tickets;

use App\Enums\TaskStatus;
use App\Models\AssignmentLog;
use App\Models\Complaint;
use App\Models\Customer;
use App\Models\Media;
use App\Models\Package;
use App\Models\Phase2Requirement;
use App\Models\Task;
use App\Models\Team;
use App\Models\TicketAttendance;
use App\Models\TicketEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TicketUnifiedSyncTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Team $team;
    protected Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);

        $this->admin = User::factory()->create(['email' => 'admin.ticket@fibermedia.test']);
        $this->admin->assignRole('Admin');

        $this->team = Team::create(['name' => 'Team Delta', 'is_active' => true]);

        $pkg = Package::create([
            'code' => 'PKG-100',
            'name' => 'Paket 100M',
            'speed_mbps' => 100,
            'price' => 350000,
            'is_active' => true,
        ]);

        $this->customer = Customer::create([
            'customer_code' => 'CUST-TICKET-01',
            'name' => 'Siti Aminah',
            'phone' => '081299887766',
            'address' => 'Jl. Kawi No. 10 Malang',
            'service_type' => 'pppoe',
            'package_id' => $pkg->id,
            'status' => 'active',
        ]);
    }

    public function test_complaint_unified_detail_returns_all_5_tabs_data(): void
    {
        $complaint = Complaint::create([
            'ticket_number' => 'CMP-2026-0001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_phone' => $this->customer->phone,
            'customer_address' => $this->customer->address,
            'assigned_team_id' => $this->team->id,
            'category' => 'slow_speed',
            'created_by_id' => $this->admin->id,
            'status' => 'in_progress',
            'review_status' => 'pending',
            'review_flags' => ['lokasi_jauh'],
            'area' => 'Klojen',
            'priority' => 'medium',
            'subject' => 'Internet lambat',
            'description' => 'Redaman drop ke -29dBm',
        ]);

        // 1. Add assignment log
        AssignmentLog::create([
            'assignable_type' => Complaint::class,
            'assignable_id' => $complaint->id,
            'team_id' => $this->team->id,
            'action' => 'assigned',
            'actor_id' => $this->admin->id,
            'reason' => 'Penugasan otomatis sistem',
        ]);

        // 2. Add ticket event
        TicketEvent::create([
            'eventable_type' => Complaint::class,
            'eventable_id' => $complaint->id,
            'actor_id' => $this->admin->id,
            'event' => 'status_changed',
            'from_status' => 'open',
            'to_status' => 'in_progress',
            'occurred_at' => now(),
        ]);

        // 3. Add technician attendance
        $tech = User::factory()->create(['name' => 'Teknisi Alfa']);
        TicketAttendance::create([
            'attendable_type' => Complaint::class,
            'attendable_id' => $complaint->id,
            'user_id' => $tech->id,
            'lat' => -7.9824,
            'lng' => 112.6304,
            'accuracy' => 8.5,
            'distance_meters' => 25.0,
            'geofence_status' => 'inside',
            'captured_at' => now(),
            'received_at' => now(),
        ]);

        // Query unified detail
        $res = $this->actingAs($this->admin)->getJson("/api/admin/dispatch/tickets/complaint/{$complaint->id}/unified-detail");

        $res->assertStatus(200)
            ->assertJsonPath('data.ticket.ticket_number', 'CMP-2026-0001')
            ->assertJsonPath('data.ticket.status', 'in_progress')
            ->assertJsonPath('data.ticket.assigned_team_id', $this->team->id)
            ->assertJsonPath('data.ticket.review_status', 'pending');

        // Check tabs payload
        $this->assertNotEmpty($res->json('data.assignment_logs'));
        $this->assertNotEmpty($res->json('data.ticket_events'));
        $this->assertNotEmpty($res->json('data.evidence.attendances'));
        $this->assertEquals('inside', $res->json('data.evidence.attendances.0.geofence_status'));
    }

    public function test_phase_2_waive_workflow(): void
    {
        $complaint = Complaint::create([
            'ticket_number' => 'CMP-WAIVE-01',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_phone' => $this->customer->phone,
            'customer_address' => $this->customer->address,
            'category' => 'equipment',
            'created_by_id' => $this->admin->id,
            'status' => 'resolved',
            'area' => 'Sukun',
            'subject' => 'Modem Mati',
            'description' => 'Adaptor rusak',
        ]);

        $tech = User::factory()->create(['name' => 'Teknisi Izin']);
        $req = Phase2Requirement::create([
            'assignable_type' => Complaint::class,
            'assignable_id' => $complaint->id,
            'user_id' => $tech->id,
            'required_at' => now(),
        ]);

        $res = $this->actingAs($this->admin)->putJson("/api/admin/tickets/complaint/{$complaint->id}/phase-2-waive", [
            'user_id' => $tech->id,
            'reason' => 'Teknisi izin sakit mendadak setelah perbaikan teknis selesai',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        $req->refresh();
        $this->assertEquals($this->admin->id, $req->waived_by_id);
        $this->assertEquals('Teknisi izin sakit mendadak setelah perbaikan teknis selesai', $req->waive_reason);
    }

    public function test_task_unified_detail_returns_all_5_tabs_data(): void
    {
        $task = Task::factory()->create([
            'assigned_team_id' => $this->team->id,
            'review_status' => 'flagged',
            'review_flags' => ['redaman_tinggi'],
            'status' => TaskStatus::COMPLETED->value,
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/admin/dispatch/tickets/task/{$task->id}/unified-detail");

        $res->assertStatus(200)
            ->assertJsonPath('data.ticket.task_number', $task->task_number)
            ->assertJsonPath('data.ticket.assigned_team_id', $this->team->id)
            ->assertJsonPath('data.ticket.review_status', 'flagged')
            ->assertJsonPath('data.ticket.review_flags.0', 'redaman_tinggi');
    }
}
