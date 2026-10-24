<?php

namespace App\Enums;

enum ComplaintPriority: string
{
    case LOW = 'low';
    case MEDIUM = 'medium';
    case HIGH = 'high';
    case CRITICAL = 'critical';

    /**
     * Target SLA response time dalam menit.
     */
    public function slaResponseMinutes(): int
    {
        return match ($this) {
            self::LOW => 240, // 4 jam
            self::MEDIUM => 120, // 2 jam
            self::HIGH => 60,  // 1 jam
            self::CRITICAL => 30,  // 30 menit
        };
    }

    /**
     * Target SLA resolution time dalam jam.
     */
    public function slaResolveHours(): int
    {
        return match ($this) {
            self::LOW => 48, // 48 jam
            self::MEDIUM => 24, // 24 jam
            self::HIGH => 8,  // 8 jam
            self::CRITICAL => 4,  // 4 jam
        };
    }
}
