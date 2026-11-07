<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    /**
     * Determine whether the user can view any submissions.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('submissions.view')
            || $user->can('submissions.view_own')
            || $user->can('view_any_submissions')
            || $user->can('view_own_submissions');
    }

    /**
     * Determine whether the user can view the submission.
     */
    public function view(User $user, Submission $submission): bool
    {
        if ($user->can('submissions.view') || $user->can('view_any_submissions')) {
            return true;
        }

        if ($user->can('submissions.view_own') || $user->can('view_own_submissions')) {
            return ((int) $submission->user_id === (int) $user->id) || ((int) $submission->sales_id === (int) $user->id);
        }

        return false;
    }

    /**
     * Determine whether the user can create submissions.
     */
    public function create(User $user): bool
    {
        return $user->can('submissions.create') || $user->can('create_submissions');
    }

    /**
     * Determine whether the user can update the submission.
     */
    public function update(User $user, Submission $submission): bool
    {
        if (! $submission->isEditable()) {
            return false;
        }

        if ($user->can('submissions.approve')) {
            return true;
        }

        if ($user->can('submissions.update_own') || $user->can('edit_submissions')) {
            return ((int) $submission->user_id === (int) $user->id) || ((int) $submission->sales_id === (int) $user->id);
        }

        return false;
    }

    /**
     * Determine whether the user can upload documents to the submission.
     */
    public function uploadDocument(User $user, Submission $submission): bool
    {
        if ($user->can('submissions.approve')) {
            return true;
        }

        if ($user->can('submissions.create') || $user->can('submissions.update_own') || $user->can('create_submissions')) {
            return ((int) $submission->user_id === (int) $user->id) || ((int) $submission->sales_id === (int) $user->id);
        }

        return false;
    }

    /**
     * Determine whether the user can validate the submission.
     */
    public function validate(User $user, Submission $submission): bool
    {
        return $user->can('submissions.approve') || $user->can('validate_submissions');
    }

    /**
     * Determine whether the user can delete the submission.
     */
    public function delete(User $user, Submission $submission): bool
    {
        return $user->can('submissions.delete');
    }
}
