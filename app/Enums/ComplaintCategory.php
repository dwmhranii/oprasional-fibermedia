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

    public function label(): string
    {
        return match ($this) {
            self::NO_SIGNAL => 'Tidak Ada Sinyal (LOS)',
            self::SLOW_SPEED => 'Koneksi Lambat',
            self::INTERMITTENT => 'Koneksi Putus-Putus',
            self::EQUIPMENT => 'Perangkat / Modem Rusak',
            self::BILLING => 'Administrasi & Tagihan',
            self::RELOCATION => 'Relokasi / Pemindahan Jalur',
            self::MASS_OUTAGE => 'Gangguan Massal',
            self::OTHER => 'Lainnya',
        };
    }

    public static function options(): array
    {
        return array_map(fn (self $case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ], self::cases());
    }
}

