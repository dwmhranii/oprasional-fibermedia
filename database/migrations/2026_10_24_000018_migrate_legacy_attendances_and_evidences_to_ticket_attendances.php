<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Migrasi dari complaint_attendances ke ticket_attendances & media
        if (Schema::hasTable('complaint_attendances')) {
            $complaintAttendances = DB::table('complaint_attendances')->get();
            foreach ($complaintAttendances as $ca) {
                // Buat entri media untuk foto selfie lama jika ada
                $mediaId = null;
                if (! empty($ca->selfie_photo_path)) {
                    $mediaId = DB::table('media')->insertGetId([
                        'mediable_type' => 'App\\Models\\Complaint',
                        'mediable_id' => $ca->complaint_id,
                        'kind' => 'selfie',
                        'disk' => 'private',
                        'path' => $ca->selfie_photo_path,
                        'sha256' => null, // Data lama tanpa hash
                        'size' => 0,
                        'mime' => 'image/jpeg',
                        'captured_at' => $ca->clocked_at ?? $ca->created_at ?? now(),
                        'received_at' => $ca->created_at ?? $ca->clocked_at ?? now(),
                        'lat' => $ca->latitude,
                        'lng' => $ca->longitude,
                        'accuracy' => $ca->accuracy,
                        'uploaded_by_id' => $ca->user_id,
                        'created_at' => $ca->created_at ?? now(),
                        'updated_at' => $ca->updated_at ?? now(),
                    ]);
                }

                // Cek apakah sudah ada di ticket_attendances
                $exists = DB::table('ticket_attendances')
                    ->where('attendable_type', 'App\\Models\\Complaint')
                    ->where('attendable_id', $ca->complaint_id)
                    ->where('user_id', $ca->user_id)
                    ->exists();

                if (! $exists) {
                    DB::table('ticket_attendances')->insert([
                        'attendable_type' => 'App\\Models\\Complaint',
                        'attendable_id' => $ca->complaint_id,
                        'user_id' => $ca->user_id,
                        'selfie_media_id' => $mediaId,
                        'lat' => $ca->latitude,
                        'lng' => $ca->longitude,
                        'accuracy' => $ca->accuracy,
                        'distance_meters' => $ca->distance_meters,
                        'geofence_status' => ($ca->is_within_radius ?? true) ? 'inside' : 'outside',
                        'captured_at' => $ca->clocked_at ?? $ca->created_at ?? now(),
                        'received_at' => $ca->created_at ?? $ca->clocked_at ?? now(),
                        'created_at' => $ca->created_at ?? now(),
                        'updated_at' => $ca->updated_at ?? now(),
                    ]);
                }
            }
        }

        // 2. Migrasi foto absen PSB dari task_completion_evidences
        if (Schema::hasTable('task_completion_evidences') && Schema::hasTable('task_assignments')) {
            $psbAttendances = DB::table('task_completion_evidences')
                ->join('task_assignments', 'task_completion_evidences.task_assignment_id', '=', 'task_assignments.id')
                ->whereNotNull('task_completion_evidences.attendance_photo_path')
                ->select(
                    'task_assignments.task_id',
                    'task_assignments.user_id',
                    'task_completion_evidences.attendance_photo_path',
                    'task_completion_evidences.latitude',
                    'task_completion_evidences.longitude',
                    'task_completion_evidences.accuracy',
                    'task_completion_evidences.submitted_at',
                    'task_completion_evidences.created_at',
                    'task_completion_evidences.updated_at'
                )
                ->get();

            foreach ($psbAttendances as $pa) {
                $mediaId = DB::table('media')->insertGetId([
                    'mediable_type' => 'App\\Models\\Task',
                    'mediable_id' => $pa->task_id,
                    'kind' => 'selfie',
                    'disk' => 'private',
                    'path' => $pa->attendance_photo_path,
                    'sha256' => null, // Data lama tanpa hash
                    'size' => 0,
                    'mime' => 'image/jpeg',
                    'captured_at' => $pa->submitted_at ?? $pa->created_at ?? now(),
                    'received_at' => $pa->created_at ?? $pa->submitted_at ?? now(),
                    'lat' => $pa->latitude,
                    'lng' => $pa->longitude,
                    'accuracy' => $pa->accuracy,
                    'uploaded_by_id' => $pa->user_id,
                    'created_at' => $pa->created_at ?? now(),
                    'updated_at' => $pa->updated_at ?? now(),
                ]);

                $exists = DB::table('ticket_attendances')
                    ->where('attendable_type', 'App\\Models\\Task')
                    ->where('attendable_id', $pa->task_id)
                    ->where('user_id', $pa->user_id)
                    ->exists();

                if (! $exists) {
                    DB::table('ticket_attendances')->insert([
                        'attendable_type' => 'App\\Models\\Task',
                        'attendable_id' => $pa->task_id,
                        'user_id' => $pa->user_id,
                        'selfie_media_id' => $mediaId,
                        'lat' => $pa->latitude ?? 0,
                        'lng' => $pa->longitude ?? 0,
                        'accuracy' => $pa->accuracy,
                        'distance_meters' => null,
                        'geofence_status' => 'unverified',
                        'captured_at' => $pa->submitted_at ?? $pa->created_at ?? now(),
                        'received_at' => $pa->created_at ?? $pa->submitted_at ?? now(),
                        'created_at' => $pa->created_at ?? now(),
                        'updated_at' => $pa->updated_at ?? now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Reversible without dropping source tables
    }
};
