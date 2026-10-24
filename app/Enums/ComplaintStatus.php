<?php

namespace App\Enums;

enum ComplaintStatus: string
{
    case OPEN = 'open';
    case UNASSIGNED = 'unassigned';
    case ESCALATED_TO_ADMIN = 'escalated_to_admin';
    case ASSIGNED = 'assigned';
    case IN_PROGRESS = 'in_progress';
    case PHASE_1_COMPLETED = 'phase_1_completed';
    case PENDING_CUSTOMER = 'pending_customer';
    case RESOLVED = 'resolved';
    case CLOSED = 'closed';
    case CANCELLED = 'cancelled';
    case REOPENED = 'reopened';

    /**
     * Status yang dianggap aktif untuk deteksi duplikasi tiket pelanggan.
     */
    public static function activeStatuses(): array
    {
        return [
            self::OPEN,
            self::ASSIGNED,
            self::IN_PROGRESS,
            self::PHASE_1_COMPLETED,
            self::PENDING_CUSTOMER,
            self::RESOLVED,
            self::REOPENED,
        ];
    }

    /**
     * Status terminal (tidak bisa ditransisikan lagi).
     */
    public function isTerminal(): bool
    {
        return in_array($this, [self::CLOSED, self::CANCELLED]);
    }
}
