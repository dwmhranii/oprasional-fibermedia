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
        return $user->hasPermissionTo('assign_tasks') || $user->hasPermissionTo('view_assigned_tasks');
    }

    /**
     * Determine whether the user can view the task.
     */
    public function view(User $user, Task $task): bool
    {
        if ($user->hasRole(['Superadmin', 'Admin']) || $user->hasPermissionTo('assign_tasks')) {
            return true;
        }

        $isAssignedDirectly = ($task->teknisi_id === $user->id);
        $isInAssignedTeam = ($user->team && $task->assigned_team && $user->team === $task->assigned_team);
        $hasAssignment = $task->assignments()->where('user_id', $user->id)->exists();

        return ($user->hasPermissionTo('view_assigned_tasks') || $user->hasRole('Teknisi'))
            && ($isAssignedDirectly || $isInAssignedTeam || $hasAssignment);
    }

    /**
     * Determine whether the user can assign tasks.
     */
    public function assign(User $user): bool
    {
        return $user->hasRole(['Superadmin', 'Admin']) || $user->hasPermissionTo('assign_tasks');
    }

    /**
     * Determine whether the user can update the status of the task.
     */
    public function updateStatus(User $user, Task $task): bool
    {
        if ($user->hasRole(['Superadmin', 'Admin']) || $user->hasPermissionTo('assign_tasks')) {
            return true;
        }

        $isAssignedDirectly = ($task->teknisi_id === $user->id);
        $isInAssignedTeam = ($user->team && $task->assigned_team && $user->team === $task->assigned_team);
        $hasAssignment = $task->assignments()->where('user_id', $user->id)->exists();

        return ($user->hasPermissionTo('update_task_status') || $user->hasRole('Teknisi'))
            && ($isAssignedDirectly || $isInAssignedTeam || $hasAssignment);
    }

    /**
     * Determine whether the user can upload completion photos for the task.
     */
    public function uploadPhoto(User $user, Task $task): bool
    {
        if ($user->hasRole(['Superadmin', 'Admin']) || $user->hasPermissionTo('assign_tasks')) {
            return true;
        }

        $isAssignedDirectly = ($task->teknisi_id === $user->id);
        $isInAssignedTeam = ($user->team && $task->assigned_team && $user->team === $task->assigned_team);
        $hasAssignment = $task->assignments()->where('user_id', $user->id)->exists();

        return ($user->hasPermissionTo('update_task_status') || $user->hasRole('Teknisi'))
            && ($isAssignedDirectly || $isInAssignedTeam || $hasAssignment);
    }

    /**
     * Determine whether the user can reassign the task.
     */
    public function reassign(User $user, Task $task): bool
    {
        return $user->hasRole(['Superadmin', 'Admin']) || $user->hasPermissionTo('assign_tasks');
    }
}
