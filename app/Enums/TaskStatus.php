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

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Menunggu',
            self::UNASSIGNED => 'Belum Ditugaskan',
            self::ESCALATED_TO_ADMIN => 'Eskalasi ke Admin',
            self::ASSIGNED => 'Menunggu Diterima',
            self::ON_THE_WAY => 'Dalam Perjalanan',
            self::IN_PROGRESS => 'Dikerjakan',
            self::PHASE_1_SUBMITTED => 'Perlu Ditinjau',
            self::COMPLETED => 'Selesai',
            self::FAILED => 'Gagal',
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

