<?php

namespace App\Exports;

use App\Models\Submission;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class SubmissionsExport implements FromCollection, WithHeadings, WithMapping
{
    protected $status;

    public function __construct($status = null)
    {
        $this->status = $status;
    }

    public function collection()
    {
        $query = Submission::query()->with('user');

        if ($this->status) {
            $query->where('status', $this->status);
        }

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nomor Pengajuan',
            'Nama Sales',
            'Nama Pelanggan',
            'Nomor Telepon',
            'Alamat',
            'Paket Layanan',
            'Status',
            'Tanggal Dibuat',
        ];
    }

    public function map($submission): array
    {
        $statusValue = $submission->status instanceof \UnitEnum
            ? $submission->status->value
            : (string) ($submission->status ?? '');

        return [
            $submission->id,
            $submission->submission_number,
            $submission->user->name ?? 'N/A',
            $submission->customer_name,
            $submission->phone,
            $submission->address.', '.$submission->district.', '.$submission->city,
            $submission->package_name,
            strtoupper($statusValue),
            $submission->created_at ? $submission->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
