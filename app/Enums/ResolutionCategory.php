<?php

namespace App\Enums;

enum ResolutionCategory: string
{
    case CABLE_BROKEN = 'cable_broken';
    case ONT_FAULTY = 'ont_faulty';
    case ONT_RESET = 'ont_reset';
    case SPLITTER_ODP_ISSUE = 'splitter_odp_issue';
    case CONFIG_ISSUE = 'config_issue';
    case CUSTOMER_SIDE = 'customer_side';
    case BILLING_RESOLVED = 'billing_resolved';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::CABLE_BROKEN => 'Kabel Dropcore Putus',
            self::ONT_FAULTY => 'Modem / ONT Rusak',
            self::ONT_RESET => 'Konfigurasi ONT Ulang',
            self::SPLITTER_ODP_ISSUE => 'Gangguan Port / Splitter ODP',
            self::CONFIG_ISSUE => 'Gangguan Konfigurasi Server',
            self::CUSTOMER_SIDE => 'Kendala Perangkat Pelanggan',
            self::BILLING_RESOLVED => 'Tagihan Diselesaikan',
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

