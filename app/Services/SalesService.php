<?php

namespace App\Services;

use App\Repositories\SubmissionRepository;

class SalesService
{
    protected $submissionRepository;

    public function __construct(SubmissionRepository $submissionRepository)
    {
        $this->submissionRepository = $submissionRepository;
    }

    // Methods for handling sales logic (create submission, upload docs, etc.)
}
