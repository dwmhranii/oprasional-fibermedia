<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CustomerTemplateExport implements FromArray, ShouldAutoSize, WithHeadings, WithStyles
{
    public function headings(): array
    {
        return [
            'Kode Pelanggan (Opsional)',
            'Nama Pelanggan (Wajib)',
            'Nomor Telepon / WhatsApp (Wajib)',
            'Alamat Lengkap (Wajib)',
            'Paket Layanan',
            'Kode ODP',
            'Status (active / suspended / terminated)',
        ];
    }

    public function array(): array
    {
        return [
            [
                'FM-2026-00001',
                'Budi Santoso',
                '081234567890',
                'Jl. Soekarno Hatta No. 45, Dinoyo, Lowokwaru, Kota Malang',
                '50 Mbps Home Ultra',
                'ODP-MLG-01',
                'active',
            ],
            [
                'FM-2026-00002',
                'Siti Aminah',
                '085678901234',
                'Perum Graha Dewata Blok B2/12, Dau, Kabupaten Malang',
                '100 Mbps Gamer Fast',
                'ODP-MLG-02',
                'active',
            ],
            [
                '', // Biarkan kosong untuk auto-generate kode
                'Hendra Pratama',
                '081398765432',
                'Jl. MT Haryono Gg 4 No. 10, Ketawanggede, Kota Malang',
                '30 Mbps Home Basic',
                'ODP-MLG-03',
                'active',
            ],
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '059669'], // Emerald-600
                ],
            ],
        ];
    }
}
