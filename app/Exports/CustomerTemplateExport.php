<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CustomerTemplateExport implements FromArray, ShouldAutoSize, WithCustomCsvSettings, WithHeadings, WithStyles
{
    /**
     * 35 Kolom Baku Sesuai PRD Final v1.2 Bagian 11.
     */
    public function headings(): array
    {
        return [
            'No',
            'ID User',
            'ID Pelanggan',
            'Tanggal Dibuat',
            'Nama',
            'NIK',
            'Email',
            'Alamat',
            'Koordinat',
            'Nomor Telepon',
            'Tipe',
            'Server',
            'Collector',
            'Username',
            'Password',
            'Paket',
            'Harga',
            'Local Address',
            'Remote Address',
            'Parent Queue',
            'Rate Limit',
            'Berlangganan',
            'Expired Date',
            'Status',
            'ONU Index',
            'Nama ODP',
            'Alamat ODP',
            'Koordinat ODP',
            'Keterangan ODP',
            'Port ODP',
            'Hutang',
            'Wilayah',
            'Teknisi',
            'Sales',
            'Catatan',
        ];
    }

    /**
     * Contoh data baris template.
     */
    public function array(): array
    {
        return [
            [
                '1',
                'USR-1001',
                'FM-2026-00001',
                '07 May 2026',
                'Budi Santoso',
                '3507123456780001',
                'budi.santoso@example.com',
                'Jl. Soekarno Hatta No. 45, Dinoyo, Lowokwaru, Kota Malang',
                '-7.9465,112.6156',
                '081234567890',
                'PPPOE',
                'Server Distribusi Utama X86',
                'Kantor Resmi FibermediaPlay',
                'budi@1001',
                'RahasiaBudi123!',
                '50 Mbps Home Ultra',
                'Rp. 155.000',
                '10.10.10.2',
                'pool-dinoyo',
                'none',
                '50M/50M',
                '1 Bulan',
                '07 Jun 2026',
                'Active',
                '1/1/1:1',
                'ODP-DNY-01',
                'Jl. Soekarno Hatta Tiang 12',
                '-7.9468,112.6159',
                'Kapasitas 8 Port Splitter 1:8',
                '1',
                '0',
                'Lowokwaru',
                'Tim Alpha',
                'Rahmat Hidayat',
                'Pelanggan migrasi sistem lama',
            ],
            [
                '2',
                'USR-1002',
                'FM-2026-00002',
                '10 May 2026',
                'Siti Aminah',
                '3507987654320002',
                'siti.aminah@example.com',
                'Perum Graha Dewata Blok B2/12, Dau, Kabupaten Malang',
                '-7.9321,112.5890',
                '085678901234',
                'PPPOE',
                'Server Distribusi Utama X86',
                'Kantor Resmi FibermediaPlay',
                'siti@1002',
                'RahasiaSiti456!',
                '100 Mbps Gamer Fast',
                'Rp. 275.000',
                '10.10.10.3',
                'pool-dau',
                'none',
                '100M/100M',
                '1 Bulan',
                '10 Jun 2026',
                'Active',
                '1/1/1:2',
                'ODP-DAU-02',
                'Perum Graha Dewata Gerbang Timur',
                '-7.9320,112.5892',
                'Kapasitas 16 Port',
                '2',
                '0',
                'Dau',
                'Tim Beta',
                'Sari Dewi',
                'Pemasangan kabel drop wire 45 meter',
            ],
            [
                '3',
                'USR-1003',
                '', // Biarkan kosong untuk auto-generate kode
                '15 May 2026',
                'Hendra Pratama',
                '', // NIK opsional
                'hendra.pratama@example.com',
                'Jl. MT Haryono Gg 4 No. 10, Ketawanggede, Kota Malang',
                '-7.9512,112.6087',
                '081398765432',
                'PPPOE',
                'Server Distribusi Utama X86',
                'Kantor Resmi FibermediaPlay',
                'hendra@1003',
                'PasswordHendra789',
                '30 Mbps Home Basic',
                'Rp. 135.000',
                '',
                'pool-dinoyo',
                'none',
                '30M/30M',
                '1 Bulan',
                '15 Jun 2026',
                'Active',
                '',
                'ODP-KTW-01',
                'Jl. MT Haryono Tiang 05',
                '-7.9515,112.6089',
                'Kapasitas 8 Port',
                '3',
                '0',
                'Lowokwaru',
                '',
                '',
                'Migrasi tanpa NIK',
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

    public function getCsvSettings(): array
    {
        return [
            'delimiter' => ',',
            'enclosure' => '"',
            'use_bom' => true,
            'output_encoding' => 'UTF-8',
        ];
    }
}
