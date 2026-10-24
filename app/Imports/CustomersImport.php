<?php

namespace App\Imports;

use App\Models\Customer;
use App\Utils\IdentifierGenerator;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class CustomersImport implements ToCollection, WithHeadingRow
{
    private int $importedCount = 0;

    private int $updatedCount = 0;

    private int $skippedCount = 0;

    private array $errors = [];

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // Row 1 is header
            $rowData = is_array($row) ? $row : (method_exists($row, 'toArray') ? $row->toArray() : (array) $row);

            // Extract values with flexible keys
            $name = $this->getValue($rowData, ['nama_pelanggan', 'nama', 'name', 'customer_name']);
            $phone = $this->getValue($rowData, ['nomor_telepon', 'telepon', 'phone', 'no_wa', 'no_telepon', 'nomor_wa']);
            $address = $this->getValue($rowData, ['alamat_lengkap', 'alamat', 'address', 'customer_address']);
            $package = $this->getValue($rowData, ['paket_layanan', 'paket', 'package', 'package_name']) ?: '30 Mbps Home Basic';
            $odpCode = $this->getValue($rowData, ['kode_odp', 'odp_code', 'odp']);
            $statusRaw = strtolower(trim($this->getValue($rowData, ['status']) ?: 'active'));
            $customerCode = trim($this->getValue($rowData, ['kode_pelanggan', 'customer_code', 'kode']) ?: '');

            // Skip completely empty rows
            if (empty($name) && empty($phone) && empty($address)) {
                $this->skippedCount++;

                continue;
            }

            // Validation: Name is required
            if (empty($name)) {
                $this->errors[] = "Baris {$rowNum}: Nama pelanggan tidak boleh kosong.";
                $this->skippedCount++;

                continue;
            }

            // Normalisasi status
            $status = match ($statusRaw) {
                'aktif', 'active' => 'active',
                'suspend', 'suspended', 'isolir' => 'suspended',
                'terminated', 'non-aktif', 'putus', 'berhenti' => 'terminated',
                default => 'active',
            };

            // Normalisasi no telepon (hapus spasi, tanda minus, titik)
            $phoneClean = preg_replace('/[^0-9+]/', '', (string) $phone);

            // Auto-generate kode pelanggan jika tidak disediakan
            if (empty($customerCode)) {
                $customerCode = IdentifierGenerator::generateCustomerCode(null, now());
                // Pastikan unik
                while (Customer::where('customer_code', $customerCode)->exists()) {
                    $customerCode = 'FM-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));
                }
            }

            try {
                $existing = Customer::where('customer_code', $customerCode)->first();

                if ($existing) {
                    $existing->update([
                        'name' => $name,
                        'phone' => $phoneClean ?: $existing->phone,
                        'address' => $address ?: $existing->address,
                        'package' => $package,
                        'odp_code' => $odpCode ?: $existing->odp_code,
                        'status' => $status,
                    ]);
                    $this->updatedCount++;
                } else {
                    Customer::create([
                        'customer_code' => $customerCode,
                        'name' => $name,
                        'phone' => $phoneClean ?: '-',
                        'address' => $address ?: '-',
                        'package' => $package,
                        'odp_code' => $odpCode,
                        'status' => $status,
                    ]);
                    $this->importedCount++;
                }
            } catch (\Throwable $e) {
                $this->errors[] = "Baris {$rowNum} ({$name}): ".$e->getMessage();
                $this->skippedCount++;
            }
        }
    }

    private function getValue(array $row, array $keys): ?string
    {
        foreach ($keys as $key) {
            // Check direct key or sanitized key
            foreach ($row as $k => $v) {
                $sanitized = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $k)));
                if ($sanitized === $key || str_contains($sanitized, $key)) {
                    $val = trim((string) $v);
                    if ($val !== '') {
                        return $val;
                    }
                }
            }
        }

        return null;
    }

    public function getImportedCount(): int
    {
        return $this->importedCount;
    }

    public function getUpdatedCount(): int
    {
        return $this->updatedCount;
    }

    public function getSkippedCount(): int
    {
        return $this->skippedCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
