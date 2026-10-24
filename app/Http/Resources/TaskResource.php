<?php

namespace App\Http\Resources;

use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $sharedVerificationCompleted = false;
        $sharedVerificationCompletedBy = null;
        $sharedVerificationCompletedAt = null;

        $hasBefore = isset($this->photos['before']);
        $hasAfter = isset($this->photos['after']);
        $hasSignature = (bool) $this->customer_signature_path;
        $legacySignatureAssignment = null;

        if (! $hasBefore && $this->isLegacyWorkflow()) {
            $hasBefore = $this->assignments->contains(function ($assignment) {
                return $assignment->evidence && $assignment->evidence->photo_before;
            });
        }

        if (! $hasAfter && $this->isLegacyWorkflow()) {
            $hasAfter = $this->assignments->contains(function ($assignment) {
                return $assignment->evidence && $assignment->evidence->photo_after;
            });
        }

        if (! $hasSignature && $this->isLegacyWorkflow()) {
            $legacySignatureAssignment = $this->assignments->first(function ($assignment) {
                return $assignment->evidence && $assignment->evidence->signature_path;
            });
            $hasSignature = (bool) $legacySignatureAssignment;
        }

        if ($hasSignature && $hasBefore && $hasAfter) {
            $sharedVerificationCompleted = true;

            if ($this->signature_uploaded_by) {
                $sharedVerificationCompletedBy = [
                    'id' => $this->signature_uploaded_by,
                    'name' => User::find($this->signature_uploaded_by)?->name,
                ];
                $sharedVerificationCompletedAt = $this->signature_uploaded_at;
            } elseif ($legacySignatureAssignment) {
                $sharedVerificationCompletedBy = [
                    'id' => $legacySignatureAssignment->user_id,
                    'name' => User::find($legacySignatureAssignment->user_id)?->name,
                ];
                $sharedVerificationCompletedAt = $legacySignatureAssignment->evidence->updated_at;
            }
        }

        $isPhase1Completed = in_array($this->status?->value ?? $this->status, [
            TaskStatus::PHASE_1_SUBMITTED->value,
            TaskStatus::COMPLETED->value,
        ]);

        $status = 'pending';
        $currentStep = 1;

        if ($isPhase1Completed) {
            $status = 'completed';
            $currentStep = 2;
        } elseif ($hasSignature || $hasBefore || $hasAfter) {
            $status = 'partial';
        }

        $currentAssignment = null;
        if ($request->user() && $request->user()->hasRole('Teknisi')) {
            $currentAssignment = $this->assignments->where('user_id', $request->user()->id)->first();
            if ($currentAssignment) {
                $currentAssignment->loadMissing('evidence');
            }
        }

        $allAssignments = null;
        if ($request->user() && $request->user()->hasRole(['Admin', 'Superadmin'])) {
            $this->loadMissing(['assignments.evidence', 'assignments.user']);
            $allAssignments = $this->assignments;
        }

        $photos = [];
        if (is_array($this->photos)) {
            foreach ($this->photos as $key => $path) {
                $photos[$key] = Storage::url($path);
            }
        }

        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $formatScheduledAt = function ($date, $start) {
            if (! $date) {
                return null;
            }
            $dateStr = $date instanceof \DateTimeInterface ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');
            $timeStr = $start ?: '00:00:00';

            return Carbon::parse($dateStr.' '.$timeStr, 'Asia/Jakarta')->toIso8601String();
        };

        $mapAssignment = function ($assignment) use ($formatDate) {
            $assignment->unsetRelation('task');
            $data = $assignment->toArray();
            unset($data['task']);

            if (isset($data['evidence']) && is_array($data['evidence'])) {
                $evidence = $data['evidence'];
                $evidence['signature_url'] = $evidence['signature_path'] ? Storage::url($evidence['signature_path']) : null;
                $evidence['photo_before_url'] = $evidence['photo_before'] ? Storage::url($evidence['photo_before']) : null;
                $evidence['photo_after_url'] = $evidence['photo_after'] ? Storage::url($evidence['photo_after']) : null;
                $evidence['attendance_photo_url'] = $evidence['attendance_photo_path'] ? Storage::url($evidence['attendance_photo_path']) : null;
                $data['evidence'] = $evidence;
            }
            $data['assigned_at'] = $formatDate($data['assigned_at'] ?? null);
            $data['started_at'] = $formatDate($data['started_at'] ?? null);
            $data['submitted_at'] = $formatDate($data['submitted_at'] ?? null);
            $data['completed_at'] = $formatDate($data['completed_at'] ?? null);
            $data['approved_at'] = $formatDate($data['approved_at'] ?? null);

            return $data;
        };

        if ($currentAssignment) {
            $currentAssignment = $mapAssignment($currentAssignment);
        }

        if ($allAssignments) {
            $allAssignments = $allAssignments->map($mapAssignment);
        }

        return [
            'id' => $this->id,
            'task_number' => $this->task_number,
            'provisioning_id' => $this->provisioning_id,
            'submission_id' => $this->provisioning?->submission_id,
            'teknisi_id' => $this->teknisi_id,
            'status' => $this->status?->value ?? $this->status,
            'scheduled_date' => $formatDate($this->scheduled_date),
            'scheduled_start' => $this->scheduled_start,
            'scheduled_end' => $this->scheduled_end,
            'scheduled_at' => $formatScheduledAt($this->scheduled_date, $this->scheduled_start),
            'notes' => $this->notes,
            'completion_notes' => $this->completion_notes,
            'result' => $this->result,
            'customer_rating' => $this->customer_rating,
            'departed_at' => $formatDate($this->departed_at),
            'arrived_at' => $formatDate($this->arrived_at),
            'started_at' => $formatDate($this->started_at),
            'completed_at' => $formatDate($this->completed_at),
            'photos' => $photos,
            'customer_signature_url' => $this->customer_signature_path ? Storage::url($this->customer_signature_path) : null,
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
            'assigned_team' => $this->assigned_team,
            'shared_verification' => [
                'completed' => $status === 'completed',
                'status' => $status,
                'completed_by_id' => $sharedVerificationCompletedBy['id'] ?? null,
                'completed_by' => $sharedVerificationCompletedBy,
                'completed_at' => $formatDate($sharedVerificationCompletedAt),
                'current_step' => $currentStep,
            ],
            'progress' => [
                'total' => $this->assignments->count(),
                'submitted' => $this->assignments->whereIn('status', [
                    TaskAssignmentStatus::PHASE_2_COMPLETE,
                    TaskAssignmentStatus::APPROVED,
                ])->count(),
                'approved' => $this->assignments->where('status', TaskAssignmentStatus::APPROVED)->count(),
            ],
            'current_assignment' => $currentAssignment,
            'all_assignments' => $allAssignments,
            'provisioning' => $this->provisioning ? new ProvisioningResource($this->provisioning) : null,
            'submission' => ($sub = $this->provisioning?->submission) ? [
                'id' => $sub->id,
                'submission_number' => $sub->submission_number,
                'customer_name' => $sub->customer_name,
                'phone' => $sub->phone,
                'address' => $sub->address,
                'package_name' => $sub->package_name,
                'package_speed' => $sub->package_speed,
                'package_price' => $sub->package_price,
                'notes' => $sub->notes,
                'validation_notes' => $sub->validation_notes,
                'status' => $sub->status?->value ?? $sub->status,
            ] : null,
            'teknisi' => $this->teknisi,
            'customer' => ($submission = $this->provisioning?->submission) ? [
                'name' => $submission->customer_name,
                'phone' => $submission->phone,
                'address' => $submission->address,
                'village' => $submission->village,
                'district' => $submission->district,
                'city' => $submission->city,
                'province' => $submission->province,
                'postal_code' => $submission->postal_code,
            ] : null,
            'customer_location' => [
                'latitude' => $submission->lat ?? null,
                'longitude' => $submission->lng ?? null,
            ],
            'completion_location' => [
                'available' => $this->completion_latitude !== null && $this->completion_longitude !== null,
                'latitude' => $this->completion_latitude,
                'longitude' => $this->completion_longitude,
                'accuracy' => $this->completion_accuracy,
                'captured_at' => $formatDate($this->location_captured_at ?? $this->completed_at),
            ],
        ];
    }
}
