<?php

namespace App\Repositories;

use App\Models\Submission;

class SubmissionRepository
{
    // Database queries for Submissions

    public function findById($id)
    {
        return Submission::findOrFail($id);
    }
}
