<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\DispatchSetting;
use App\Models\OfficeLocation;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Modules\Dispatch\Services\DispatchService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Fase4SalesWorkflowTest extends TestCase
{
    use RefreshDatabase;

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
    }

    public function test_sales_role_and_attributes_exist(): void
    {
        $role = Role::findByName('Sales');
        $this->assertNotNull($role);

        $sales = User::factory()->create([
            'email' => 'sales@fibermedia.test',
        ]);
        $sales->assignRole('Sales');

        $this->assertTrue($sales->hasRole('Sales'));

        // Customer has sales_id
        $customer = Customer::create([
            'customer_code' => 'CUST-SLS-01',
            'name' => 'Pelanggan Sales',
            'address' => 'Jl. Sales No 1',
            'phone' => '081234567890',
            'package' => '50 Mbps',
            'sales_id' => $sales->id,
            'status' => 'active',
        ]);

        $this->assertEquals($sales->id, $customer->sales_id);
        $this->assertEquals($sales->id, $customer->sales->id);
    }

    public function test_duplicate_check_detects_nik_hash_without_hard_blocking(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        $nik = '3201012345670001';

        // Existing customer with the same NIK
        Customer::create([
            'customer_code' => 'CUST-EXIST-01',
            'name' => 'Pelanggan Lama',
            'address' => 'Jl. Lama No 1',
            'phone' => '081111111111',
            'package' => '50 Mbps',
            'nik' => $nik,
            'status' => 'active',
        ]);

        // Sales submits a new application with the same NIK
        $payload = [
            'customer_name' => 'Calon Pelanggan Duplikat NIK',
            'nik' => $nik,
            'phone' => '082222222222',
            'email' => 'nik.dup@example.com',
            'address' => 'Jl. Baru No 2',
            'district' => 'Kecamatan Baru',
            'city' => 'Kota Baru',
            'province' => 'Jawa Barat',
            'postal_code' => '12345',
            'lat' => -6.90000,
            'lng' => 107.60000,
            'package_name' => 'Big Diamond',
            'package_speed' => 50,
            'package_price' => 155000,
            'installation_fee' => 0,
            'total_price' => 155000,
        ];

        $response = $this->postJson('/api/submissions', $payload);

        // MUST NOT hard block -> HTTP 201 Created
        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertNotEmpty($data['duplicate_warnings']);
        $warningsString = implode(' ', $data['duplicate_warnings']);
        $this->assertStringContainsString('sudah terdaftar pada pelanggan', $warningsString);

        // Verify stored in DB with sales_id and warnings
        $this->assertDatabaseHas('submissions', [
            'id' => $data['id'],
            'sales_id' => $sales->id,
            'customer_name' => 'Calon Pelanggan Duplikat NIK',
        ]);
    }

    public function test_duplicate_check_detects_phone_normalized_without_hard_blocking(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        // Existing customer with +62 formatted phone
        Customer::create([
            'customer_code' => 'CUST-PHONE-01',
            'name' => 'Pelanggan Telp',
            'address' => 'Jl. Telepon No 1',
            'phone' => '+62 812-9876-5432',
            'package' => '50 Mbps',
            'status' => 'active',
        ]);

        // Sales submits with standard 0812 format
        $payload = [
            'customer_name' => 'Calon Pelanggan Duplikat Telepon',
            'nik' => '3201019999990002',
            'phone' => '081298765432',
            'email' => 'phone.dup@example.com',
            'address' => 'Jl. Baru No 3',
            'district' => 'Kecamatan Baru',
            'city' => 'Kota Baru',
            'province' => 'Jawa Barat',
            'package_name' => 'Mini Deluxe',
            'package_speed' => 30,
            'package_price' => 125000,
            'installation_fee' => 0,
            'total_price' => 125000,
        ];

        $response = $this->postJson('/api/submissions', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');
        $this->assertNotEmpty($data['duplicate_warnings']);
        $warningsString = implode(' ', $data['duplicate_warnings']);
        $this->assertStringContainsString('sudah terdaftar pada pelanggan', $warningsString);
    }

    public function test_duplicate_check_detects_gps_proximity_without_hard_blocking(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        // Existing customer at specific coordinates
        Customer::create([
            'customer_code' => 'CUST-GPS-01',
            'name' => 'Pelanggan Lokasi',
            'address' => 'Jl. Lokasi No 1',
            'phone' => '081300000001',
            'package' => '50 Mbps',
            'latitude' => -6.20000,
            'longitude' => 106.81600,
            'status' => 'active',
        ]);

        // Sales submits within 15 meters
        $payload = [
            'customer_name' => 'Calon Pelanggan Dekat',
            'nik' => '3201018888880003',
            'phone' => '081300000002',
            'address' => 'Jl. Lokasi No 1B',
            'district' => 'Kecamatan Lokasi',
            'city' => 'Kota Lokasi',
            'province' => 'Jawa Barat',
            'lat' => -6.20008,
            'lng' => 106.81608,
            'package_name' => 'Mini Deluxe',
            'package_speed' => 30,
            'package_price' => 125000,
            'installation_fee' => 0,
            'total_price' => 125000,
        ];

        $response = $this->postJson('/api/submissions', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');
        $this->assertNotEmpty($data['duplicate_warnings']);
        $warningsString = implode(' ', $data['duplicate_warnings']);
        $this->assertStringContainsString('berdekatan', $warningsString);
    }

    public function test_check_duplicate_dedicated_endpoint(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        Customer::create([
            'customer_code' => 'CUST-DED-01',
            'name' => 'Pelanggan Uji',
            'address' => 'Jl. Uji No 1',
            'phone' => '081234111222',
            'package' => '50 Mbps',
            'nik' => '3201015555550005',
            'status' => 'active',
        ]);

        $res = $this->postJson('/api/submissions/check-duplicate', [
            'nik' => '3201015555550005',
            'phone' => '081234111222',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('is_duplicate', true);

        $warnings = $res->json('warnings');
        $this->assertCount(2, $warnings);
    }

    public function test_sales_only_sees_their_own_submissions(): void
    {
        $sales1 = User::factory()->create(['name' => 'Sales Satu']);
        $sales1->assignRole('Sales');

        $sales2 = User::factory()->create(['name' => 'Sales Dua']);
        $sales2->assignRole('Sales');

        $submission1 = Submission::create([
            'submission_number' => 'SUB-SLS-001',
            'user_id' => $sales1->id,
            'sales_id' => $sales1->id,
            'customer_name' => 'Pelanggan Sales 1',
            'nik' => '3201011111110001',
            'phone' => '081111111111',
            'address' => 'Jl. Satu No 1',
            'district' => 'Kec 1',
            'city' => 'Kota 1',
            'province' => 'Prov 1',
            'package_name' => 'Mini Deluxe',
            'package_speed' => 30,
            'package_price' => 125000,
            'status' => 'pending',
        ]);

        $submission2 = Submission::create([
            'submission_number' => 'SUB-SLS-002',
            'user_id' => $sales2->id,
            'sales_id' => $sales2->id,
            'customer_name' => 'Pelanggan Sales 2',
            'nik' => '3201012222220002',
            'phone' => '082222222222',
            'address' => 'Jl. Dua No 2',
            'district' => 'Kec 2',
            'city' => 'Kota 2',
            'province' => 'Prov 2',
            'package_name' => 'Big Diamond',
            'package_speed' => 50,
            'package_price' => 155000,
            'status' => 'pending',
        ]);

        // 1. Sales 1 views list
        Sanctum::actingAs($sales1);
        $res1 = $this->getJson('/api/submissions');
        $res1->assertStatus(200);
        $ids1 = collect($res1->json('data'))->pluck('id')->toArray();
        $this->assertContains($submission1->id, $ids1);
        $this->assertNotContains($submission2->id, $ids1);

        // Sales 1 views single submission 1 -> 200 OK
        $view1 = $this->getJson("/api/submissions/{$submission1->id}");
        $view1->assertStatus(200);

        // Sales 1 views submission 2 -> 403 Forbidden
        $view2 = $this->getJson("/api/submissions/{$submission2->id}");
        $view2->assertStatus(403);

        // 2. Sales 2 views list
        Sanctum::actingAs($sales2);
        $res2 = $this->getJson('/api/submissions');
        $res2->assertStatus(200);
        $ids2 = collect($res2->json('data'))->pluck('id')->toArray();
        $this->assertContains($submission2->id, $ids2);
        $this->assertNotContains($submission1->id, $ids2);
    }

    public function test_admin_validating_submission_creates_customer_and_psb_dispatch_ticket(): void
    {
        // 1. Setup a ready team for dispatch
        $team = Team::create(['name' => 'Tim Bravo PSB', 'is_active' => true, 'order_index' => 1]);
        $tech = User::factory()->create(['name' => 'Teknisi Bravo']);
        $tech->assignRole('Teknisi');
        TeamMember::create(['team_id' => $team->id, 'user_id' => $tech->id, 'is_active' => true]);

        // Tech is checked-in today -> team is ready
        DailyAttendance::create([
            'user_id' => $tech->id,
            'work_date' => now()->toDateString(),
            'check_in_at' => now()->subHours(2),
            'geofence_status' => 'inside',
            'status' => 'hadir',
        ]);

        $readyTeams = app(DispatchService::class)->getReadyTeams();
        $this->assertTrue(collect($readyTeams)->contains('id', $team->id));

        // 2. Sales creates submission
        $sales = User::factory()->create(['name' => 'Sales Charlie']);
        $sales->assignRole('Sales');

        $submission = Submission::create([
            'submission_number' => 'SUB-VAL-001',
            'user_id' => $sales->id,
            'sales_id' => $sales->id,
            'customer_name' => 'Ahmad Validasi',
            'nik' => '3201013333330003',
            'phone' => '083333333333',
            'email' => 'ahmad@example.com',
            'address' => 'Jl. Pengajuan Valid No 10',
            'district' => 'Kecamatan Tengah',
            'city' => 'Kota Bandung',
            'province' => 'Jawa Barat',
            'package_name' => 'Big Elite',
            'package_speed' => 85,
            'package_price' => 220000,
            'installation_fee' => 0,
            'total_price' => 220000,
            'status' => 'pending',
        ]);

        // 3. Admin validates & approves submission
        $admin = User::factory()->create(['name' => 'Admin Ops']);
        $admin->assignRole('Admin');
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/submissions/{$submission->id}/validate", [
            'action' => 'approved',
            'validation_notes' => 'Berkas valid dan lengkap',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // 4. Verify Submission is approved
        $submission->refresh();
        $this->assertEquals('approved', $submission->status instanceof \BackedEnum ? $submission->status->value : (string) $submission->status);

        // 5. Verify Customer was created with sales_id preserved
        $customer = Customer::where('name', 'Ahmad Validasi')->first();
        $this->assertNotNull($customer);
        $this->assertEquals($sales->id, $customer->sales_id);
        $this->assertEquals('Big Elite', $customer->package);
        $this->assertEquals('active', $customer->status);

        // 6. Verify PSB ticket (Task) was created and dispatched to the ready team
        $task = Task::whereHas('provisioning', function ($q) use ($submission) {
            $q->where('submission_id', $submission->id);
        })->first();

        $this->assertNotNull($task);
        $this->assertEquals($team->id, $task->assigned_team_id);
        $this->assertEquals('assigned', $task->status instanceof \BackedEnum ? $task->status->value : (string) $task->status);
    }

    public function test_admin_rejecting_submission_requires_reason(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::create([
            'submission_number' => 'SUB-REJ-001',
            'user_id' => $sales->id,
            'sales_id' => $sales->id,
            'customer_name' => 'Budi Tolak',
            'nik' => '3201014444440004',
            'phone' => '084444444444',
            'address' => 'Jl. Tolak No 4',
            'district' => 'Kec 4',
            'city' => 'Kota 4',
            'province' => 'Jawa Barat',
            'package_name' => 'Mini Deluxe',
            'package_speed' => 30,
            'package_price' => 125000,
            'status' => 'pending',
        ]);

        $admin = User::factory()->create();
        $admin->assignRole('Admin');
        Sanctum::actingAs($admin);

        // 1. Reject without reason -> 422
        $resFail = $this->postJson("/api/submissions/{$submission->id}/validate", [
            'action' => 'rejected',
        ]);
        $resFail->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);

        // 2. Reject with reason -> 200 OK
        $resSuccess = $this->postJson("/api/submissions/{$submission->id}/validate", [
            'action' => 'rejected',
            'rejection_reason' => 'Foto KTP tidak terbaca jelas / buram',
        ]);

        $resSuccess->assertStatus(200)
            ->assertJsonPath('success', true);

        $submission->refresh();
        $this->assertEquals('rejected', $submission->status instanceof \BackedEnum ? $submission->status->value : (string) $submission->status);
        $this->assertEquals('Foto KTP tidak terbaca jelas / buram', $submission->rejection_reason);

        // No customer or task created
        $this->assertNull(Customer::where('name', 'Budi Tolak')->first());
        $this->assertNull(Task::where('submission_id', $submission->id)->first());
    }

    public function test_sales_user_daily_attendance_works_identically_to_other_roles(): void
    {
        $office = OfficeLocation::create([
            'name' => 'Kantor Pusat Fibermedia',
            'latitude' => -6.20000,
            'longitude' => 106.81600,
            'radius_meters' => 50,
            'is_active' => true,
        ]);

        $sales = User::factory()->create(['name' => 'Sales Hadir']);
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        // 1. Check-in inside geofence
        $checkInRes = $this->postJson('/api/attendance/check-in', [
            'latitude' => -6.20005,
            'longitude' => 106.81605,
            'accuracy' => 10,
            'selfie_base64' => 'data:image/jpeg;base64,'.base64_encode('fake-sales-selfie'),
        ]);

        $checkInRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $attendanceId = $checkInRes->json('data.id');
        $attendance = DailyAttendance::find($attendanceId);

        $this->assertNotNull($attendance);
        $this->assertNotNull($attendance->check_in_at);
        $this->assertContains($attendance->status, ['hadir', 'field_checkin']);

        // 2. Check-out
        $checkOutRes = $this->postJson('/api/attendance/check-out', [
            'latitude' => -6.20005,
            'longitude' => 106.81605,
            'accuracy' => 10,
        ]);

        $checkOutRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $attendance->refresh();
        $this->assertNotNull($attendance->check_out_at);
    }
}
