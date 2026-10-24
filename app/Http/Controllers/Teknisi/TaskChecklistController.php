<?php

namespace App\Http\Controllers\Teknisi;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskCompletionEvidence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskChecklistController extends Controller
{
    /**
     * Get the checklist for a task.
     */
    public function show(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $assignment = $task->assignments()->where('user_id', auth()->id())->first();
        if ($assignment) {
            $evidence = TaskCompletionEvidence::where('task_assignment_id', $assignment->id)->first();
            if ($evidence && $evidence->checklist_result) {
                return response()->json([
                    'success' => true,
                    'data' => $evidence->checklist_result,
                ]);
            }
        }

        $checklist = $task->checklistItems()->get(['id', 'item_name', 'is_completed']);

        return response()->json([
            'success' => true,
            'data' => $checklist,
        ]);
    }

    /**
     * Update the checklist for a task.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('updateStatus', $task);

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.item_name' => 'required|string',
            'items.*.is_completed' => 'required|boolean',
        ]);

        $assignment = $task->assignments()->where('user_id', auth()->id())->first();

        if ($assignment) {
            $evidence = TaskCompletionEvidence::firstOrCreate(['task_assignment_id' => $assignment->id]);
            $evidence->update([
                'checklist_result' => $validated['items'],
            ]);
            $data = $validated['items'];
        } else {
            foreach ($validated['items'] as $item) {
                $task->checklistItems()->where('item_name', $item['item_name'])->update([
                    'is_completed' => $item['is_completed'],
                ]);
            }
            $data = $task->checklistItems()->get(['id', 'item_name', 'is_completed']);
        }

        // Add an activity log if at least one item was checked
        activity()
            ->causedBy(auth()->user())
            ->performedOn($task)
            ->log("Installation checklist updated for Task #{$task->task_number}");

        return response()->json([
            'success' => true,
            'message' => 'Checklist updated successfully.',
            'data' => $data,
        ]);
    }
}
