<?php

namespace App\Enums;

enum TaskAssignmentStatus: string
{
    case ASSIGNED = 'assigned';
    case PHASE_2_COMPLETE = 'phase_2_complete';
    case RETURNED = 'returned';
    case APPROVED = 'approved';
    case ESCALATED = 'escalated';

    public function label(): string
    {
        return match ($this) {
            self::ASSIGNED => 'Ditugaskan',
            self::PHASE_2_COMPLETE => 'Tahap 2 Selesai',
            self::RETURNED => 'Kerja Ulang',
            self::APPROVED => 'Disetujui',
            self::ESCALATED => 'Dieskalasi',
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

