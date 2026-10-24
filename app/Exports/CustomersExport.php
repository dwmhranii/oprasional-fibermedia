<?php

namespace App\Exports;

use App\Models\Customer;
use Illuminate\Support\Facades\Auth;
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

    protected bool $canViewSecrets;

    private int $rowNumber = 0;

    public function __construct(?string $status = null, ?string $search = null, ?bool $canViewSecrets = null)
    {
        $this->status = $status && $status !== 'all' ? $status : null;
        $this->search = $search ? trim($search) : null;

        if ($canViewSecrets !== null) {
            $this->canViewSecrets = $canViewSecrets;
        } else {
            $user = Auth::user();
            $this->canViewSecrets = $user && ($user->can('customers.view_secret') || $user->hasRole(['Superadmin', 'superadmin']));
        }
    }

    public function collection()
    {
        $query = Customer::query()->with(['servicePackage', 'odp', 'bras', 'installedByTeam', 'sales'])->orderBy('id', 'asc');

        if ($this->status) {
            $query->where('status', $this->status);
        }

        if ($this->search) {
            $s = $this->search;
            $query->where(function ($q) use ($s) {
                $q->where('customer_code', 'like', "%{$s}%")
                    ->orWhere('name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('username', 'like', "%{$s}%")
                    ->orWhere('address', 'like', "%{$s}%")
                    ->orWhereHas('odp', function ($oq) use ($s) {
                        $oq->where('code', 'like', "%{$s}%")->orWhere('name', 'like', "%{$s}%");
                    });
            });
        }

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'No',
            'ID Pelanggan',
            'Ref Eksternal',
            'Nama Pelanggan',
            'NIK',
            'Nomor Telepon',
            'Email',
            'Alamat',
            'Latitude',
            'Longitude',
            'Tipe Layanan',
            'Server BRAS',
            'Kolektor',
            'Username Layanan',
            'Password Layanan',
            'Paket Layanan',
            'Harga Bulanan',
            'Local Address',
            'Remote Address',
            'Parent Queue',
            'Rate Limit',
            'Tanggal Berlangganan',
            'Tanggal Jatuh Tempo',
            'Status',
            'Status Online',
            'Terakhir Online',
            'Terakhir Offline',
            'IP Saat Ini',
            'MAC Address',
            'Session Uptime',
            'ONU Index',
            'ODP',
            'Port ODP',
            'Hutang',
            'Wilayah',
            'Tim Pemasang',
            'Sales',
            'Catatan',
        ];
    }

    public function map($customer): array
    {
        $this->rowNumber++;

        // Masking NIK dan Password bila tidak memiliki izin khusus
        $nikValue = $this->canViewSecrets
            ? $customer->nik
            : $customer->masked_nik;

        $passwordValue = $this->canViewSecrets
            ? $customer->password
            : (filled($customer->password) ? '••••••••' : '-');

        return [
            $this->rowNumber,
            $customer->customer_code,
            $customer->external_ref ?? '-',
            $customer->name,
            $nikValue ?? '-',
            $customer->phone,
            $customer->email ?? '-',
            $customer->address,
            $customer->latitude ?? '-',
            $customer->longitude ?? '-',
            strtoupper($customer->service_type ?? 'PPPOE'),
            $customer->bras?->name ?? ($customer->bras_id ? "BRAS #{$customer->bras_id}" : '-'),
            $customer->collector ?? '-',
            $customer->username ?? '-',
            $passwordValue,
            $customer->servicePackage?->name ?? $customer->package ?? '-',
            (float) ($customer->monthly_price ?: ($customer->servicePackage?->price ?? 0)),
            $customer->local_address ?? '-',
            $customer->remote_address ?? '-',
            $customer->parent_queue ?? '-',
            $customer->rate_limit ?? '-',
            $customer->subscribed_at ? $customer->subscribed_at->format('Y-m-d') : '-',
            $customer->expires_at ? $customer->expires_at->format('Y-m-d') : '-',
            ucfirst($customer->status ?? 'active'),
            $customer->is_online ? 'Online' : 'Offline',
            $customer->last_online_at ? $customer->last_online_at->format('Y-m-d H:i:s') : '-',
            $customer->last_offline_at ? $customer->last_offline_at->format('Y-m-d H:i:s') : '-',
            $customer->current_ip_address ?? '-',
            $customer->current_mac_address ?? '-',
            $customer->session_uptime ?? '-',
            $customer->onu_index ?? '-',
            $customer->odp?->name ?? $customer->odp?->code ?? $customer->odp_code ?? '-',
            $customer->odp_port ?? '-',
            (float) $customer->debt,
            $customer->wilayah ?? '-',
            $customer->installedByTeam?->name ?? '-',
            $customer->sales?->name ?? '-',
            $customer->notes ?? '-',
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
                    'startColor' => ['rgb' => '1E293B'], // Slate-800
                ],
            ],
        ];
    }
}
