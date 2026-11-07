<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ProvisioningStatus;
use App\Enums\SubmissionStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Events\AssignmentApproved;
use App\Events\AssignmentReturned;
use App\Events\ProvisioningCompleted;
use App\Events\TaskEscalated;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\TaskAssignment;
use App\Notifications\TechnicianApprovedNotification;
use App\Notifications\TechnicianReturnedNotification;
use App\Utils\IdentifierGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskAssignmentApprovalController extends Controller
{
    public function approve(TaskAssignment $assignment): JsonResponse
    {
        $user = Auth::user();
        if (! $user || (! $user->can('workorders.view') && ! $user->can('tasks.update_status'))) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        if ($assignment->status === TaskAssignmentStatus::APPROVED) {
            return $this->successResponse($assignment->task, 'Task assignment is already approved.');
        }

        if ($assignment->status !== TaskAssignmentStatus::PHASE_2_COMPLETE && $assignment->status->value !== 'submitted') {
            return $this->errorResponse('Only completed Phase 2 assignments can be approved.', 400);
        }

        $wasCompleted = false;

        $task = DB::transaction(function () use ($assignment, &$wasCompleted) {
            $assignment->update([
                'status' => TaskAssignmentStatus::APPROVED,
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            if ($assignment->evidence) {
                $assignment->evidence->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by' => Auth::id(),
                ]);
            }

            $task = $assignment->task;
            $totalAssignments = $task->assignments()->count();
            $approvedAssignments = $task->assignments()->where('status', TaskAssignmentStatus::APPROVED)->count();

            if ($approvedAssignments === $totalAssignments) {
                $task->update([
                    'status' => TaskStatus::COMPLETED,
                    'completed_at' => now(),
                    'result' => 'success',
                ]);

                if ($task->provisioning) {
                    $task->provisioning->update([
                        'status' => ProvisioningStatus::SUCCESS,
                        'provisioned_at' => now(),
                    ]);
                    if ($task->provisioning->submission) {
                        $submission = $task->provisioning->submission;

                        $customerCode = $submission->customer_code
                            ?? IdentifierGenerator::generateCustomerCode($submission->id, $submission->created_at);

                        $customer = Customer::firstOrCreate([
                            'customer_code' => $customerCode,
                        ], [
                            'name' => $submission->customer_name,
                            'address' => $submission->address,
                            'phone' => $submission->phone,
                            'package' => $submission->package_name,
                            'odp_code' => $task->provisioning->odp,
                            'status' => 'active',
                        ]);

                        $submission->update([
                            'status' => SubmissionStatus::COMPLETED,
                            'customer_id' => $customer->id,
                            'customer_code' => $customer->customer_code,
                        ]);
                    }
                }
                $wasCompleted = true;
            }

            return $task;
        });

        event(new AssignmentApproved($assignment));
        if ($wasCompleted && $task->provisioning) {
            event(new ProvisioningCompleted($task->provisioning));
        }

        $assignment->user->notify(new TechnicianApprovedNotification($assignment));

        return $this->successResponse($task, 'Task assignment approved successfully.');
    }

    public function returnAssignment(Request $request, TaskAssignment $assignment): JsonResponse
    {
        $user = Auth::user();
        if (! $user || (! $user->can('workorders.view') && ! $user->can('tasks.update_status'))) {
            return $this->errorResponse('Unauthorized.', 403);
        }

        if ($assignment->status !== TaskAssignmentStatus::PHASE_2_COMPLETE && $assignment->status->value !== 'submitted') {
            return $this->errorResponse('Only completed Phase 2 assignments can be returned.', 400);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:2000',
        ]);

        $task = DB::transaction(function () use ($assignment, $validated) {
            $task = $assignment->task;
            $task->increment('return_count');

            if ($task->return_count >= 3) {
                $assignment->update([
                    'status' => TaskAssignmentStatus::ESCALATED,
                    'notes' => $validated['notes'] ?? $assignment->notes,
                ]);
                // Parent task remains in its current state (IN_PROGRESS/PHASE_1_SUBMITTED) until explicitly resolved by Superadmin
                event(new TaskEscalated($assignment));
            } else {
                $assignment->update([
                    'status' => TaskAssignmentStatus::RETURNED,
                    'phase_2_submitted_at' => null, // clear submission timestamp
                    'notes' => $validated['notes'] ?? $assignment->notes,
                ]);
                if ($assignment->evidence) {
                    $assignment->evidence->update([
                        'status' => 'returned',
                    ]);
                }
                event(new AssignmentReturned($assignment));
            }

            return $task;
        });

        $assignment->user->notify(new TechnicianReturnedNotification($assignment));

        return $this->successResponse($task, 'Task assignment returned successfully.');
    }
}
