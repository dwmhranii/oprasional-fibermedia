<?php

namespace App\Enums;

enum ComplaintCategory: string
{
    case NO_SIGNAL = 'no_signal';
    case SLOW_SPEED = 'slow_speed';
    case INTERMITTENT = 'intermittent';
    case EQUIPMENT = 'equipment';
    case BILLING = 'billing';
    case RELOCATION = 'relocation';
    case MASS_OUTAGE = 'mass_outage';
    case OTHER = 'other';

    /**
     * Kategori yang dapat ditugaskan ke teknisi lapangan.
     * Tiket billing ditangani remote oleh admin, bukan teknisi lapangan.
     */
    public function isAssignable(): bool
    {
        return $this !== self::BILLING;
    }
}
