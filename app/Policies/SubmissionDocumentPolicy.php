<?php

namespace App\Policies;

use App\Models\SubmissionDocument;
use App\Models\User;

class SubmissionDocumentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('submissions.view') || $user->can('submissions.view_own') || $user->can('view_any_submissions') || $user->can('view_own_submissions');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, SubmissionDocument $submissionDocument): bool
    {
        if ($user->can('submissions.view') || $user->can('view_any_submissions')) {
            return true;
        }

        return ($user->can('submissions.view_own') || $user->can('view_own_submissions'))
            && $submissionDocument->submission->user_id === $user->id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, SubmissionDocument $submissionDocument): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, SubmissionDocument $submissionDocument): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, SubmissionDocument $submissionDocument): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, SubmissionDocument $submissionDocument): bool
    {
        return false;
    }

    /**
     * Determine whether the user can review the document.
     */
    public function review(User $user, SubmissionDocument $submissionDocument): bool
    {
        return $user->can('submissions.approve') || $user->can('validate_submissions');
    }
}
