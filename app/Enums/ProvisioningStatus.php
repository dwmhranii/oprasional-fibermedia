<?php

namespace App\Enums;

enum ProvisioningStatus: string
{
    // PRD v2.1 Lifecycle
    case PENDING = 'pending';
    case READY = 'ready';
    case PROCESSING = 'processing';
    case SUCCESS = 'success';
    case FAILED = 'failed';

    // RESERVED FOR LEGACY/FUTURE USE (No longer part of PRD v2.1 runtime)
    case SUSPENDED = 'suspended';
    case ACTIVE = 'active';
    case COMPLETED = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Menunggu',
            self::READY => 'Siap Dikonfigurasi',
            self::PROCESSING => 'Sedang Diproses',
            self::SUCCESS => 'Berhasil',
            self::FAILED => 'Gagal',
            self::SUSPENDED => 'Terisolir',
            self::ACTIVE => 'Aktif',
            self::COMPLETED => 'Selesai',
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

