<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class AttendanceRecapExport implements FromArray, WithHeadings, WithTitle
{
    protected array $data;

    protected string $month;

    public function __construct(array $recapData)
    {
        $this->data = $recapData['people'] ?? [];
        $this->month = $recapData['month'] ?? date('Y-m');
    }

    public function array(): array
    {
        return array_map(function ($row) {
            return [
                'name' => $row['name'],
                'email' => $row['email'],
                'team' => $row['team_name'],
                'hadir' => $row['hadir'],
                'izin' => $row['izin'],
                'sakit' => $row['sakit'],
                'alpa' => $row['alpa'],
                'work_days' => $row['work_days'],
                'attendance_rate' => $row['attendance_rate'].'%',
            ];
        }, $this->data);
    }

    public function headings(): array
    {
        return [
            'Nama Karyawan',
            'Email',
            'Tim',
            'Hadir',
            'Izin',
            'Sakit',
            'Alpa',
            'Hari Kerja',
            'Persentase Kehadiran',
        ];
    }

    public function title(): string
    {
        return 'Rekap Absensi '.$this->month;
    }
}
