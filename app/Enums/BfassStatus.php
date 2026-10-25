<?php

namespace App\Enums;

enum BfassStatus: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case SUCCESS = 'success';
    case FAILED = 'failed';
    case COMPLETED = 'completed';
    case READY = 'ready';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Menunggu',
            self::PROCESSING => 'Memproses',
            self::SUCCESS => 'Berhasil',
            self::FAILED => 'Gagal',
            self::COMPLETED => 'Selesai',
            self::READY => 'Siap',
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

