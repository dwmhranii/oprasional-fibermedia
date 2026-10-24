<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use App\Services\FileUploadService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('public');
    }

    public function test_sales_can_upload_document_to_own_submission(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
        ]);

        Sanctum::actingAs($sales);

        // Use create() with mime type to avoid requiring PHP GD extension
        $file = UploadedFile::fake()->create('ktp.jpg', 100, 'image/jpeg');

        $response = $this->postJson("/api/sales/submissions/{$submission->id}/upload-document", [
            'document_type' => 'ktp',
            'file' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'data' => ['document_type', 'path', 'url']]);

        $path = $response->json('data.path');
        Storage::disk('public')->assertExists($path);

        $submission->refresh();
        $this->assertCount(1, $submission->submissionDocuments);
        $this->assertEquals($path, $submission->submissionDocuments[0]->path);
    }

    public function test_technician_can_upload_photo_to_assigned_task(): void
    {
        $tech = User::factory()->create();
        $tech->assignRole('Teknisi');

        $task = Task::factory()->create([
            'teknisi_id' => $tech->id,
            'status' => TaskStatus::ASSIGNED,
        ]);

        Sanctum::actingAs($tech);

        // Use create() with mime type to avoid requiring PHP GD extension
        $file = UploadedFile::fake()->create('modem.jpg', 100, 'image/jpeg');

        $response = $this->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", [
            'photo_type' => 'modem',
            'photo' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'data' => ['photo_type', 'path', 'url']]);

        $path = $response->json('data.path');
        Storage::disk('public')->assertExists($path);

        $task->refresh();
        $this->assertArrayHasKey('modem', $task->photos);
        $this->assertEquals($path, $task->photos['modem']);
    }

    public function test_photo_upload_rollback_protection_on_database_failure(): void
    {
        $tech = User::factory()->create();
        $tech->assignRole('Teknisi');

        $task = Task::factory()->create([
            'teknisi_id' => $tech->id,
            'status' => TaskStatus::ASSIGNED,
        ]);

        Sanctum::actingAs($tech);

        // Force Task update to fail via Eloquent updating event
        Task::updating(function () {
            throw new \RuntimeException('Simulated database write failure.');
        });

        // Use create() with mime type to avoid requiring PHP GD extension
        $file = UploadedFile::fake()->create('speedtest.jpg', 100, 'image/jpeg');

        try {
            $response = $this->postJson("/api/teknisi/tasks/{$task->id}/upload-photo", [
                'photo_type' => 'speedtest',
                'photo' => $file,
            ]);

            $response->assertStatus(500);
        } catch (\RuntimeException $e) {
            $this->assertEquals('Simulated database write failure.', $e->getMessage());
        }

        // Verify that the file does not remain on storage (it was rolled back / deleted)
        $files = Storage::disk('public')->allFiles("tasks/{$task->id}");
        $this->assertEmpty($files, 'The uploaded file was not cleaned up during database failure.');

        // Verify database remains unchanged
        $task->refresh();
        $this->assertEmpty($task->photos);
    }

    public function test_atomic_submission_creation_with_documents(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        $ktp = UploadedFile::fake()->create('ktp.jpg', 100, 'image/jpeg');
        $rumah = UploadedFile::fake()->create('rumah.jpg', 100, 'image/jpeg');

        $payload = [
            'customer_name' => 'Jane Doe',
            'nik' => '1234567890123456',
            'phone' => '081234567890',
            'email' => 'janedoe@example.com',
            'address' => 'Jl. Merdeka No. 10',
            'district' => 'Gambir',
            'city' => 'Jakarta Pusat',
            'province' => 'DKI Jakarta',
            'package_name' => 'Fiber 100Mbps',
            'package_speed' => 100,
            'package_price' => 350000,
            'installation_fee' => 100000,
            'ktp' => $ktp,
            'rumah' => $rumah,
        ];

        $response = $this->postJson('/api/sales/submissions', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('submissions', [
            'customer_name' => 'Jane Doe',
            'nik' => '1234567890123456',
        ]);

        $submission = Submission::where('nik', '1234567890123456')->first();
        $this->assertNotNull($submission);
        $this->assertCount(2, $submission->submissionDocuments);
    }

    public function test_atomic_submission_creation_rollback_on_upload_failure(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        Sanctum::actingAs($sales);

        // Force addDocument to throw error during creation
        Submission::created(function () {
            // Trigger failure during post-creation hook or document attachment
        });

        $ktp = UploadedFile::fake()->create('ktp.jpg', 100, 'image/jpeg');

        // Mock FileUploadService to fail on upload
        $this->mock(FileUploadService::class, function ($mock) {
            $mock->shouldReceive('uploadFile')->andReturn(false);
            $mock->shouldReceive('deleteFile')->andReturn(true);
        });

        $payload = [
            'customer_name' => 'John Rollback',
            'nik' => '9999999999999999',
            'phone' => '081999999999',
            'email' => 'johnrollback@example.com',
            'address' => 'Jl. Test No. 1',
            'district' => 'Gambir',
            'city' => 'Jakarta Pusat',
            'province' => 'DKI Jakarta',
            'package_name' => 'Fiber 50Mbps',
            'package_speed' => 50,
            'package_price' => 250000,
            'installation_fee' => 50000,
            'ktp' => $ktp,
        ];

        $response = $this->postJson('/api/sales/submissions', $payload);

        $response->assertStatus(500)
            ->assertJsonPath('success', false);

        // Verify that NO submission was saved to database (preventing double data)
        $this->assertDatabaseMissing('submissions', [
            'nik' => '9999999999999999',
        ]);
    }
}
