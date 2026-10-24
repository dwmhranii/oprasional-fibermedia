<?php

namespace Tests\Feature\DocumentVerification;

use App\Enums\SubmissionStatus;
use App\Events\DocumentReviewed;
use App\Models\Submission;
use App\Models\User;
use App\Notifications\DocumentReviewNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createSalesAndSubmission()
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'status' => SubmissionStatus::PENDING,
        ]);

        return [$sales, $submission];
    }

    private function createAdmin()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        return $admin;
    }

    public function test_admin_can_approve_document()
    {
        Event::fake();
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'approved',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('submission_documents', ['id' => $doc->id, 'status' => 'approved']);
        $this->assertDatabaseHas('submission_document_reviews', ['submission_document_id' => $doc->id, 'status' => 'approved']);
        Event::assertDispatched(DocumentReviewed::class);
    }

    public function test_admin_can_reject_document()
    {
        Notification::fake();
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'rejected',
            'review_notes' => 'Blurry image',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('submission_documents', ['id' => $doc->id, 'status' => 'rejected']);
        Notification::assertSentTo($sales, DocumentReviewNotification::class);
    }

    public function test_admin_can_request_revision()
    {
        Notification::fake();
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'needs_revision',
            'review_notes' => 'Please upload a brighter copy',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('submission_documents', ['id' => $doc->id, 'status' => 'needs_revision']);
    }

    public function test_sales_can_view_document_status()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();
        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');

        $response = $this->actingAs($sales, 'sanctum')->getJson("/api/sales/submissions/{$submission->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('data.documents.0.status', 'pending_review');
    }

    public function test_sales_can_upload_replacement_document()
    {
        Storage::fake('public');
        [$sales, $submission] = $this->createSalesAndSubmission();

        // Initial upload
        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc1 = $submission->submissionDocuments()->first();
        $doc1->update(['status' => 'rejected']);

        // Upload replacement
        $file = UploadedFile::fake()->create('ktp_new.png', 100, 'image/png');
        $response = $this->actingAs($sales, 'sanctum')->postJson("/api/sales/submissions/{$submission->id}/upload-document", [
            'document_type' => 'ktp',
            'file' => $file,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('submission_documents', ['id' => $doc1->id, 'is_active' => false]);
        $this->assertDatabaseHas('submission_documents', ['submission_id' => $submission->id, 'is_active' => true, 'status' => 'pending_review']);
    }

    public function test_review_notes_required_for_rejection()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'rejected',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['review_notes']);
    }

    public function test_review_notes_required_for_revision()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'needs_revision',
        ]);

        $response->assertStatus(422);
    }

    public function test_submission_cannot_progress_with_unapproved_documents()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'approved',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Submission validation failed: Required documents are pending review, rejected, or need revision.');
    }

    public function test_submission_can_progress_when_all_documents_approved()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();
        $doc->update(['status' => 'approved']);

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'approved',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(SubmissionStatus::APPROVED, $submission->fresh()->status);
    }

    public function test_document_review_notification_sent()
    {
        Notification::fake();
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'rejected',
            'review_notes' => 'bad',
        ]);

        Notification::assertSentTo($sales, DocumentReviewNotification::class);
    }

    public function test_document_review_activity_logged()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();
        $admin = $this->createAdmin();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'approved',
        ]);

        $this->assertDatabaseHas('activity_log', [
            'subject_id' => $submission->id,
            'description' => "Document ktp approved by Admin {$admin->name}",
        ]);
    }

    public function test_sales_cannot_review_documents()
    {
        [$sales, $submission] = $this->createSalesAndSubmission();

        $submission->addDocument('ktp', 'test/ktp.png', 'ktp.png');
        $doc = $submission->submissionDocuments()->first();

        $response = $this->actingAs($sales, 'sanctum')->putJson("/api/admin/documents/{$doc->id}/review", [
            'status' => 'approved',
        ]);

        $response->assertStatus(403);
    }
}
