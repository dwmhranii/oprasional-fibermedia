<?php

namespace App\Services;

use App\Enums\ComplaintStatus;
use App\Events\ComplaintReturned;
use App\Events\ComplaintStatusUpdated;
use App\Models\Complaint;
use App\Models\ComplaintLog;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ComplaintService
{
    public function __construct(
        private ComplaintTicketNumberService $ticketNumberService,
        private ComplaintSlaService $slaService,
        private FileUploadService $fileUploadService
    ) {}

    /**
     * Buat tiket pengaduan baru (Status: OPEN).
     * Tanpa pengiriman konfirmasi WhatsApp ke pelanggan.
     */
    public function create(array $data, User $createdBy): Complaint
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $uploadedAttachments = [];
            if (! empty($data['attachments']) && is_array($data['attachments'])) {
                foreach ($data['attachments'] as $file) {
                    if ($file instanceof UploadedFile) {
                        $path = $this->fileUploadService->uploadFile($file, 'complaint-attachments');
                        if ($path) {
                            $uploadedAttachments[] = $path;
                        }
                    }
                }
            }
            $data['attachments'] = $uploadedAttachments;
            $customer = null;
            if (! empty($data['customer_code'])) {
                $customer = Customer::where('customer_code', $data['customer_code'])->first();
            }

            $complaint = Complaint::create([
                ...$data,
                'ticket_number' => $this->ticketNumberService->generate(),
                'created_by_id' => $createdBy->id,
                'customer_id' => $customer?->id,
                'status' => ComplaintStatus::OPEN,
            ]);

            // Set SLA Target timers
            $this->slaService->setTimers($complaint);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => null,
                'to_status' => ComplaintStatus::OPEN->value,
                'action' => 'created',
                'actor_id' => $createdBy->id,
                'actor_role' => $createdBy->getRoleNames()->first() ?? 'Admin',
                'notes' => 'Tiket pengaduan dibuat.',
            ]);

            event(new ComplaintStatusUpdated($complaint, 'none', ComplaintStatus::OPEN->value));

            return $complaint;
        });
    }

    /**
     * Selesai Remote: Admin/SA menyelesaikan kendala konfigurasi/billing tanpa teknisi.
     */
    public function resolveRemote(Complaint $complaint, array $data, User $actor): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::CLOSED);

        return DB::transaction(function () use ($complaint, $data, $actor) {
            $fromStatus = $complaint->status->value;

            $complaint->update([
                'status' => ComplaintStatus::CLOSED,
                'resolution_type' => 'remote',
                'resolution_category' => $data['resolution_category'],
                'status_reason' => $data['notes'] ?? 'Diselesaikan secara remote oleh Admin',
                'closed_at' => now(),
                'verified_by_id' => $actor->id,
                'verified_at' => now(),
                'verified_notes' => $data['notes'] ?? null,
            ]);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::CLOSED->value,
                'action' => 'resolve_remote',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'Admin',
                'notes' => $data['notes'] ?? null,
            ]);

            $this->slaService->resolveBreach($complaint);

            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::CLOSED->value, $data['notes'] ?? null));

            return $complaint;
        });
    }

    /**
     * Verifikasi Bukti Teknisi & Tutup Tiket (Status: CLOSED).
     */
    public function verifyAndClose(Complaint $complaint, array $data, User $actor): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::CLOSED);

        // Pastikan teknisi sudah upload evidence
        if (! $complaint->evidence) {
            throw new \DomainException('Tiket tidak dapat ditutup sebelum teknisi mengunggah bukti pengerjaan.');
        }

        return DB::transaction(function () use ($complaint, $data, $actor) {
            $fromStatus = $complaint->status->value;

            $complaint->update([
                'status' => ComplaintStatus::CLOSED,
                'resolution_type' => 'onsite',
                'verified_by_id' => $actor->id,
                'verified_at' => now(),
                'verified_notes' => $data['notes'] ?? 'Bukti fisik telah diverifikasi oleh '.$actor->name,
                'closed_at' => now(),
            ]);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::CLOSED->value,
                'action' => 'verified_close',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'Admin',
                'notes' => $data['notes'] ?? null,
            ]);

            $this->slaService->resolveBreach($complaint);

            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::CLOSED->value, $data['notes'] ?? null));

            return $complaint;
        });
    }

    /**
     * Kembalikan tiket ke teknisi (Status kembali: IN_PROGRESS).
     */
    public function returnToTechnician(Complaint $complaint, string $reason, User $actor): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::IN_PROGRESS);

        return DB::transaction(function () use ($complaint, $reason, $actor) {
            $fromStatus = $complaint->status->value;

            $assignment = $complaint->currentAssignment;
            if ($assignment) {
                $assignment->update([
                    'status' => 'returned',
                    'returned_at' => now(),
                    'return_reason' => $reason,
                ]);
            }

            $complaint->update([
                'status' => ComplaintStatus::IN_PROGRESS,
                'status_reason' => $reason,
            ]);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::IN_PROGRESS->value,
                'action' => 'returned',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'Admin',
                'notes' => $reason,
            ]);

            event(new ComplaintReturned($complaint, $reason));
            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::IN_PROGRESS->value, $reason));

            return $complaint;
        });
    }

    /**
     * Batalkan tiket (Status: CANCELLED).
     */
    public function cancel(Complaint $complaint, string $reason, User $actor): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::CANCELLED);

        return DB::transaction(function () use ($complaint, $reason, $actor) {
            $fromStatus = $complaint->status->value;

            $complaint->update([
                'status' => ComplaintStatus::CANCELLED,
                'status_reason' => $reason,
            ]);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::CANCELLED->value,
                'action' => 'cancelled',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'Admin',
                'notes' => $reason,
            ]);

            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::CANCELLED->value, $reason));

            return $complaint;
        });
    }

    /**
     * Buka kembali tiket (Status: REOPENED, maksimal 3 x 24 jam sejak selesai sesuai PRD Final v1.2).
     */
    public function reopen(Complaint $complaint, string $reason, User $actor, array $extra = []): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::REOPENED);

        $doneAt = $complaint->closed_at ?? $complaint->resolved_at;
        if ($doneAt && $doneAt->diffInHours(now()) > 72) {
            throw new \DomainException('Tiket hanya dapat dibuka kembali maksimal 3 x 24 jam setelah selesai. Silakan buat tiket pengaduan baru.');
        }

        return DB::transaction(function () use ($complaint, $reason, $actor, $extra) {
            $fromStatus = $complaint->status->value;

            $updateData = [
                'status' => ComplaintStatus::REOPENED,
                'status_reason' => $reason,
                'reopened_at' => now(),
                'reopened_by_id' => $actor->id,
                'reopen_count' => ($complaint->reopen_count ?? 0) + 1,
                'is_sla_breached' => false,
            ];

            if (! empty($extra['priority'])) {
                $updateData['priority'] = $extra['priority'];
            }
            if (! empty($extra['complaint_type_id'])) {
                $updateData['complaint_type_id'] = $extra['complaint_type_id'];
            }

            $complaint->update($updateData);

            // PRD Final v1.2: Saat reopen, SLA dihitung ulang dari awal memakai prioritas/jenis gangguan terbaru
            $this->slaService->resetTimersForReopen($complaint);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::REOPENED->value,
                'action' => 'reopened',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'Admin',
                'notes' => $reason,
            ]);

            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::REOPENED->value, $reason));

            return $complaint;
        });
    }

    /**
     * Jeda tiket / menunggu pelanggan (Status: PENDING_CUSTOMER, SLA dijeda).
     * Mendukung 5 alasan baku PRD Final v1.2.
     */
    public function pauseForCustomer(Complaint $complaint, string $reason, User $actor, array $extra = []): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::PENDING_CUSTOMER);

        return DB::transaction(function () use ($complaint, $reason, $actor, $extra) {
            $fromStatus = $complaint->status->value;

            $updateData = [
                'status' => ComplaintStatus::PENDING_CUSTOMER,
                'status_reason' => $reason,
                'sla_paused_at' => now(),
            ];

            if (! empty($extra['pause_reason_id'])) {
                $updateData['pause_reason_id'] = $extra['pause_reason_id'];
            }
            if (! empty($extra['pause_photo_path'])) {
                $updateData['pause_photo_path'] = $extra['pause_photo_path'];
            }
            if (isset($extra['pause_lat'])) {
                $updateData['pause_lat'] = $extra['pause_lat'];
            }
            if (isset($extra['pause_lng'])) {
                $updateData['pause_lng'] = $extra['pause_lng'];
            }

            $complaint->update($updateData);

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::PENDING_CUSTOMER->value,
                'action' => 'pending_customer',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'User',
                'notes' => $reason,
            ]);

            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::PENDING_CUSTOMER->value, $reason));

            return $complaint;
        });
    }

    /**
     * Melanjutkan dari status pending pelanggan (Status: IN_PROGRESS, SLA dilanjutkan).
     */
    public function resumeFromPending(Complaint $complaint, User $actor): Complaint
    {
        $this->assertCanTransitionTo($complaint, ComplaintStatus::IN_PROGRESS);

        return DB::transaction(function () use ($complaint, $actor) {
            $fromStatus = $complaint->status->value;

            if ($complaint->sla_paused_at) {
                $operatingHoursSvc = app(\App\Services\SlaOperatingHoursService::class);
                $pausedOperatingMinutes = $operatingHoursSvc->getOperatingMinutesBetween($complaint->sla_paused_at, now());

                if ($complaint->sla_resolve_due_at && $pausedOperatingMinutes > 0) {
                    $complaint->sla_resolve_due_at = $operatingHoursSvc->addOperatingMinutes(
                        $complaint->sla_resolve_due_at,
                        $pausedOperatingMinutes
                    );
                }

                if ($complaint->response_deadline_at && ! $complaint->accepted_at && $pausedOperatingMinutes > 0) {
                    $complaint->response_deadline_at = $operatingHoursSvc->addOperatingMinutes(
                        $complaint->response_deadline_at,
                        $pausedOperatingMinutes
                    );
                }

                $pausedSeconds = now()->diffInSeconds($complaint->sla_paused_at);
                $complaint->sla_paused_seconds = ($complaint->sla_paused_seconds ?? 0) + $pausedSeconds;
                $complaint->sla_paused_at = null;
            }

            $complaint->status = ComplaintStatus::IN_PROGRESS;
            $complaint->save();

            ComplaintLog::create([
                'complaint_id' => $complaint->id,
                'from_status' => $fromStatus,
                'to_status' => ComplaintStatus::IN_PROGRESS->value,
                'action' => 'resumed',
                'actor_id' => $actor->id,
                'actor_role' => $actor->getRoleNames()->first() ?? 'User',
                'notes' => 'Pelanggan merespons / kendala dilanjutkan.',
            ]);

            event(new ComplaintStatusUpdated($complaint, $fromStatus, ComplaintStatus::IN_PROGRESS->value));

            return $complaint;
        });
    }

    private function assertCanTransitionTo(Complaint $complaint, ComplaintStatus $newStatus): void
    {
        if (! $complaint->canTransitionTo($newStatus)) {
            throw new \DomainException("Transisi status dari '{$complaint->status->value}' ke '{$newStatus->value}' tidak diizinkan.");
        }
    }
}
