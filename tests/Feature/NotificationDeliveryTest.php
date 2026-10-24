<?php

namespace Tests\Feature;

use App\Enums\SubmissionStatus;
use App\Models\Submission;
use App\Models\SubmissionDocument;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_submission_creation_generates_instant_admin_notification(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        Sanctum::actingAs($sales);

        $payload = [
            'customer_name' => 'John Notification',
            'nik' => '1122334455667788',
            'phone' => '081299998888',
            'email' => 'johnnotif@example.com',
            'address' => 'Jl. Notifikasi No. 1',
            'district' => 'Gambir',
            'city' => 'Jakarta Pusat',
            'province' => 'DKI Jakarta',
            'package_name' => 'Fiber 100Mbps',
            'package_speed' => 100,
            'package_price' => 350000,
            'installation_fee' => 100000,
        ];

        $response = $this->postJson('/api/sales/submissions', $payload);
        $response->assertStatus(201);

        // Verify notification is created in database synchronously without queue worker
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $admin->id,
            'notifiable_type' => User::class,
        ]);

        $adminNotification = $admin->notifications()->first();
        $this->assertNotNull($adminNotification);
        $this->assertEquals('submission_created', $adminNotification->data['type']);
    }

    public function test_submission_rejection_generates_instant_sales_notification(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'status' => SubmissionStatus::PENDING_VALIDATION,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'rejected',
            'rejection_reason' => 'Dokumen KTP tidak jelas / buram',
        ]);

        $response->assertStatus(200);

        // Verify notification was stored instantly in sales user's database notifications
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $sales->id,
            'notifiable_type' => User::class,
        ]);

        $salesNotif = $sales->notifications()->first();
        $this->assertNotNull($salesNotif);
        $this->assertEquals('submission_validated', $salesNotif->data['type']);
        $this->assertStringContainsString('Dokumen KTP tidak jelas / buram', $salesNotif->data['message']);
    }

    public function test_document_rejection_generates_instant_sales_notification(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
        ]);

        $document = SubmissionDocument::create([
            'submission_id' => $submission->id,
            'document_type' => 'ktp',
            'original_name' => 'ktp.jpg',
            'path' => 'submissions/ktp.jpg',
            'status' => 'pending_review',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/admin/documents/{$document->id}/review", [
            'status' => 'rejected',
            'review_notes' => 'KTP harus asli, bukan foto copy',
        ]);

        $response->assertStatus(200);

        $salesNotif = $sales->notifications()->first();
        $this->assertNotNull($salesNotif);
        $this->assertEquals('document_review', $salesNotif->data['type']);
    }
}
