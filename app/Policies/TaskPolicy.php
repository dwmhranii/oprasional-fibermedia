<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    /**
     * Determine whether the user can view any tasks.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('workorders.view')
            || $user->can('tasks.view_assigned')
            || $user->can('assign_tasks')
            || $user->can('view_assigned_tasks');
    }

    /**
     * Determine whether the user can view the task.
     */
    public function view(User $user, Task $task): bool
    {
        if ($user->can('workorders.view') || $user->can('complaints.assign') || $user->can('assign_tasks')) {
            return true;
        }

        $isAssignedDirectly = ($task->teknisi_id === $user->id);
        $isInAssignedTeam = ($user->team && $task->assigned_team && $user->team === $task->assigned_team);
        $hasAssignment = $task->assignments()->where('user_id', $user->id)->exists();

        return ($user->can('tasks.view_assigned') || $user->can('view_assigned_tasks'))
            && ($isAssignedDirectly || $isInAssignedTeam || $hasAssignment);
    }

    /**
     * Determine whether the user can assign tasks.
     */
    public function assign(User $user): bool
    {
        return $user->can('complaints.assign') || $user->can('assign_tasks');
    }

    /**
     * Determine whether the user can update the status of the task.
     */
    public function updateStatus(User $user, Task $task): bool
    {
        if ($user->can('complaints.assign') || $user->can('assign_tasks')) {
            return true;
        }

        $isAssignedDirectly = ($task->teknisi_id === $user->id);
        $isInAssignedTeam = ($user->team && $task->assigned_team && $user->team === $task->assigned_team);
        $hasAssignment = $task->assignments()->where('user_id', $user->id)->exists();

        return ($user->can('tasks.update_status') || $user->can('update_task_status'))
            && ($isAssignedDirectly || $isInAssignedTeam || $hasAssignment);
    }

    /**
     * Determine whether the user can upload completion photos for the task.
     */
    public function uploadPhoto(User $user, Task $task): bool
    {
        return $this->updateStatus($user, $task);
    }

    /**
     * Determine whether the user can reassign the task.
     */
    public function reassign(User $user, Task $task): bool
    {
        return $user->can('complaints.assign') || $user->can('assign_tasks');
    }
}
