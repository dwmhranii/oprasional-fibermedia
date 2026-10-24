<?php

namespace Tests\Feature;

use App\Enums\ComplaintStatus;
use App\Enums\TaskStatus;
use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\Media;
use App\Models\Phase2Requirement;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\TicketAttendance;
use App\Models\User;
use App\Modules\Field\Services\MediaService;
use App\Modules\Field\Services\PhaseWorkflowService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Fase3EvidenceAndFieldWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Team $teamA;

    protected User $techA1;

    protected User $techA2;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');

        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Superadmin']);
        Role::firstOrCreate(['name' => 'Teknisi']);
        Role::firstOrCreate(['name' => 'Sales']);

        $this->admin = User::factory()->create(['status' => 'active']);
        $this->admin->assignRole('Admin');

        // Setup Tim A dengan 2 personil
        $this->teamA = Team::create([
            'name' => 'Tim Alpha',
            'order_index' => 1,
            'is_active' => true,
        ]);

        $this->techA1 = User::factory()->create(['name' => 'Teknisi Alpha 1', 'status' => 'active', 'team' => 'Tim Alpha']);
        $this->techA1->assignRole('Teknisi');
        $this->techA2 = User::factory()->create(['name' => 'Teknisi Alpha 2', 'status' => 'active', 'team' => 'Tim Alpha']);
        $this->techA2->assignRole('Teknisi');

        TeamMember::firstOrCreate(['team_id' => $this->teamA->id, 'user_id' => $this->techA1->id], ['joined_at' => now()]);
        TeamMember::firstOrCreate(['team_id' => $this->teamA->id, 'user_id' => $this->techA2->id], ['joined_at' => now()]);
    }

    private function createPsbTask(string $number = 'TSK-F3-01'): Task
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('Sales');

        $submission = Submission::factory()->create([
            'user_id' => $sales->id,
            'customer_name' => 'Pelanggan PSB Fase 3',
            'lat' => -6.200000,
            'lng' => 106.816666,
            'status' => 'approved',
        ]);

        $provisioning = Provisioning::create([
            'provisioning_number' => 'PRV-'.uniqid(),
            'submission_id' => $submission->id,
            'admin_id' => $this->admin->id,
            'status' => 'ready',
        ]);

        return Task::create([
            'task_number' => $number,
            'provisioning_id' => $provisioning->id,
            'assigned_team_id' => $this->teamA->id,
            'assigned_team' => $this->teamA->name,
            'teknisi_id' => $this->techA1->id,
            'status' => TaskStatus::IN_PROGRESS,
        ]);
    }

    private function createComplaint(string $number = 'CMP-F3-01'): Complaint
    {
        return Complaint::create([
            'ticket_number' => $number,
            'created_by_id' => $this->admin->id,
            'customer_name' => 'Pelanggan Gangguan Fase 3',
            'customer_phone' => '08123456789',
            'customer_address' => 'Jl. Merdeka No 1',
            'area' => 'Wilayah Barat',
            'customer_lat' => -6.200000,
            'customer_lng' => 106.816666,
            'subject' => 'Internet Putus Total',
            'description' => 'LOS merah berkedip',
            'category' => 'no_signal',
            'status' => ComplaintStatus::IN_PROGRESS,
            'assigned_team_id' => $this->teamA->id,
            'assigned_team' => $this->teamA->name,
        ]);
    }

    private function checkInUser(User $user): DailyAttendance
    {
        return DailyAttendance::create([
            'user_id' => $user->id,
            'work_date' => Carbon::today()->toDateString(),
            'status' => 'hadir',
            'check_in_at' => now(),
            'check_out_at' => null,
            'office_distance_meters' => 20,
        ]);
    }

    /**
     * Tes 1: Submit ganda dengan Idempotency-Key sama tidak menggandakan data.
     */
    public function test_duplicate_submission_with_same_idempotency_key_does_not_duplicate_data(): void
    {
        $task = $this->createPsbTask();
        $this->checkInUser($this->techA1);

        $fakeSelfie = base64_encode('fake-jpg-content-selfie-idempotency');
        $idempotencyKey = 'idemp_key_'.uniqid();

        $payload = [
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'accuracy' => 15,
            'selfie_base64' => 'data:image/jpeg;base64,'.$fakeSelfie,
        ];

        // Request pertama
        $res1 = $this->actingAs($this->techA1)
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson("/api/field/tickets/psb/{$task->id}/phase-2-attendance", $payload);

        $res1->assertStatus(200);
        $res1->assertJson(['success' => true]);

        $attendancesCountBefore = TicketAttendance::where('attendable_id', $task->id)->count();
        $mediaCountBefore = Media::where('mediable_id', $task->id)->count();

        // Request kedua dengan Idempotency-Key yang sama persis
        $res2 = $this->actingAs($this->techA1)
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->postJson("/api/field/tickets/psb/{$task->id}/phase-2-attendance", $payload);

        $res2->assertStatus(200);
        $res2->assertHeader('X-Idempotent-Replay', 'true');

        // Pastikan tidak ada data ganda yang tersimpan
        $this->assertEquals($attendancesCountBefore, TicketAttendance::where('attendable_id', $task->id)->count());
        $this->assertEquals($mediaCountBefore, Media::where('mediable_id', $task->id)->count());
    }

    /**
     * Tes 2: Saat Fase 1 disubmit, daftar teknisi wajib Fase 2 dikunci hanya untuk anggota yang hadir hari itu.
     */
    public function test_phase2_mandatory_technicians_list_locked_on_phase1_submit(): void
    {
        $task = $this->createPsbTask();

        // Tech 1 hadir (check-in hari ini), Tech 2 libur (tidak absen)
        $this->checkInUser($this->techA1);

        // Tech 1 submit Fase 1 (foto sebelum/sesudah, tanda tangan, data teknis)
        $fakeImg = base64_encode('fake-img-evidence-1');
        $payload = [
            'photo_before_base64' => 'data:image/jpeg;base64,'.$fakeImg,
            'photo_after_base64' => 'data:image/jpeg;base64,'.$fakeImg,
            'signature_base64' => 'data:image/jpeg;base64,'.$fakeImg,
            'odp' => 'ODP-PSB-01',
            'port' => '4',
            'onu_index' => '1',
            'redaman' => '-18.5',
            'notes' => 'Pemasangan kabel drop wire 50m selesai.',
        ];

        $response = $this->actingAs($this->techA1)
            ->postJson("/api/field/tickets/psb/{$task->id}/phase-1", $payload);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verifikasi daftar wajib Fase 2 terkunci hanya untuk Tech 1 (yang hadir)
        $requirements = Phase2Requirement::where('assignable_type', Task::class)
            ->where('assignable_id', $task->id)
            ->get();

        $this->assertCount(1, $requirements);
        $this->assertEquals($this->techA1->id, $requirements->first()->user_id);
        $this->assertNull($requirements->first()->completed_at);

        // Tech 2 yang libur TIDAK masuk ke daftar wajib
        $this->assertFalse($requirements->contains('user_id', $this->techA2->id));
    }

    /**
     * Tes 3: Anggota tim yang libur tidak menahan tiket untuk selesai.
     */
    public function test_off_duty_technician_does_not_hold_back_ticket_completion(): void
    {
        $complaint = $this->createComplaint();

        // Tech 1 hadir hari ini, Tech 2 libur
        $this->checkInUser($this->techA1);

        // 1. Submit Fase 1
        $fakeImg = base64_encode('fake-img-complaint-f1');
        $this->actingAs($this->techA1)
            ->postJson("/api/field/tickets/complaint/{$complaint->id}/phase-1", [
                'photo_before_base64' => 'data:image/jpeg;base64,'.$fakeImg,
                'photo_after_base64' => 'data:image/jpeg;base64,'.$fakeImg,
                'resolution_category' => 'cable_broken',
                'notes' => 'Kabel drop optik disambung ulang.',
            ])
            ->assertStatus(200);

        // 2. Tech 1 (satu-satunya personil hadir) submit absensi Fase 2
        $selfieImg = base64_encode('fake-selfie-content-tech1');
        $this->actingAs($this->techA1)
            ->postJson("/api/field/tickets/complaint/{$complaint->id}/phase-2-attendance", [
                'latitude' => -6.200000,
                'longitude' => 106.816666,
                'accuracy' => 10,
                'selfie_base64' => 'data:image/jpeg;base64,'.$selfieImg,
            ])
            ->assertStatus(200);

        // 3. Verifikasi tiket langsung RESOLVED tanpa tertahan oleh Tech 2 yang libur!
        $fresh = $complaint->fresh();
        $this->assertEquals(ComplaintStatus::RESOLVED, $fresh->status);
        $this->assertTrue($fresh->allTeamMembersAttended());
    }

    /**
     * Tes 4: Geofence hanya MENANDAI (outside) tanpa menolak pengajuan tiket.
     */
    public function test_geofence_marks_outside_without_rejecting_submission(): void
    {
        $task = $this->createPsbTask();
        $this->checkInUser($this->techA1);

        // Kunci requirement
        app(PhaseWorkflowService::class)->lockPhase2Requirements($task, $this->techA1);

        // Lokasi pelanggan: -6.200000, 106.816666
        // Teknisi submit dari jarak ~5.5 km (-6.250000, 106.816666)
        $selfieImg = base64_encode('fake-selfie-outside');
        $response = $this->actingAs($this->techA1)
            ->postJson("/api/field/tickets/psb/{$task->id}/phase-2-attendance", [
                'latitude' => -6.250000,
                'longitude' => 106.816666,
                'accuracy' => 20,
                'selfie_base64' => 'data:image/jpeg;base64,'.$selfieImg,
            ]);

        // JANGAN MENOLAK (HTTP 200)
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verifikasi geofence_status tercatat sebagai 'outside'
        $att = TicketAttendance::where('attendable_id', $task->id)->where('user_id', $this->techA1->id)->first();
        $this->assertNotNull($att);
        $this->assertEquals('outside', $att->geofence_status);
        $this->assertGreaterThan(5000, $att->distance_meters);

        // Media juga ditandai anomali karena lokasi di luar
        $media = Media::where('mediable_id', $task->id)->where('kind', 'selfie')->latest('id')->first();
        $this->assertNotNull($media);
        $this->assertTrue($media->is_anomaly);
        $this->assertContains('Lokasi pengambilan foto berada di luar geofence pelanggan.', $media->anomaly_reasons);
    }

    /**
     * Tes 5: Foto lebih besar dari 1 MB ditolak oleh server (HTTP 422).
     */
    public function test_photo_larger_than_1mb_is_rejected(): void
    {
        $task = $this->createPsbTask();
        $this->checkInUser($this->techA1);

        // Buat file fiktif berukuran 1.2 MB (1250 KB)
        $largeContent = str_repeat('A', 1250 * 1024);
        $file = UploadedFile::fake()->createWithContent('large_photo.jpg', $largeContent);

        $response = $this->actingAs($this->techA1)
            ->postJson("/api/field/tickets/psb/{$task->id}/phase-2-attendance", [
                'latitude' => -6.200000,
                'longitude' => 106.816666,
                'selfie' => $file,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['photo']);
    }

    /**
     * Tes 6: Foto dengan hash SHA-256 duplikat ditandai sebagai anomali.
     */
    public function test_duplicate_photo_hash_is_flagged_as_anomaly(): void
    {
        $mediaService = app(MediaService::class);
        $task = $this->createPsbTask();

        $photoContent = 'binary-photo-content-original-'.uniqid();

        // Unggah pertama kali -> Bersih (bukan anomali hash)
        $media1 = $mediaService->storeMedia($photoContent, $task, 'before', [], $this->techA1);
        $this->assertFalse($media1->is_anomaly);

        // Unggah kedua kali dengan konten identik persis -> Ditandai anomali duplikat!
        $media2 = $mediaService->storeMedia($photoContent, $task, 'after', [], $this->techA1);
        $this->assertTrue($media2->is_anomaly);
        $this->assertContains('Foto duplikat terdeteksi (hash SHA-256 identik dengan berkas lain).', $media2->anomaly_reasons);
    }

    /**
     * Tes 7: Admin dapat membebaskan teknisi dari Fase 2 dengan alasan wajib dan menyelesaikan tiket.
     */
    public function test_admin_can_waive_phase2_requirement_with_mandatory_reason(): void
    {
        $task = $this->createPsbTask();

        // Kunci Tech 1 dan Tech 2
        Phase2Requirement::create([
            'assignable_type' => Task::class,
            'assignable_id' => $task->id,
            'user_id' => $this->techA1->id,
            'required_at' => now(),
            'completed_at' => now(), // Tech 1 sudah absen
        ]);

        $req2 = Phase2Requirement::create([
            'assignable_type' => Task::class,
            'assignable_id' => $task->id,
            'user_id' => $this->techA2->id,
            'required_at' => now(),
            'completed_at' => null, // Tech 2 belum absen
        ]);

        // Cek tiket belum selesai
        $this->assertNotEquals(TaskStatus::COMPLETED, $task->fresh()->status);

        // Admin membebaskan Tech 2
        $response = $this->actingAs($this->admin)->postJson("/api/admin/tickets/psb/{$task->id}/phase2/waive", [
            'user_id' => $this->techA2->id,
            'reason' => 'Teknisi dialihkan mendadak ke perbaikan backbone darurat',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verifikasi requirement telah dibebaskan
        $freshReq = $req2->fresh();
        $this->assertEquals($this->admin->id, $freshReq->waived_by_id);
        $this->assertEquals('Teknisi dialihkan mendadak ke perbaikan backbone darurat', $freshReq->waive_reason);

        // Tiket langsung selesai penuh!
        $this->assertEquals(TaskStatus::COMPLETED, $task->fresh()->status);
    }

    /**
     * Tes 8: Migrasi data lama complaint_attendances & task_completion_evidences ke ticket_attendances dan media tanpa hash.
     */
    public function test_legacy_data_migration_migrates_attendances_and_media_without_hash(): void
    {
        $complaint = $this->createComplaint('CMP-LEGACY-01');

        // Insert manual ke complaint_attendances
        DB::table('complaint_attendances')->insert([
            'complaint_id' => $complaint->id,
            'user_id' => $this->techA1->id,
            'selfie_photo_path' => 'complaints/selfie_old_1.jpg',
            'latitude' => -6.210000,
            'longitude' => 106.820000,
            'accuracy' => 12.00,
            'distance_meters' => 45.00,
            'is_within_radius' => true,
            'clocked_at' => now()->subDays(5),
            'created_at' => now()->subDays(5),
            'updated_at' => now()->subDays(5),
        ]);

        // Jalankan migrasi data
        $migration = new User; // instance dummy
        $migrationFile = require database_path('migrations/2026_10_24_000018_migrate_legacy_attendances_and_evidences_to_ticket_attendances.php');
        $migrationFile->up();

        // Verifikasi ada di ticket_attendances
        $ticketAtt = TicketAttendance::where('attendable_type', 'App\Models\Complaint')
            ->where('attendable_id', $complaint->id)
            ->where('user_id', $this->techA1->id)
            ->first();

        $this->assertNotNull($ticketAtt);
        $this->assertEquals('inside', $ticketAtt->geofence_status);
        $this->assertNotNull($ticketAtt->selfie_media_id);

        // Verifikasi media tersimpan tanpa hash (null)
        $media = Media::find($ticketAtt->selfie_media_id);
        $this->assertNotNull($media);
        $this->assertNull($media->sha256);
        $this->assertEquals('complaints/selfie_old_1.jpg', $media->path);
    }
}
