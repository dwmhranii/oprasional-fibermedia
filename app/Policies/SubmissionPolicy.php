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
        return $user->hasRole(['Admin', 'Superadmin', 'Sales', 'Teknisi', 'admin', 'superadmin', 'sales', 'teknisi'])
            || $user->hasPermissionTo('view_any_submissions')
            || $user->hasPermissionTo('view_own_submissions');
    }

    /**
     * Determine whether the user can view the submission.
     */
    public function view(User $user, Submission $submission): bool
    {
        if ($user->hasRole(['Admin', 'Superadmin', 'admin', 'superadmin', 'Teknisi', 'teknisi']) || $user->hasPermissionTo('view_any_submissions')) {
            return true;
        }

        return ((int) $submission->user_id === (int) $user->id) || ((int) $submission->sales_id === (int) $user->id);
    }

    /**
     * Determine whether the user can create submissions.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the submission.
     */
    public function update(User $user, Submission $submission): bool
    {
        if (! $submission->isEditable()) {
            return false;
        }

        if ($user->hasRole(['Admin', 'Superadmin', 'admin', 'superadmin', 'Teknisi', 'teknisi']) || $user->hasPermissionTo('view_any_submissions')) {
            return true;
        }

        return ((int) $submission->user_id === (int) $user->id) || ((int) $submission->sales_id === (int) $user->id);
    }

    /**
     * Determine whether the user can upload documents to the submission.
     */
    public function uploadDocument(User $user, Submission $submission): bool
    {
        if ($user->hasRole(['Admin', 'Superadmin', 'admin', 'superadmin', 'Teknisi', 'teknisi']) || $user->hasPermissionTo('view_any_submissions')) {
            return true;
        }

        return ((int) $submission->user_id === (int) $user->id) || ((int) $submission->sales_id === (int) $user->id);
    }

    /**
     * Determine whether the user can validate the submission.
     */
    public function validate(User $user, Submission $submission): bool
    {
        return $user->hasRole(['Admin', 'Superadmin', 'admin', 'superadmin']) || $user->hasPermissionTo('validate_submissions');
    }

    /**
     * Determine whether the user can delete the submission.
     */
    public function delete(User $user, Submission $submission): bool
    {
        return $user->hasRole(['Superadmin', 'superadmin']);
    }
}
