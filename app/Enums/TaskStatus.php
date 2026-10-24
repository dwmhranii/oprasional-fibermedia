<?php

namespace App\Enums;

enum TaskStatus: string
{
    case PENDING = 'pending';
    case UNASSIGNED = 'unassigned';
    case ESCALATED_TO_ADMIN = 'escalated_to_admin';
    case ASSIGNED = 'assigned';
    case ON_THE_WAY = 'on_the_way';
    case IN_PROGRESS = 'in_progress';
    case PHASE_1_SUBMITTED = 'phase_1_submitted';
    case COMPLETED = 'completed';
    // RESERVED FOR FUTURE USE (e.g., Customer Cancellation)
    case FAILED = 'failed';
}
