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

class SubmissionTimelineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_submission_detail_returns_complete_timeline_history(): void
    {
        $admin = User::factory()->create(['name' => 'Admin Validator']);
        $admin->assignRole('Admin');

        $sales = User::factory()->create(['name' => 'Sales Representative']);
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'customer_name' => 'John Timeline',
            'status' => SubmissionStatus::PENDING_VALIDATION,
        ]);

        $document = SubmissionDocument::create([
            'submission_id' => $submission->id,
            'document_type' => 'ktp',
            'original_name' => 'ktp.jpg',
            'path' => 'submissions/ktp.jpg',
            'status' => 'pending_review',
            'is_active' => true,
        ]);

        // 1. Admin reviews document
        Sanctum::actingAs($admin);
        $this->putJson("/api/admin/documents/{$document->id}/review", [
            'status' => 'rejected',
            'review_notes' => 'KTP buram',
        ]);

        // 2. Admin rejects submission with need_info
        $this->putJson("/api/admin/submissions/{$submission->id}/validate", [
            'status' => 'need_info',
            'validation_notes' => 'Tolong upload foto KTP yang lebih jelas',
        ]);

        // 3. Query submission detail as Sales
        Sanctum::actingAs($sales);
        $response = $this->getJson("/api/sales/submissions/{$submission->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['timeline']]);

        $timeline = $response->json('data.timeline');
        $this->assertNotEmpty($timeline);

        // Verify events exist in timeline
        $descriptions = array_column($timeline, 'description');
        $hasCreation = false;
        $hasDocReview = false;
        $hasValidation = false;

        foreach ($descriptions as $desc) {
            if (str_contains($desc, 'Pengajuan baru dibuat oleh Sales Representative')) {
                $hasCreation = true;
            }
            if (str_contains($desc, 'Dokumen KTP marked as Ditolak oleh Admin Admin Validator')) {
                $hasDocReview = true;
            }
            if (str_contains($desc, 'Admin Admin Validator meminta perbaikan/info tambahan')) {
                $hasValidation = true;
            }
        }

        $this->assertTrue($hasCreation, 'Creation event missing from timeline');
        $this->assertTrue($hasDocReview, 'Document review event missing from timeline');
        $this->assertTrue($hasValidation, 'Validation event missing from timeline');
    }
}
