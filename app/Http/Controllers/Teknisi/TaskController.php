<?php

namespace App\Http\Controllers\Teknisi;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Events\Phase1Submitted;
use App\Events\Phase2Submitted;
use App\Events\TaskAssignmentSubmitted;
use App\Http\Controllers\Controller;
use App\Http\Requests\Task\UpdateTaskStatusRequest;
use App\Http\Requests\Task\UploadTaskPhotoRequest;
use App\Http\Resources\TaskResource;
use App\Models\Phase2Requirement;
use App\Models\Task;
use App\Models\TaskCompletionEvidence;
use App\Models\TicketAttendance;
use App\Modules\Field\Services\PhaseWorkflowService;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    protected FileUploadService $fileUploadService;

    public function __construct(FileUploadService $fileUploadService)
    {
        $this->fileUploadService = $fileUploadService;
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Task::class);

        $user = Auth::user();
        $query = Task::query()->with(['provisioning.submission', 'assignments']);

        // Filter: If user only has own tasks view permission, scope query
        if (! $user->hasPermissionTo('assign_tasks') && $user->hasPermissionTo('view_assigned_tasks')) {
            $query->where(function ($q) use ($user) {
                $q->where('teknisi_id', $user->id)
                    ->orWhereHas('assignments', function ($q2) use ($user) {
                        $q2->where('user_id', $user->id);
                    });
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $query->filterAndSort($request, ['task_number', 'notes', 'provisioning.submission.customer_name']);

        return TaskResource::collection($query->paginate(15));
    }

    public function updateStatus(UpdateTaskStatusRequest $request, Task $task): JsonResponse
    {
        Gate::authorize('updateStatus', $task);

        $validated = $request->validated();
        $targetStatus = TaskStatus::from($validated['status']);

        // Idempotency check: if already at or past the target status (e.g. IN_PROGRESS while requesting ON_THE_WAY)
        $statusPriority = [
            TaskStatus::ASSIGNED->value => 1,
            TaskStatus::ON_THE_WAY->value => 2,
            TaskStatus::IN_PROGRESS->value => 3,
            TaskStatus::COMPLETED->value => 4,
        ];

        $currentPriority = $statusPriority[$task->status->value] ?? 0;
        $targetPriority = $statusPriority[$targetStatus->value] ?? 0;

        if ($currentPriority >= $targetPriority && in_array($targetStatus->value, ['on_the_way', 'in_progress'])) {
            return $this->successResponse(new TaskResource($task), 'Task status is already at or past the requested status.');
        }

        $originalStatus = $task->status;

        if ($originalStatus === TaskStatus::ASSIGNED && $targetStatus === TaskStatus::IN_PROGRESS) {
            $task->status = TaskStatus::ON_THE_WAY;
        }

        // Explicit transition guard
        if (! $task->canTransitionTo($targetStatus)) {
            $task->status = $originalStatus; // Reset for error message

            return $this->errorResponse("Invalid workflow transition from {$task->status->value} to {$targetStatus->value}.", 400);
        }

        if ($targetStatus === TaskStatus::COMPLETED) {
            return $this->errorResponse('Please use the /complete endpoint to submit assignment evidence.', 400);
        }

        $updates = [
            'status' => $targetStatus,
        ];

        // Set timestamps based on target status
        if ($targetStatus === TaskStatus::ON_THE_WAY && ! $task->departed_at) {
            $updates['departed_at'] = now();
        } elseif ($targetStatus === TaskStatus::IN_PROGRESS && ! $task->started_at) {
            $updates['arrived_at'] = $task->arrived_at ?? now();
            $updates['started_at'] = now();
            if (! $task->departed_at) {
                $updates['departed_at'] = now();
            }
        }

        $task = DB::transaction(function () use ($task, $updates) {
            $task->update($updates);

            return $task;
        });

        return $this->successResponse(new TaskResource($task), 'Task status updated successfully');
    }

    public function uploadPhoto(UploadTaskPhotoRequest $request, Task $task): JsonResponse
    {
        Gate::authorize('uploadPhoto', $task);

        $file = $request->file('photo');
        $photoType = $request->input('photo_type');

        if (in_array($photoType, ['before', 'after'])) {
            $assignment = $task->assignments()->where('user_id', Auth::id())->first();
            $isReturned = $assignment && ($assignment->status === TaskAssignmentStatus::RETURNED || optional($assignment->evidence)->status === 'returned');

            $isSharedCompleted = $task->customer_signature_path && isset($task->photos['before']) && isset($task->photos['after']);
            if ($isSharedCompleted && ! $isReturned) {
                return response()->json([
                    'success' => true,
                    'already_completed' => true,
                    'shared_verification' => ['completed' => true],
                ], 200);
            }
        }

        $directory = "tasks/{$task->id}";
        $path = $this->fileUploadService->uploadFile($file, $directory);

        if (! $path) {
            return $this->errorResponse('Failed to upload photo', 500);
        }

        try {
            DB::transaction(function () use ($task, $photoType, $path, $request) {
                $coords = [];
                if ($request->filled('latitude') && $request->filled('longitude')) {
                    $coords['latitude'] = $request->input('latitude');
                    $coords['longitude'] = $request->input('longitude');
                    if ($request->filled('accuracy')) {
                        $coords['accuracy'] = $request->input('accuracy');
                    }
                }

                if ($photoType === 'selfie' || $photoType === 'attendance') {
                    $assignment = $task->assignments()->where('user_id', Auth::id())->first();
                    if ($assignment) {
                        $evidence = TaskCompletionEvidence::firstOrCreate(
                            ['task_assignment_id' => $assignment->id]
                        );
                        $evidence->update(array_merge(['attendance_photo_path' => $path], $coords));
                    }
                } else {
                    $lockedTask = Task::lockForUpdate()->find($task->id);
                    $photos = $lockedTask->photos ?? [];
                    $photos[$photoType] = $path;
                    $lockedTask->update(['photos' => $photos]);

                    $assignment = $lockedTask->assignments()->where('user_id', Auth::id())->first();
                    if ($assignment && in_array($photoType, ['before', 'after'])) {
                        $evidence = TaskCompletionEvidence::firstOrCreate(
                            ['task_assignment_id' => $assignment->id]
                        );
                        $updateField = 'photo_'.$photoType;
                        $evidence->update(array_merge([$updateField => $path], $coords));
                    }
                }
            });
        } catch (\Throwable $e) {
            Storage::delete($path);
            throw $e;
        }

        return $this->successResponse([
            'photo_type' => $photoType,
            'path' => $path,
            'url' => $this->fileUploadService->getFileUrl($path),
        ], 'Photo uploaded successfully');
    }

    public function uploadSignature(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('uploadPhoto', $task);

        $request->validate([
            'signature' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $assignment = $task->assignments()->where('user_id', Auth::id())->first();
        $isReturned = $assignment && ($assignment->status === TaskAssignmentStatus::RETURNED || optional($assignment->evidence)->status === 'returned');

        $isSharedCompleted = $task->customer_signature_path && isset($task->photos['before']) && isset($task->photos['after']);
        if ($isSharedCompleted && ! $isReturned) {
            return response()->json([
                'success' => true,
                'already_completed' => true,
                'shared_verification' => ['completed' => true],
            ], 200);
        }

        $file = $request->file('signature');
        $directory = "tasks/{$task->id}";

        $path = $this->fileUploadService->uploadFile($file, $directory);

        if (! $path) {
            return $this->errorResponse('Failed to upload signature', 500);
        }

        try {
            DB::transaction(function () use ($task, $path) {
                $task->update([
                    'customer_signature_path' => $path,
                    'signature_uploaded_at' => now(),
                    'signature_uploaded_by' => Auth::id(),
                ]);
            });

            activity()
                ->causedBy(Auth::user())
                ->performedOn($task)
                ->log("Customer signature uploaded for Task #{$task->task_number}");
        } catch (\Throwable $e) {
            Storage::delete($path);
            throw $e;
        }

        return $this->successResponse([
            'path' => $path,
            'url' => $this->fileUploadService->getFileUrl($path),
        ], 'Signature uploaded successfully');
    }

    public function phase1(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('updateStatus', $task);

        if ($task->status === TaskStatus::PHASE_1_SUBMITTED || $task->status === TaskStatus::COMPLETED) {
            return $this->successResponse(new TaskResource($task), 'Phase 1 is already submitted.');
        }

        // Shared Verification Enforcement
        $hasSignature = (bool) $task->customer_signature_path;
        if (! $hasSignature) {
            return response()->json([
                'message' => 'Phase 1 failed: Shared Customer Verification is incomplete.',
                'errors' => ['signature' => ['Customer signature must be uploaded before completing Phase 1.']],
            ], 422);
        }

        $photos = $task->photos ?? [];
        if (! isset($photos['before']) || ! isset($photos['after'])) {
            return response()->json([
                'message' => 'Phase 1 failed: Shared Customer Verification is incomplete.',
                'errors' => ['photos' => ['Installation before and after photos must be uploaded before completing Phase 1.']],
            ], 422);
        }

        $task = DB::transaction(function () use ($task) {
            $task->update([
                'status' => TaskStatus::PHASE_1_SUBMITTED,
                'phase_1_submitted_at' => now(),
            ]);

            if ($task->provisioning) {
                $task->provisioning->update([
                    'status' => ProvisioningStatus::PROCESSING,
                ]);
            }

            return $task;
        });

        event(new Phase1Submitted($task));
        app(PhaseWorkflowService::class)->lockPhase2Requirements($task, Auth::user());

        return $this->successResponse(new TaskResource($task), 'Phase 1 submitted successfully.');
    }

    public function phase2(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('updateStatus', $task);

        if ($task->status !== TaskStatus::PHASE_1_SUBMITTED) {
            return $this->errorResponse('Task must be in Phase 1 Submitted status before Phase 2 can be completed.', 400);
        }

        $assignment = $task->assignments()->where('user_id', Auth::id())->first();
        if (! $assignment) {
            return $this->errorResponse('You are not assigned to this task.', 403);
        }

        if ($assignment->status === TaskAssignmentStatus::PHASE_2_COMPLETE || $assignment->status === TaskAssignmentStatus::APPROVED) {
            return $this->successResponse(new TaskResource($task), 'Phase 2 is already completed.');
        }

        $validated = $request->validate([
            'completion_notes' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        $evidence = TaskCompletionEvidence::firstOrCreate(['task_assignment_id' => $assignment->id]);
        if (! $evidence->attendance_photo_path) {
            return response()->json([
                'message' => 'Phase 2 failed: Attendance selfie is missing.',
                'errors' => ['selfie' => ['An attendance selfie is required before completion.']],
            ], 422);
        }

        // Geofence Evaluation (menandai status inside/outside tanpa penolakan keras)
        $distance = null;
        $geofenceStatus = 'unverified';
        $submission = $task->provisioning?->submission;
        if ($submission && $submission->lat && $submission->lng) {
            $distance = $this->calculateDistance($validated['latitude'], $validated['longitude'], $submission->lat, $submission->lng);
            $geofenceStatus = $distance <= 50 ? 'inside' : 'outside';
        }

        DB::transaction(function () use ($assignment, $evidence, $validated, $task, $distance, $geofenceStatus) {
            $evidence->update([
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'accuracy' => $validated['accuracy'] ?? null,
                'notes' => $validated['completion_notes'],
                'submitted_at' => now(),
                'status' => 'submitted',
            ]);
            $assignment->update([
                'status' => TaskAssignmentStatus::PHASE_2_COMPLETE,
                'phase_2_submitted_at' => now(),
            ]);

            // Catat ke ticket_attendances
            TicketAttendance::updateOrCreate([
                'attendable_type' => Task::class,
                'attendable_id' => $task->id,
                'user_id' => Auth::id(),
            ], [
                'lat' => $validated['latitude'],
                'lng' => $validated['longitude'],
                'accuracy' => $validated['accuracy'] ?? null,
                'distance_meters' => $distance,
                'geofence_status' => $geofenceStatus,
                'captured_at' => now(),
                'received_at' => now(),
            ]);

            // Tandai pemenuhan Phase 2 requirement
            Phase2Requirement::where('assignable_type', Task::class)
                ->where('assignable_id', $task->id)
                ->where('user_id', Auth::id())
                ->update(['completed_at' => now()]);
        });

        event(new Phase2Submitted($assignment));

        return $this->successResponse(new TaskResource($task->fresh()), 'Phase 2 completed successfully.');
    }

    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * @deprecated Legacy single-phase completion. Replaced by phase1() and phase2().
     * Kept temporarily until all clients are migrated.
     */
    public function complete(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('updateStatus', $task);

        $assignment = $task->assignments()->where('user_id', Auth::id())->first();

        // Idempotency: if assignment is already submitted, return success
        if ($assignment && in_array($assignment->status, ['submitted', 'approved'])) {
            return $this->successResponse(new TaskResource($task), 'Assignment is already submitted.');
        }

        $targetStatus = TaskStatus::COMPLETED;

        // Explicit transition guard
        if (! $task->canTransitionTo($targetStatus)) {
            return $this->errorResponse("Invalid workflow transition from {$task->status->value} to {$targetStatus->value}.", 400);
        }

        // Technicians can complete their work independently of BFASS status

        // Shared Verification Enforcement (with legacy fallback)
        $hasSignature = (bool) $task->customer_signature_path;
        if (! $hasSignature && $task->isLegacyWorkflow()) {
            $hasSignature = $task->assignments()->whereHas('evidence', function ($q) {
                $q->whereNotNull('signature_path');
            })->exists();
        }

        if (! $hasSignature) {
            return response()->json([
                'message' => 'Task completion failed: Shared Customer Verification is incomplete.',
                'errors' => ['signature' => ['Customer signature must be uploaded before completing attendance.']],
            ], 422);
        }

        $photos = $task->photos ?? [];
        $hasBefore = isset($photos['before']);
        if (! $hasBefore && $task->isLegacyWorkflow()) {
            $hasBefore = $task->assignments()->whereHas('evidence', function ($q) {
                $q->whereNotNull('photo_before');
            })->exists();
        }

        $hasAfter = isset($photos['after']);
        if (! $hasAfter && $task->isLegacyWorkflow()) {
            $hasAfter = $task->assignments()->whereHas('evidence', function ($q) {
                $q->whereNotNull('photo_after');
            })->exists();
        }

        if (! $hasBefore || ! $hasAfter) {
            return response()->json([
                'message' => 'Task completion failed: Shared Customer Verification is incomplete.',
                'errors' => ['photos' => ['Installation before and after photos must be uploaded before completing attendance.']],
            ], 422);
        }

        // Validate completion notes and GPS
        $validated = $request->validate([
            'completion_notes' => 'required|string',
            'customer_rating' => 'nullable|integer|min:1|max:5',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
            'captured_at' => 'nullable|date',
        ]);

        $assignment = $task->assignments()->where('user_id', Auth::id())->first();

        if ($assignment) {
            $evidence = TaskCompletionEvidence::firstOrCreate(['task_assignment_id' => $assignment->id]);

            if (! $evidence->attendance_photo_path) {
                return response()->json([
                    'message' => 'Task completion failed: Attendance selfie is missing.',
                    'errors' => ['selfie' => ['An attendance selfie is required before completion.']],
                ], 422);
            }
        } else {
            // Workflow Enforcement for legacy tasks
            $incompleteItems = $task->checklistItems()->where('is_completed', false)->count();
            if ($incompleteItems > 0) {
                return response()->json([
                    'message' => 'Task completion failed: Installation checklist is incomplete.',
                    'errors' => ['checklist' => ['All checklist items must be completed before completion.']],
                ], 422);
            }
        }

        $task = DB::transaction(function () use ($task, $validated, $assignment) {
            if ($assignment) {
                $evidence = TaskCompletionEvidence::firstOrCreate(['task_assignment_id' => $assignment->id]);
                $evidence->update([
                    'latitude' => $validated['latitude'],
                    'longitude' => $validated['longitude'],
                    'accuracy' => $validated['accuracy'] ?? null,
                    'notes' => $validated['completion_notes'],
                    'submitted_at' => now(),
                    'status' => 'submitted',
                ]);
                $assignment->update([
                    'status' => 'submitted',
                    'submitted_at' => now(),
                ]);
            } else {
                $task->update([
                    'status' => TaskStatus::COMPLETED,
                    'completed_at' => now(),
                    'completion_notes' => $validated['completion_notes'],
                    'result' => 'success',
                    'customer_rating' => $validated['customer_rating'] ?? null,
                    'completion_latitude' => $validated['latitude'],
                    'completion_longitude' => $validated['longitude'],
                    'completion_accuracy' => $validated['accuracy'] ?? null,
                    'location_captured_at' => $validated['captured_at'] ?? now(),
                ]);

                if ($task->provisioning) {
                    $task->provisioning->update([
                        'completed_at' => now(),
                    ]);
                    if ($task->provisioning->submission) {
                        $task->provisioning->submission->update([
                            'status' => SubmissionStatus::COMPLETED,
                        ]);
                    }
                }
            }

            return $task;
        });

        if ($assignment) {
            event(new TaskAssignmentSubmitted($assignment));
        }

        return $this->successResponse(new TaskResource($task), 'Task '.($assignment ? 'assignment submitted' : 'marked as completed').' successfully.');
    }

    public function show(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $task->load(['provisioning.submission', 'teknisi', 'assignments.user']);

        return $this->successResponse(new TaskResource($task), 'Task detail retrieved successfully.');
    }
}
