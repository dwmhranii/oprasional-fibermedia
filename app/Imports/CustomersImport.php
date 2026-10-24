<?php

namespace App\Imports;

use App\Models\BrasDevice;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Team;
use App\Models\User;
use App\Utils\IdentifierGenerator;
use Carbon\Carbon;
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
        // Cache lookup tables for performance
        $packages = Package::all()->keyBy(fn ($p) => strtolower(trim($p->name)));
        $odps = Odp::all()->keyBy(fn ($o) => strtolower(trim($o->code)));
        $brasDevices = BrasDevice::all()->keyBy(fn ($b) => strtolower(trim($b->name)));
        $teams = Team::all()->keyBy(fn ($t) => strtolower(trim($t->name)));
        $users = User::all()->keyBy(fn ($u) => strtolower(trim($u->name)));

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // Row 1 is header
            $rowData = is_array($row) ? $row : (method_exists($row, 'toArray') ? $row->toArray() : (array) $row);

            $name = $this->getValue($rowData, ['nama_pelanggan', 'nama', 'name', 'customer_name']);
            $customerCode = trim((string) $this->getValue($rowData, ['id_pelanggan', 'kode_pelanggan', 'customer_code', 'kode']));
            $externalRef = $this->getValue($rowData, ['ref_eksternal', 'external_ref']);
            $nik = $this->getValue($rowData, ['nik', 'no_ktp', 'nomor_ktp']);
            $phone = $this->getValue($rowData, ['nomor_telepon', 'telepon', 'phone', 'no_wa', 'no_telepon', 'nomor_wa']);
            $email = $this->getValue($rowData, ['email', 'surel']);
            $address = $this->getValue($rowData, ['alamat_lengkap', 'alamat', 'address', 'customer_address']);
            $latitude = $this->getNumericValue($rowData, ['latitude', 'lat']);
            $longitude = $this->getNumericValue($rowData, ['longitude', 'lng', 'long']);
            $serviceType = strtolower(trim((string) ($this->getValue($rowData, ['tipe_layanan', 'service_type', 'tipe']) ?: 'pppoe')));
            $brasInput = $this->getValue($rowData, ['server_bras', 'bras', 'bras_id', 'router']);
            $collector = $this->getValue($rowData, ['kolektor', 'collector']);
            $username = $this->getValue($rowData, ['username_layanan', 'username', 'pppoe_username']);
            $password = $this->getValue($rowData, ['password_layanan', 'password', 'pppoe_password']);
            $packageInput = $this->getValue($rowData, ['paket_layanan', 'paket', 'package', 'package_name']);
            $priceInput = $this->getNumericValue($rowData, ['harga_bulanan', 'harga', 'monthly_price', 'price']);
            $localAddress = $this->getValue($rowData, ['local_address', 'ip_lokal']);
            $remoteAddress = $this->getValue($rowData, ['remote_address', 'ip_remote']);
            $parentQueue = $this->getValue($rowData, ['parent_queue', 'queue']);
            $rateLimit = $this->getValue($rowData, ['rate_limit', 'speed', 'kecepatan']);
            $subscribedAt = $this->getDateValue($rowData, ['tanggal_berlangganan', 'subscribed_at', 'tgl_langganan']);
            $expiresAt = $this->getDateValue($rowData, ['tanggal_jatuh_tempo', 'expires_at', 'jatuh_tempo', 'expired']);
            $statusRaw = strtolower(trim((string) ($this->getValue($rowData, ['status']) ?: 'active')));
            $onuIndex = $this->getValue($rowData, ['onu_index', 'onu']);
            $odpInput = $this->getValue($rowData, ['odp', 'kode_odp', 'odp_code', 'nama_odp']);
            $odpPort = $this->getIntegerValue($rowData, ['port_odp', 'odp_port', 'port']);
            $debt = $this->getNumericValue($rowData, ['hutang', 'debt', 'tunggakan']) ?: 0;
            $wilayah = $this->getValue($rowData, ['wilayah', 'area']);
            $teamInput = $this->getValue($rowData, ['tim_pemasang', 'tim', 'team', 'installed_by_team']);
            $salesInput = $this->getValue($rowData, ['sales', 'sales_name', 'marketing']);
            $notes = $this->getValue($rowData, ['catatan', 'notes', 'keterangan']);

            // Skip completely blank row
            if (empty($name) && empty($phone) && empty($address) && empty($customerCode)) {
                $this->skippedCount++;
                continue;
            }

            // Validasi baris: Nama wajib
            if (empty($name)) {
                $this->errors[] = "Baris {$rowNum}: Nama pelanggan tidak boleh kosong.";
                $this->skippedCount++;
                continue;
            }

            // Validasi baris: Telepon wajib
            if (empty($phone)) {
                $this->errors[] = "Baris {$rowNum} ({$name}): Nomor telepon tidak boleh kosong.";
                $this->skippedCount++;
                continue;
            }

            // Validasi NIK jika diisi
            if (! empty($nik)) {
                $nikDigits = preg_replace('/\D+/', '', (string) $nik);
                if (strlen($nikDigits) !== 16) {
                    $this->errors[] = "Baris {$rowNum} ({$name}): NIK harus 16 digit angka (ditemukan: {$nik}).";
                    $this->skippedCount++;
                    continue;
                }
                $nik = $nikDigits;
            }

            // Resolusi Paket
            $packageId = null;
            $packageName = $packageInput;
            $monthlyPrice = $priceInput;
            if ($packageInput) {
                $key = strtolower(trim($packageInput));
                if (isset($packages[$key])) {
                    $packageId = $packages[$key]->id;
                    $packageName = $packages[$key]->name;
                    if ($monthlyPrice === null) {
                        $monthlyPrice = (float) $packages[$key]->price;
                    }
                }
            }

            // Resolusi ODP
            $odpId = null;
            if ($odpInput) {
                $key = strtolower(trim($odpInput));
                if (isset($odps[$key])) {
                    $odpId = $odps[$key]->id;
                } else {
                    // Cari berdasarkan name atau code
                    $matched = Odp::where('code', 'like', $odpInput)->orWhere('name', 'like', $odpInput)->first();
                    if ($matched) {
                        $odpId = $matched->id;
                    }
                }
            }

            // Validasi port ODP unik per ODP jika ditentukan
            if ($odpId && $odpPort) {
                $portConflict = Customer::where('odp_id', $odpId)
                    ->where('odp_port', $odpPort)
                    ->when($customerCode, fn ($q) => $q->where('customer_code', '!=', $customerCode))
                    ->exists();

                if ($portConflict) {
                    $this->errors[] = "Baris {$rowNum} ({$name}): Port {$odpPort} pada ODP {$odpInput} sudah digunakan pelanggan lain.";
                    $this->skippedCount++;
                    continue;
                }
            }

            // Resolusi BRAS
            $brasId = null;
            if ($brasInput) {
                $key = strtolower(trim($brasInput));
                if (isset($brasDevices[$key])) {
                    $brasId = $brasDevices[$key]->id;
                } elseif (is_numeric($brasInput)) {
                    $brasId = (int) $brasInput;
                }
            }

            // Resolusi Tim
            $teamId = null;
            if ($teamInput) {
                $key = strtolower(trim($teamInput));
                if (isset($teams[$key])) {
                    $teamId = $teams[$key]->id;
                } elseif (is_numeric($teamInput)) {
                    $teamId = (int) $teamInput;
                }
            }

            // Resolusi Sales
            $salesId = null;
            if ($salesInput) {
                $key = strtolower(trim($salesInput));
                if (isset($users[$key])) {
                    $salesId = $users[$key]->id;
                } elseif (is_numeric($salesInput)) {
                    $salesId = (int) $salesInput;
                }
            }

            // Normalisasi status
            $status = match ($statusRaw) {
                'aktif', 'active' => 'active',
                'suspend', 'suspended', 'isolir' => 'suspended',
                'terminated', 'non-aktif', 'putus', 'berhenti' => 'terminated',
                'inactive', 'tidak aktif' => 'inactive',
                default => 'active',
            };

            // Normalisasi service_type
            if (! in_array($serviceType, ['pppoe', 'ipoe', 'static'])) {
                $serviceType = 'pppoe';
            }

            // Kode pelanggan
            if (empty($customerCode)) {
                $customerCode = IdentifierGenerator::generateCustomerCode(null, now());
                while (Customer::where('customer_code', $customerCode)->exists()) {
                    $customerCode = 'FM-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));
                }
            }

            try {
                $customerData = [
                    'name' => $name,
                    'phone' => $phone,
                    'email' => $email,
                    'address' => $address ?: '-',
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'service_type' => $serviceType,
                    'bras_id' => $brasId,
                    'collector' => $collector,
                    'username' => $username,
                    'package_id' => $packageId,
                    'package' => $packageName,
                    'monthly_price' => $monthlyPrice ?: 0,
                    'local_address' => $localAddress,
                    'remote_address' => $remoteAddress,
                    'parent_queue' => $parentQueue,
                    'rate_limit' => $rateLimit,
                    'subscribed_at' => $subscribedAt,
                    'expires_at' => $expiresAt,
                    'status' => $status,
                    'onu_index' => $onuIndex,
                    'odp_id' => $odpId,
                    'odp_port' => $odpPort,
                    'debt' => $debt,
                    'wilayah' => $wilayah,
                    'installed_by_team_id' => $teamId,
                    'sales_id' => $salesId,
                    'notes' => $notes,
                ];

                if (! empty($externalRef)) {
                    $customerData['external_ref'] = $externalRef;
                }
                if (! empty($nik)) {
                    $customerData['nik'] = $nik;
                }
                if (! empty($password) && $password !== '••••••••' && $password !== '-') {
                    $customerData['password'] = $password;
                }

                $existing = Customer::where('customer_code', $customerCode)->first();

                if ($existing) {
                    $existing->update($customerData);
                    $this->updatedCount++;
                } else {
                    $customerData['customer_code'] = $customerCode;
                    Customer::create($customerData);
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
            foreach ($row as $k => $v) {
                $sanitized = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $k)));
                if ($sanitized === $key || str_contains($sanitized, $key)) {
                    $val = trim((string) $v);
                    if ($val !== '' && $val !== '-') {
                        return $val;
                    }
                }
            }
        }

        return null;
    }

    private function getNumericValue(array $row, array $keys): ?float
    {
        $val = $this->getValue($row, $keys);
        if ($val === null) {
            return null;
        }

        $clean = preg_replace('/[^0-9.-]/', '', $val);

        return is_numeric($clean) ? (float) $clean : null;
    }

    private function getIntegerValue(array $row, array $keys): ?int
    {
        $val = $this->getValue($row, $keys);
        if ($val === null) {
            return null;
        }

        $clean = preg_replace('/[^0-9]/', '', $val);

        return is_numeric($clean) ? (int) $clean : null;
    }

    private function getDateValue(array $row, array $keys): ?string
    {
        $val = $this->getValue($row, $keys);
        if ($val === null) {
            return null;
        }

        try {
            return Carbon::parse($val)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
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
