<?php

namespace App\Enums;

enum SubmissionStatus: string
{
    case PENDING = 'pending';
    case PENDING_VALIDATION = 'pending_validation'; // Resubmitted after need_info; awaiting admin re-review
    case NEED_INFO = 'need_info';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case COMPLETED = 'completed';
}
