<?php

namespace App\Enums;

enum TaskAssignmentStatus: string
{
    case ASSIGNED = 'assigned';
    case PHASE_2_COMPLETE = 'phase_2_complete';
    case RETURNED = 'returned';
    case APPROVED = 'approved';
    case ESCALATED = 'escalated';
}
