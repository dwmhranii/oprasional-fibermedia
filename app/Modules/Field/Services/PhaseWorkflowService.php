<?php

namespace App\Modules\Field\Services;

use App\Enums\ComplaintStatus;
use App\Enums\ProvisioningStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Events\ComplaintResolved;
use App\Events\ComplaintStatusUpdated;
use App\Events\Phase1Submitted;
use App\Events\TaskCompleted;
use App\Models\Complaint;
use App\Models\ComplaintEvidence;
use App\Models\ComplaintLog;
use App\Models\Customer;
use App\Models\DailyAttendance;
use App\Models\Media;
use App\Models\Odp;
use App\Models\Phase2Requirement;
use App\Models\Task;
use App\Models\Team;
use App\Models\TicketAttendance;
use App\Models\User;
use App\Notifications\TaskReworkNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PhaseWorkflowService
{
    public function __construct(
        protected GeofenceService $geofenceService,
        protected MediaService $mediaService
    ) {}

    /**
     * Kunci daftar teknisi wajib Fase 2 saat Fase 1 dikirim (Aturan 5 & 6).
     * Fase 1 dikerjakan bersama: siapa pun anggota yang hadir boleh submit.
     * Saat Fase 1 disubmit, seluruh anggota tim yang HADIR hari itu dikunci ke phase2_requirements.
     *
     * @param  mixed  $ticket  Task atau Complaint
     * @return Phase2Requirement[]
     */
    public function lockPhase2Requirements($ticket, ?User $submitterUser = null): array
    {
        $submitterUser = $submitterUser ?? auth()->user();
        $today = Carbon::today()->toDateString();
        $team = $ticket->assignedTeam ?? null;

        if (! $team && ! empty($ticket->assigned_team_id)) {
            $team = Team::find($ticket->assigned_team_id);
        }
        if (! $team && ! empty($ticket->assigned_team)) {
            $team = Team::where('name', $ticket->assigned_team)->first();
        }

        // Ambil ID semua anggota tim
        $teamUserIds = [];
        if ($team) {
            $teamUserIds = $team->activeUsers()->pluck('users.id')->toArray();
        }

        if (empty($teamUserIds) && $submitterUser) {
            $teamUserIds = [$submitterUser->id];
        }

        // Cari siapa saja anggota tim yang HADIR hari ini (DailyAttendance hadir, check_in_at NOT NULL, check_out_at NULL)
        $presentUserIds = DailyAttendance::whereIn('user_id', $teamUserIds)
            ->whereDate('work_date', $today)
            ->where('status', 'hadir')
            ->whereNotNull('check_in_at')
            ->whereNull('check_out_at')
            ->pluck('user_id')
            ->toArray();

        // Jika belum ada record absensi tercatat (misal testing/darurat), gunakan submitter atau teamUserIds
        if (empty($presentUserIds)) {
            $presentUserIds = ($submitterUser && in_array($submitterUser->id, $teamUserIds))
                ? [$submitterUser->id]
                : $teamUserIds;
        }

        $locked = [];
        foreach ($presentUserIds as $userId) {
            $locked[] = Phase2Requirement::firstOrCreate([
                'assignable_type' => get_class($ticket),
                'assignable_id' => $ticket->id,
                'user_id' => $userId,
            ], [
                'required_at' => now(),
            ]);
        }

        if ($submitterUser) {
            DB::table('ticket_events')->insert([
                'eventable_type' => get_class($ticket),
                'eventable_id' => $ticket->id,
                'actor_id' => $submitterUser->id,
                'event' => 'phase2_locked',
                'from_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'to_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'payload' => json_encode([
                    'locked_user_ids' => $presentUserIds,
                    'submitter_id' => $submitterUser->id,
                ]),
                'occurred_at' => now(),
            ]);
        }

        return $locked;
    }

    /**
     * Submit Fase 1 bukti pengerjaan teknis di lapangan (dikerjakan bersama).
     * Foto sebelum/sesudah, tanda tangan, data teknis (ODP, port, ONU index, redaman).
     * Siapa pun anggota yang hadir boleh submit.
     *
     * @param  mixed  $ticket  Task atau Complaint
     */
    public function submitPhase1($ticket, User $submitter, array $data): array
    {
        return DB::transaction(function () use ($ticket, $submitter, $data) {
            $metadata = [
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'accuracy' => $data['accuracy'] ?? null,
                'captured_at' => $data['captured_at'] ?? now(),
                'device_id' => $data['device_id'] ?? null,
            ];

            // 1. Simpan Foto Sebelum
            $beforeMedia = null;
            if (! empty($data['photo_before'])) {
                $beforeMedia = $this->mediaService->storeMedia(
                    $data['photo_before'],
                    $ticket,
                    'before',
                    $metadata,
                    $submitter
                );
            }

            // 2. Simpan Foto Sesudah
            $afterMedia = null;
            if (! empty($data['photo_after'])) {
                $afterMedia = $this->mediaService->storeMedia(
                    $data['photo_after'],
                    $ticket,
                    'after',
                    $metadata,
                    $submitter
                );
            }

            // 3. Simpan Tanda Tangan
            $signatureMedia = null;
            if (! empty($data['signature'])) {
                $signatureMedia = $this->mediaService->storeMedia(
                    $data['signature'],
                    $ticket,
                    'signature',
                    $metadata,
                    $submitter
                );
            }

            // 4. Update data teknis pada model
            if ($ticket instanceof Task) {
                $photos = $ticket->photos ?? [];
                if ($beforeMedia) {
                    $photos['before'] = $beforeMedia->path;
                }
                if ($afterMedia) {
                    $photos['after'] = $afterMedia->path;
                }

                $ticket->photos = $photos;
                if ($signatureMedia) {
                    $ticket->customer_signature_path = $signatureMedia->path;
                    $ticket->signature_uploaded_at = now();
                    $ticket->signature_uploaded_by = $submitter->id;
                }
                $ticket->phase_1_submitted_at = now();
                $ticket->status = TaskStatus::PHASE_1_SUBMITTED;
                $ticket->save();

                // Simpan data teknis ke task dan provisioning
                $techNotes = [];
                if (! empty($data['odp'])) {
                    $techNotes[] = 'ODP: '.$data['odp'];
                }
                if (! empty($data['port'])) {
                    $techNotes[] = 'Port: '.$data['port'];
                }
                if (! empty($data['onu_index'])) {
                    $techNotes[] = 'ONU: '.$data['onu_index'];
                }
                if (! empty($data['redaman'])) {
                    $techNotes[] = 'Redaman: '.$data['redaman'];
                }
                if (! empty($data['notes'])) {
                    $techNotes[] = 'Catatan: '.$data['notes'];
                }
                if (! empty($techNotes)) {
                    $ticket->completion_notes = implode(' | ', $techNotes);
                    $ticket->save();
                }

                if ($ticket->provisioning) {
                    $prov = $ticket->provisioning;
                    if (! empty($techNotes)) {
                        $prov->notes = trim(($prov->notes ?? '')."\n[Data Teknis] ".implode(' | ', $techNotes));
                    }
                    if (Schema::hasColumn('provisionings', 'onu_index') && ! empty($data['onu_index'])) {
                        $prov->onu_index = $data['onu_index'];
                    }
                    if (Schema::hasColumn('provisionings', 'optical_power') && ! empty($data['redaman'])) {
                        $prov->optical_power = $data['redaman'];
                    }
                    $prov->save();

                    // Update pelanggan & ODP port jika ada
                    $cust = $prov->submission?->customer;
                    $odpId = $data['odp_id'] ?? null;
                    if (! $odpId && ! empty($data['odp'])) {
                        $foundOdp = Odp::where('code', $data['odp'])->orWhere('id', $data['odp'])->first();
                        $odpId = $foundOdp?->id;
                    }
                    $odpPort = ! empty($data['port']) ? (int) $data['port'] : null;

                    $portConflict = false;
                    if ($odpId && $odpPort) {
                        $customerId = $cust?->id;
                        $existingUserOnPort = Customer::where('odp_id', $odpId)
                            ->where('odp_port', $odpPort)
                            ->when($customerId, fn ($q) => $q->where('id', '!=', $customerId))
                            ->where('status', '!=', 'terminated')
                            ->exists();

                        if ($existingUserOnPort) {
                            $portConflict = true;
                        }
                    }

                    $ticket->selected_odp_id = $odpId;
                    $ticket->selected_odp_port = $odpPort;
                    $ticket->has_port_conflict = $portConflict;
                    if ($portConflict) {
                        $flags = $ticket->review_flags ?? [];
                        if (! in_array('port_conflict', $flags)) {
                            $flags[] = 'port_conflict';
                        }
                        $ticket->review_flags = $flags;
                        $ticket->review_status = 'needs_review';
                    }
                    $ticket->save();

                    if ($cust) {
                        if (! empty($data['onu_index']) && Schema::hasColumn('customers', 'onu_index')) {
                            $cust->onu_index = $data['onu_index'];
                        }
                        if ($odpPort && Schema::hasColumn('customers', 'odp_port')) {
                            $cust->odp_port = $odpPort;
                        }
                        if ($odpId && Schema::hasColumn('customers', 'odp_id')) {
                            $cust->odp_id = $odpId;
                        }
                        $cust->save();
                    }
                }

                event(new Phase1Submitted($ticket));
            } elseif ($ticket instanceof Complaint) {
                // Simpan bukti ke complaint_evidences jika ada currentAssignment legacy
                if ($ticket->currentAssignment) {
                    ComplaintEvidence::updateOrCreate([
                        'complaint_id' => $ticket->id,
                    ], [
                        'assignment_id' => $ticket->currentAssignment->id,
                        'resolution_category' => $data['resolution_category'] ?? 'cable_broken',
                        'description' => $data['notes'] ?? $data['description'] ?? 'Pengerjaan lapangan selesai.',
                        'photos' => array_values(array_filter([$beforeMedia?->path, $afterMedia?->path])),
                        'submitted_at' => now(),
                    ]);
                }

                if (! empty($data['resolution_category'])) {
                    $ticket->resolution_category = $data['resolution_category'];
                }
                $ticket->phase_1_completed_at = now();
                $ticket->status = ComplaintStatus::PHASE_1_COMPLETED;
                $ticket->save();

                ComplaintLog::create([
                    'complaint_id' => $ticket->id,
                    'from_status' => ComplaintStatus::IN_PROGRESS->value,
                    'to_status' => ComplaintStatus::PHASE_1_COMPLETED->value,
                    'action' => 'phase1_submitted',
                    'actor_id' => $submitter->id,
                    'actor_role' => 'Teknisi',
                    'notes' => 'Fase 1 bukti pengerjaan teknis disubmit oleh '.$submitter->name,
                ]);

                event(new ComplaintStatusUpdated($ticket, ComplaintStatus::IN_PROGRESS->value, ComplaintStatus::PHASE_1_COMPLETED->value));
            }

            // 5. Kunci daftar wajib Fase 2 = anggota tim yang HADIR hari itu
            $lockedRequirements = $this->lockPhase2Requirements($ticket, $submitter);

            return [
                'success' => true,
                'message' => 'Fase 1 berhasil disubmit dan daftar teknisi wajib Fase 2 telah dikunci.',
                'locked_requirements' => $lockedRequirements,
                'before_media' => $beforeMedia,
                'after_media' => $afterMedia,
                'signature_media' => $signatureMedia,
            ];
        });
    }

    /**
     * Catat absensi tiket individu Fase 2 (selfie + GPS di lokasi pelanggan).
     * Geofence HANYA MENANDAI (inside/outside/low_accuracy/unverified), JANGAN MENOLAK.
     * Tiket selesai penuh bila seluruh anggota wajib sudah absen atau dibebaskan admin.
     *
     * @param  mixed  $ticket
     * @param  array  $data  ['latitude', 'longitude', 'accuracy', 'selfie_content', 'device_id', 'target_lat', 'target_lng', 'captured_at']
     */
    public function submitTicketAttendance($ticket, User $user, array $data): TicketAttendance
    {
        return DB::transaction(function () use ($ticket, $user, $data) {
            // 1. Evaluasi Geofence (Hanya menandai status, TIDAK menolak keras!)
            $targetLat = $data['target_lat'] ?? null;
            $targetLng = $data['target_lng'] ?? null;
            $radius = max(50, (float) ($data['radius_meters'] ?? 50));

            $geoResult = $this->geofenceService->evaluate(
                $targetLat,
                $targetLng,
                (float) $data['latitude'],
                (float) $data['longitude'],
                isset($data['accuracy']) ? (float) $data['accuracy'] : null,
                $radius
            );

            // 2. Simpan foto selfie via MediaService (validasi <= 1MB, SHA-256, deteksi anomali)
            $media = null;
            if (! empty($data['selfie_content'])) {
                $media = $this->mediaService->storeMedia(
                    $data['selfie_content'],
                    $ticket,
                    'selfie',
                    [
                        'latitude' => $data['latitude'],
                        'longitude' => $data['longitude'],
                        'accuracy' => $data['accuracy'] ?? null,
                        'captured_at' => $data['captured_at'] ?? now(),
                        'device_id' => $data['device_id'] ?? null,
                        'geofence_status' => $geoResult['status'],
                    ],
                    $user
                );
            }

            // 3. Simpan atau perbarui TicketAttendance
            $attendance = TicketAttendance::updateOrCreate([
                'attendable_type' => get_class($ticket),
                'attendable_id' => $ticket->id,
                'user_id' => $user->id,
            ], [
                'selfie_media_id' => $media?->id,
                'lat' => $data['latitude'],
                'lng' => $data['longitude'],
                'accuracy' => $data['accuracy'] ?? null,
                'distance_meters' => $geoResult['distance_meters'],
                'geofence_status' => $geoResult['status'],
                'captured_at' => $data['captured_at'] ?? now(),
                'received_at' => now(),
                'device_id' => $data['device_id'] ?? null,
            ]);

            // 4. Tandai pemenuhan di phase2_requirements
            Phase2Requirement::where('assignable_type', get_class($ticket))
                ->where('assignable_id', $ticket->id)
                ->where('user_id', $user->id)
                ->update([
                    'completed_at' => now(),
                ]);

            DB::table('ticket_events')->insert([
                'eventable_type' => get_class($ticket),
                'eventable_id' => $ticket->id,
                'actor_id' => $user->id,
                'event' => 'phase2_attendance_submitted',
                'from_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'to_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'payload' => json_encode([
                    'geofence_status' => $geoResult['status'],
                    'distance_meters' => $geoResult['distance_meters'],
                    'is_anomaly' => $media?->is_anomaly ?? false,
                ]),
                'occurred_at' => now(),
            ]);

            // 5. Cek apakah tiket selesai penuh (semua anggota wajib sudah absen atau dibebaskan)
            if ($this->isPhase2FullyCompleted($ticket)) {
                $this->completeTicket($ticket, $user);
            }

            return $attendance;
        });
    }

    /**
     * Admin membebaskan teknisi dari Fase 2 dengan alasan (Aturan 6).
     */
    public function waivePhase2Requirement($ticket, int $userId, User $admin, string $reason): Phase2Requirement
    {
        return DB::transaction(function () use ($ticket, $userId, $admin, $reason) {
            $requirement = Phase2Requirement::where('assignable_type', get_class($ticket))
                ->where('assignable_id', $ticket->id)
                ->where('user_id', $userId)
                ->firstOrFail();

            $requirement->update([
                'waived_by_id' => $admin->id,
                'waive_reason' => $reason,
                'completed_at' => now(),
            ]);

            DB::table('ticket_events')->insert([
                'eventable_type' => get_class($ticket),
                'eventable_id' => $ticket->id,
                'actor_id' => $admin->id,
                'event' => 'phase2_waived',
                'from_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'to_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'payload' => json_encode([
                    'waived_user_id' => $userId,
                    'admin_id' => $admin->id,
                    'reason' => $reason,
                ]),
                'occurred_at' => now(),
            ]);

            // Jika pembebasan ini melengkapi seluruh syarat, selesaikan tiket
            if ($this->isPhase2FullyCompleted($ticket)) {
                $this->completeTicket($ticket, $admin);
            }

            return $requirement;
        });
    }

    /**
     * Cek apakah seluruh persyaratan Fase 2 tiket sudah terpenuhi.
     */
    public function isPhase2FullyCompleted($ticket): bool
    {
        $requirements = Phase2Requirement::where('assignable_type', get_class($ticket))
            ->where('assignable_id', $ticket->id)
            ->get();

        if ($requirements->isEmpty()) {
            // Jika belum ada requirement yang dikunci, cek apakah sudah ada minimal 1 absensi
            return TicketAttendance::where('attendable_type', get_class($ticket))
                ->where('attendable_id', $ticket->id)
                ->exists();
        }

        // Tiket selesai bila SEMUA anggota wajib sudah completed_at atau waived_by_id
        return $requirements->every(fn ($req) => $req->completed_at !== null || $req->waived_by_id !== null);
    }

    /**
     * Selesaikan tiket secara resmi (RESOLVED untuk pengaduan, COMPLETED untuk PSB).
     */
    public function completeTicket($ticket, ?User $actor = null): void
    {
        if ($ticket instanceof Task) {
            $fromStatus = $ticket->status;
            $ticket->status = TaskStatus::COMPLETED;
            $ticket->completed_at = now();
            $ticket->save();

            // Tandai task_assignments selesai
            $ticket->assignments()->update([
                'status' => TaskAssignmentStatus::PHASE_2_COMPLETE,
                'phase_2_submitted_at' => now(),
            ]);

            if ($ticket->provisioning) {
                $ticket->provisioning->update([
                    'status' => ProvisioningStatus::ACTIVE,
                ]);
            }

            event(new TaskCompleted($ticket));
        } elseif ($ticket instanceof Complaint) {
            $fromStatus = $ticket->status->value;
            $ticket->phase_2_completed_at = now();
            $ticket->status = ComplaintStatus::RESOLVED;
            $ticket->resolved_at = now();
            $ticket->save();

            $assignment = $ticket->currentAssignment;
            if ($assignment) {
                $assignment->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                ]);
            }

            ComplaintLog::create([
                'complaint_id' => $ticket->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::RESOLVED->value,
                'action' => 'resolved',
                'actor_id' => $actor?->id ?? auth()->id(),
                'actor_role' => 'System',
                'notes' => 'Seluruh persyaratan Fase 2 telah terpenuhi. Tiket berstatus RESOLVED.',
            ]);

            if ($ticket->evidence) {
                event(new ComplaintResolved($ticket, $ticket->evidence));
            }
            event(new ComplaintStatusUpdated($ticket, $fromStatus, ComplaintStatus::RESOLVED->value, 'Fase 1 dan 2 selesai'));
        }

        // Jalankan evaluasi anomali dan review status
        $this->evaluateReviewFlags($ticket);
    }

    /**
     * Evaluasi seluruh penanda anomali bukti lapangan secara otomatis.
     */
    public function evaluateReviewFlags($ticket): array
    {
        $flags = [];

        // 1. Cek semua Media yang terkait
        $medias = Media::where('mediable_type', get_class($ticket))
            ->where('mediable_id', $ticket->id)
            ->get();

        foreach ($medias as $media) {
            if ($media->is_anomaly) {
                foreach ($media->anomaly_reasons ?? [] as $reason) {
                    if (str_contains($reason, 'duplikat')) {
                        $flags[] = 'duplicate_photo_hash';
                    } elseif (str_contains($reason, 'Selisih jam')) {
                        $flags[] = 'time_skew';
                    } elseif (str_contains($reason, 'Akurasi')) {
                        $flags[] = 'low_gps_accuracy';
                    } elseif (str_contains($reason, 'geofence') || str_contains($reason, 'luar')) {
                        $flags[] = 'outside_geofence';
                    } else {
                        $flags[] = 'media_anomaly';
                    }
                }
            }
        }

        // 2. Cek semua TicketAttendance
        $attendances = TicketAttendance::where('attendable_type', get_class($ticket))
            ->where('attendable_id', $ticket->id)
            ->get();

        foreach ($attendances as $att) {
            if ($att->geofence_status === 'outside') {
                $flags[] = 'outside_geofence';
            }
            if ($att->accuracy !== null && (float) $att->accuracy > 100) {
                $flags[] = 'low_gps_accuracy';
            }
        }

        // 3. Cek Phase2Requirement
        $requirements = Phase2Requirement::where('assignable_type', get_class($ticket))
            ->where('assignable_id', $ticket->id)
            ->get();

        foreach ($requirements as $req) {
            if ($req->completed_at === null && $req->waived_by_id === null) {
                $flags[] = 'missing_phase2_member';
            }
        }

        // 4. Port conflict pada Task
        if ($ticket instanceof Task && $ticket->has_port_conflict) {
            $flags[] = 'port_conflict';
        }

        $uniqueFlags = array_values(array_unique($flags));

        $ticket->review_flags = $uniqueFlags;
        $ticket->review_status = ! empty($uniqueFlags) ? 'needs_review' : 'none';
        $ticket->save();

        if (! empty($uniqueFlags)) {
            DB::table('ticket_events')->insert([
                'eventable_type' => get_class($ticket),
                'eventable_id' => $ticket->id,
                'actor_id' => auth()->id(),
                'event' => 'flagged_for_review',
                'from_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'to_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
                'payload' => json_encode(['review_flags' => $uniqueFlags]),
                'occurred_at' => now(),
            ]);
        }

        return $uniqueFlags;
    }

    /**
     * Setujui hasil pekerjaan tiket oleh Admin.
     */
    public function approveReview($ticket, User $reviewer, ?string $note = null): void
    {
        $ticket->review_status = 'approved';
        $ticket->reviewed_by = $reviewer->id;
        $ticket->reviewed_at = now();
        $ticket->review_note = $note;
        $ticket->save();

        DB::table('ticket_events')->insert([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => $reviewer->id,
            'event' => 'review_approved',
            'from_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
            'to_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
            'payload' => json_encode(['note' => $note]),
            'occurred_at' => now(),
        ]);
    }

    /**
     * Minta ulang pekerjaan tiket (rework). Tiket kembali ke tim dengan status Dikerjakan.
     */
    public function reworkReview($ticket, User $reviewer, string $reason): void
    {
        $ticket->review_status = 'rework';
        $ticket->reviewed_by = $reviewer->id;
        $ticket->reviewed_at = now();
        $ticket->review_note = $reason;

        // Kembalikan status ke in_progress agar tim bisa mengerjakan ulang
        if ($ticket instanceof Task) {
            $ticket->status = TaskStatus::IN_PROGRESS;
        } elseif ($ticket instanceof Complaint) {
            $ticket->status = ComplaintStatus::IN_PROGRESS;
        }
        $ticket->save();

        DB::table('ticket_events')->insert([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => $reviewer->id,
            'event' => 'review_rework_requested',
            'from_status' => 'completed',
            'to_status' => 'in_progress',
            'payload' => json_encode(['reason' => $reason]),
            'occurred_at' => now(),
        ]);

        // Push notifikasi ke anggota tim yang hadir
        $team = $ticket->assignedTeam ?? ($ticket->assigned_team_id ? Team::find($ticket->assigned_team_id) : null);
        if ($team) {
            $ticketNumber = $ticket instanceof Task ? ($ticket->task_number ?? 'PSB-'.$ticket->id) : ($ticket->ticket_number ?? 'CMP-'.$ticket->id);
            foreach ($team->activeUsers as $member) {
                // Notifikasi web push / broadcast
                try {
                    $member->notify(new TaskReworkNotification($ticketNumber, $reason));
                } catch (\Throwable) {
                    // Fail-safe jika notification class belum terbuat
                }
            }
        }
    }

    /**
     * Tandai tiket bermasalah (flagged).
     */
    public function flagReview($ticket, User $reviewer, string $reason): void
    {
        $ticket->review_status = 'flagged';
        $ticket->reviewed_by = $reviewer->id;
        $ticket->reviewed_at = now();
        $ticket->review_note = $reason;
        $ticket->save();

        DB::table('ticket_events')->insert([
            'eventable_type' => get_class($ticket),
            'eventable_id' => $ticket->id,
            'actor_id' => $reviewer->id,
            'event' => 'review_flagged',
            'from_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
            'to_status' => (string) ($ticket->status instanceof \BackedEnum ? $ticket->status->value : $ticket->status),
            'payload' => json_encode(['reason' => $reason]),
            'occurred_at' => now(),
        ]);
    }
}
