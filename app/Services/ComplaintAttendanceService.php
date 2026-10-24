<?php

namespace App\Services;

use App\Enums\ComplaintStatus;
use App\Events\ComplaintResolved;
use App\Events\ComplaintStatusUpdated;
use App\Models\Complaint;
use App\Models\ComplaintAttendance;
use App\Models\ComplaintLog;
use App\Models\Phase2Requirement;
use App\Models\TicketAttendance;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ComplaintAttendanceService
{
    public function __construct(
        private FileUploadService $fileUploadService
    ) {}

    /**
     * Submit absensi mandiri teknisi (Fase 2) dengan foto selfie & geotag.
     */
    public function submitAttendance(
        Complaint $complaint,
        User $technician,
        array $data,
        UploadedFile $selfiePhoto
    ): ComplaintAttendance {
        $path = $this->fileUploadService->uploadFile($selfiePhoto, "complaints/{$complaint->id}/attendances");
        if (! $path) {
            throw new \RuntimeException('Gagal mengunggah foto selfie absensi.');
        }

        $photoUrl = $this->fileUploadService->getFileUrl($path);

        // Hitung jarak Geofence jika koordinat pelanggan tersedia
        $distance = null;
        $isWithinRadius = true;

        if ($complaint->customer_lat && $complaint->customer_lng) {
            $distance = $this->calculateDistance(
                (float) $data['latitude'],
                (float) $data['longitude'],
                (float) $complaint->customer_lat,
                (float) $complaint->customer_lng
            );
            $isWithinRadius = $distance <= 500; // Toleransi radius 500 meter
        }

        return DB::transaction(function () use ($complaint, $technician, $data, $photoUrl, $distance, $isWithinRadius) {
            $attendance = ComplaintAttendance::updateOrCreate(
                [
                    'complaint_id' => $complaint->id,
                    'user_id' => $technician->id,
                ],
                [
                    'selfie_photo_path' => $photoUrl,
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'accuracy' => $data['accuracy'] ?? null,
                    'distance_meters' => $distance,
                    'is_within_radius' => $isWithinRadius,
                ]
            );

            TicketAttendance::updateOrCreate(
                [
                    'attendable_type' => Complaint::class,
                    'attendable_id' => $complaint->id,
                    'user_id' => $technician->id,
                ],
                [
                    'lat' => $data['latitude'],
                    'lng' => $data['longitude'],
                    'accuracy' => $data['accuracy'] ?? null,
                    'distance_meters' => $distance,
                    'geofence_status' => $isWithinRadius ? 'inside' : 'outside',
                    'captured_at' => now(),
                    'received_at' => now(),
                ]
            );

            Phase2Requirement::where('assignable_type', Complaint::class)
                ->where('assignable_id', $complaint->id)
                ->where('user_id', $technician->id)
                ->update(['completed_at' => now()]);

            // Log absensi individu
            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $complaint->status->value,
                'to_status' => $complaint->status->value,
                'action' => 'attendance_recorded',
                'actor_id' => $technician->id,
                'actor_role' => 'Teknisi',
                'notes' => "Teknisi {$technician->name} berhasil absensi Fase 2 (GPS: {$data['latitude']}, {$data['longitude']}).",
            ]);

            // Cek apakah Fase 1 sudah selesai dan SEMUA anggota tim sudah absen
            $isPhase1Done = (bool) ($complaint->phase_1_completed_at || $complaint->evidence);
            $allAttended = $complaint->allTeamMembersAttended();

            if ($isPhase1Done && $allAttended) {
                $fromStatus = $complaint->status->value;

                $complaint->update([
                    'phase_2_completed_at' => now(),
                    'status' => ComplaintStatus::RESOLVED,
                    'resolved_at' => now(),
                ]);

                $assignment = $complaint->currentAssignment;
                if ($assignment) {
                    $assignment->update([
                        'status' => 'resolved',
                        'resolved_at' => now(),
                    ]);
                }

                ComplaintLog::create([
                    'complaint_id' => $complaint->id,
                    'from_status' => $fromStatus,
                    'to_status' => ComplaintStatus::RESOLVED->value,
                    'action' => 'resolved',
                    'actor_id' => $technician->id,
                    'actor_role' => 'Teknisi',
                    'notes' => 'Seluruh anggota tim telah menyelesaikan absensi. Tiket pengaduan berstatus RESOLVED dan menunggu verifikasi Admin.',
                ]);

                if ($complaint->evidence) {
                    event(new ComplaintResolved($complaint, $complaint->evidence));
                }
                event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::RESOLVED->value, 'Fase 1 dan 2 selesai'));
            }

            return $attendance;
        });
    }

    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meter
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
