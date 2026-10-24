<?php

namespace App\Services;

use App\Enums\ComplaintStatus;
use App\Events\ComplaintResolved;
use App\Events\ComplaintStatusUpdated;
use App\Models\Complaint;
use App\Models\ComplaintAssignment;
use App\Models\ComplaintEvidence;
use App\Models\ComplaintLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ComplaintEvidenceService
{
    public function __construct(
        private FileUploadService $fileUploadService
    ) {}

    /**
     * Teknisi submit hasil pengerjaan dengan minimal 1 foto bukti fisik.
     */
    public function submitEvidence(
        Complaint $complaint,
        ComplaintAssignment $assignment,
        array $data,
        array $photos,
        User $technician
    ): ComplaintEvidence {
        if (empty($photos)) {
            throw new \DomainException('Minimal 1 foto bukti pengerjaan wajib diunggah.');
        }

        if (! $complaint->canTransitionTo(ComplaintStatus::PHASE_1_COMPLETED) && ! $complaint->canTransitionTo(ComplaintStatus::RESOLVED)) {
            throw new \DomainException("Tiket dengan status '{$complaint->status->value}' tidak dapat diselesaikan.");
        }

        // Upload semua foto menggunakan FileUploadService yang sudah ada
        $uploadedPaths = [];
        $directory = "complaints/{$complaint->id}/evidence";

        foreach ($photos as $photo) {
            $path = $this->fileUploadService->uploadFile($photo, $directory);
            if ($path) {
                $uploadedPaths[] = $this->fileUploadService->getFileUrl($path);
            }
        }

        if (empty($uploadedPaths)) {
            throw new \RuntimeException('Gagal menyimpan file foto bukti. Silakan coba lagi.');
        }

        return DB::transaction(function () use ($complaint, $assignment, $data, $uploadedPaths, $technician) {
            $fromStatus = $complaint->status->value;

            $evidence = ComplaintEvidence::create([
                'complaint_id' => $complaint->id,
                'assignment_id' => $assignment->id,
                'photos' => $uploadedPaths,
                'description' => $data['description'],
                'resolution_category' => $data['resolution_category'],
                'opm_redaman' => $data['opm_redaman'] ?? null,
                'submitted_at' => now(),
            ]);

            // Cek apakah seluruh anggota tim sudah melakukan absensi (Fase 2)
            $allAttended = $complaint->allTeamMembersAttended();

            if ($allAttended) {
                // Jika absensi sudah lengkap, langsung status RESOLVED
                $complaint->update([
                    'status' => ComplaintStatus::RESOLVED,
                    'resolution_category' => $data['resolution_category'],
                    'phase_1_completed_at' => now(),
                    'resolved_at' => now(),
                ]);

                $assignment->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                ]);

                ComplaintLog::create([
                    'complaint_id' => $complaint->id,
                    'from_status' => $fromStatus,
                    'to_status' => ComplaintStatus::RESOLVED->value,
                    'action' => 'resolved',
                    'actor_id' => $technician->id,
                    'actor_role' => 'Teknisi',
                    'notes' => $data['description'].' (Fase 1 teknis & Fase 2 absensi lengkap)',
                ]);

                event(new ComplaintResolved($complaint, $evidence));
                event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::RESOLVED->value, $data['description']));
            } else {
                // Jika ada anggota tim yang belum absen, status menjadi PHASE_1_COMPLETED
                $complaint->update([
                    'status' => ComplaintStatus::PHASE_1_COMPLETED,
                    'resolution_category' => $data['resolution_category'],
                    'phase_1_completed_at' => now(),
                ]);

                ComplaintLog::create([
                    'complaint_id' => $complaint->id,
                    'from_status' => $fromStatus,
                    'to_status' => ComplaintStatus::PHASE_1_COMPLETED->value,
                    'action' => 'phase_1_submitted',
                    'actor_id' => $technician->id,
                    'actor_role' => 'Teknisi',
                    'notes' => 'Fase 1 (penyelesaian teknis) selesai. Menunggu seluruh anggota tim melakukan absensi mandiri.',
                ]);

                event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::PHASE_1_COMPLETED->value, $data['description']));
            }

            return $evidence;
        });
    }
}
