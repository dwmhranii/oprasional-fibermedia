<?php

namespace App\Enums;

enum DocumentType: string
{
    case KTP = 'ktp';
    case RUMAH = 'rumah';
    case KK = 'kk';
    case LAINNYA = 'lainnya';

    public function label(): string
    {
        return match ($this) {
            self::KTP => 'Foto KTP',
            self::RUMAH => 'Foto Rumah',
            self::KK => 'Kartu Keluarga',
            self::LAINNYA => 'Dokumen Lainnya',
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

