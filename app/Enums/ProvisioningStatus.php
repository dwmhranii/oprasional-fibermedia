<?php

namespace App\Enums;

enum ProvisioningStatus: string
{
    // PRD v2.1 Lifecycle
    case PENDING = 'pending';
    case READY = 'ready';
    case PROCESSING = 'processing';
    case SUCCESS = 'success';
    case FAILED = 'failed';

    // RESERVED FOR LEGACY/FUTURE USE (No longer part of PRD v2.1 runtime)
    case SUSPENDED = 'suspended';
    case ACTIVE = 'active';
    case COMPLETED = 'completed';
}
