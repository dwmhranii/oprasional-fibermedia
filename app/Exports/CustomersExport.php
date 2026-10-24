<?php

namespace App\Exports;

use App\Models\Customer;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CustomersExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    protected ?string $status;

    protected ?string $search;

    public function __construct(?string $status = null, ?string $search = null)
    {
        $this->status = $status && $status !== 'all' ? $status : null;
        $this->search = $search ? trim($search) : null;
    }

    public function collection()
    {
        $query = Customer::query()->orderBy('id', 'asc');

        if ($this->status) {
            $query->where('status', $this->status);
        }

        if ($this->search) {
            $s = $this->search;
            $query->where(function ($q) use ($s) {
                $q->where('customer_code', 'like', "%{$s}%")
                    ->orWhere('name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('address', 'like', "%{$s}%")
                    ->orWhere('package', 'like', "%{$s}%")
                    ->orWhere('odp_code', 'like', "%{$s}%");
            });
        }

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'No',
            'Kode Pelanggan',
            'Nama Pelanggan',
            'Nomor Telepon / WhatsApp',
            'Alamat Lengkap',
            'Paket Layanan',
            'Kode ODP',
            'Status',
            'Tanggal Terdaftar',
        ];
    }

    private int $rowNumber = 0;

    public function map($customer): array
    {
        $this->rowNumber++;

        $statusLabel = match ($customer->status) {
            'active' => 'Aktif',
            'suspended' => 'Ditangguhkan (Isolir)',
            'terminated' => 'Non-Aktif (Putus)',
            default => ucfirst($customer->status ?? 'Aktif'),
        };

        return [
            $this->rowNumber,
            $customer->customer_code,
            $customer->name,
            $customer->phone,
            $customer->address,
            $customer->package,
            $customer->odp_code ?? '-',
            $statusLabel,
            $customer->created_at ? $customer->created_at->format('Y-m-d H:i:s') : '-',
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
                    'startColor' => ['rgb' => '4F46E5'], // Indigo-600
                ],
            ],
        ];
    }
}
