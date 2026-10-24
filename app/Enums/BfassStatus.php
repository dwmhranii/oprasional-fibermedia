<?php

namespace App\Enums;

enum BfassStatus: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case SUCCESS = 'success';
    case FAILED = 'failed';
    case COMPLETED = 'completed';
    case READY = 'ready';
}
