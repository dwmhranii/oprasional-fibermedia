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

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Menunggu Validasi',
            self::PENDING_VALIDATION => 'Menunggu Validasi Ulang',
            self::NEED_INFO => 'Perlu Info Tambahan',
            self::APPROVED => 'Disetujui',
            self::REJECTED => 'Ditolak',
            self::COMPLETED => 'Selesai Dipasang',
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

