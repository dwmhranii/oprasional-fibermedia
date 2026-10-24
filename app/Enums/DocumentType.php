<?php

namespace App\Enums;

enum DocumentType: string
{
    case KTP = 'ktp';
    case RUMAH = 'rumah';
    case KK = 'kk';
    case LAINNYA = 'lainnya';
}
