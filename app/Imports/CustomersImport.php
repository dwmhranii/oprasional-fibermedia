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
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class CustomersImport implements ToCollection, WithCustomCsvSettings, WithHeadingRow
{
    private bool $isDryRun = false;

    private string $delimiter = ',';

    private int $importedCount = 0;

    private int $updatedCount = 0;

    private int $skippedCount = 0;

    private int $duplicateCount = 0;

    private int $portConflictCount = 0;

    private array $errors = [];

    protected bool $strictNik = true;

    public function __construct(bool $isDryRun = false, string $delimiter = ',', bool $strictNik = true)
    {
        $this->isDryRun = $isDryRun;
        $this->delimiter = $delimiter;
        $this->strictNik = $strictNik;
    }

    public function getCsvSettings(): array
    {
        return [
            'delimiter' => $this->delimiter,
            'input_encoding' => 'UTF-8',
        ];
    }

    public function collection(Collection $rows)
    {
        // Cache lookup tabel master (indexed by lowercase name & code)
        $packagesByName = Package::all()->keyBy(fn ($p) => strtolower(trim($p->name)));
        $packagesByCode = Package::all()->keyBy(fn ($p) => strtolower(trim($p->code)));
        $odpsByCode = Odp::all()->keyBy(fn ($o) => strtolower(trim($o->code)));
        $odpsByName = Odp::all()->keyBy(fn ($o) => strtolower(trim($o->name)));
        $brasDevices = BrasDevice::all()->keyBy(fn ($b) => strtolower(trim($b->name)));
        $teams = Team::all()->keyBy(fn ($t) => strtolower(trim($t->name)));
        $users = User::all()->keyBy(fn ($u) => strtolower(trim($u->name)));
        $usedCustomerCodes = [];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // Baris 1 adalah header
            $name = '';

            try {
                $rowData = is_array($row) ? $row : (method_exists($row, 'toArray') ? $row->toArray() : (array) $row);

                // 1. Ekstraksi 35 Kolom Sesuai PRD Bagian 11
                $externalRef = $this->getValue($rowData, ['id_user', 'user_id', 'legacy_user_id', 'ref_eksternal', 'external_ref']);
                $customerCode = trim((string) $this->getValue($rowData, ['id_pelanggan', 'kode_pelanggan', 'customer_code', 'kode']));
                $createdDateRaw = $this->getValue($rowData, ['tanggal_dibuat', 'tgl_dibuat', 'created_at']);
                $name = (string) ($this->getValue($rowData, ['nama', 'nama_pelanggan', 'name', 'customer_name']) ?? '');
                $nik = $this->getValue($rowData, ['nik', 'no_ktp', 'nomor_ktp']);
                $email = $this->getValue($rowData, ['email', 'surel']);
                $address = $this->getValue($rowData, ['alamat', 'alamat_lengkap', 'address', 'customer_address']);
                $coordInput = $this->getValue($rowData, ['koordinat', 'coordinates', 'coordinate', 'lat_lng', 'latlng']);
                $phone = $this->getValue($rowData, ['nomor_telepon', 'telepon', 'phone', 'no_wa', 'no_telepon', 'nomor_wa']);
                $serviceType = strtolower(trim((string) ($this->getValue($rowData, ['tipe', 'tipe_layanan', 'service_type']) ?: 'pppoe')));
                $brasInput = $this->getValue($rowData, ['server', 'server_bras', 'bras', 'bras_id', 'router']);
                $collector = $this->getValue($rowData, ['collector', 'kolektor']);
                $username = $this->getValue($rowData, ['username', 'username_layanan', 'pppoe_username']);
                $password = $this->getValue($rowData, ['password', 'password_layanan', 'pppoe_password']);
                $packageInput = $this->getValue($rowData, ['paket', 'paket_layanan', 'package', 'package_name']);
                $priceInput = $this->parseCurrency($this->getValue($rowData, ['harga', 'harga_bulanan', 'monthly_price', 'price']));
                $localAddress = $this->getValue($rowData, ['local_address', 'ip_lokal']);
                $remoteAddress = $this->getValue($rowData, ['remote_address', 'ip_remote']);
                $parentQueue = $this->getValue($rowData, ['parent_queue', 'queue']);
                $rateLimit = $this->getValue($rowData, ['rate_limit', 'speed', 'kecepatan']);
                $subscriptionPeriod = $this->getValue($rowData, ['berlangganan', 'periode_langganan', 'subscription_period']);
                $expiredDateRaw = $this->getValue($rowData, ['expired_date', 'tanggal_jatuh_tempo', 'expires_at', 'jatuh_tempo', 'expired']);
                $statusRaw = strtolower(trim((string) ($this->getValue($rowData, ['status']) ?: 'active')));
                $onuIndex = $this->getValue($rowData, ['onu_index', 'onu']);
                $odpInput = $this->getValue($rowData, ['nama_odp', 'odp', 'kode_odp', 'odp_code']);
                $odpAddressInput = $this->getValue($rowData, ['alamat_odp', 'odp_address']);
                $odpCoordInput = $this->getValue($rowData, ['koordinat_odp', 'odp_coordinate', 'odp_coordinates']);
                $odpNotesInput = $this->getValue($rowData, ['keterangan_odp', 'odp_notes']);
                $odpPort = $this->getIntegerValue($rowData, ['port_odp', 'odp_port', 'port']);
                $debtInput = $this->parseCurrency($this->getValue($rowData, ['hutang', 'debt', 'debt_amount', 'tunggakan']));
                $wilayah = $this->getValue($rowData, ['wilayah', 'area']);
                $teamInput = $this->getValue($rowData, ['teknisi', 'tim_pemasang', 'tim', 'team', 'installed_by_team']);
                $salesInput = $this->getValue($rowData, ['sales', 'sales_name', 'marketing']);
                $notes = $this->getValue($rowData, ['catatan', 'notes', 'keterangan']);

                // Sanitasi dan pemotongan panjang teks sesuai batas skema kolom
                $remoteAddress = $remoteAddress ? substr(trim($remoteAddress), 0, 150) : null;
                $rateLimit = $rateLimit ? substr(trim($rateLimit), 0, 150) : null;
                $localAddress = $localAddress ? substr(trim($localAddress), 0, 45) : null;
                $parentQueue = $parentQueue ? substr(trim($parentQueue), 0, 100) : null;
                $collector = $collector ? substr(trim($collector), 0, 100) : null;
                $username = $username ? substr(trim($username), 0, 100) : null;
                $onuIndex = $onuIndex ? substr(trim($onuIndex), 0, 50) : null;
                $wilayah = $wilayah ? substr(trim($wilayah), 0, 100) : null;
                $externalRef = $externalRef ? substr(trim($externalRef), 0, 100) : null;

                // Lewati baris kosong seutuhnya
                if (empty($name) && empty($phone) && empty($address) && empty($customerCode)) {
                    $this->skippedCount++;
                    continue;
                }

                // Validasi: Nama wajib
                if (empty($name)) {
                    $this->errors[] = "Baris {$rowNum}: Nama pelanggan tidak boleh kosong.";
                    $this->skippedCount++;
                    continue;
                }

                // Validasi: Telepon wajib
                if (empty($phone)) {
                    $this->errors[] = "Baris {$rowNum} ({$name}): Nomor telepon tidak boleh kosong.";
                    $this->skippedCount++;
                    continue;
                }

                // Validasi NIK (16 digit angka jika diisi)
                $nikHash = null;
                if (! empty($nik) && $nik !== '-') {
                    $nikDigits = preg_replace('/\D+/', '', (string) $nik);
                    if (strlen($nikDigits) !== 16) {
                        if ($this->strictNik) {
                            $this->errors[] = "Baris {$rowNum} ({$name}): NIK harus 16 digit angka (ditemukan: {$nik}).";
                            $this->skippedCount++;
                            continue;
                        } else {
                            $this->errors[] = "[PERINGATAN] Baris {$rowNum} ({$name}): NIK ({$nik}) tidak 16 digit angka, tetap diimpor sebagai data warisan.";
                        }
                    }
                    $nik = $nikDigits;
                    $nikHash = hash_hmac('sha256', $nikDigits, (string) config('app.key'));

                    // Cek duplikat NIK di sistem untuk pelanggan lain
                    $duplicateNik = Customer::where('nik_hash', $nikHash)
                        ->when($customerCode, fn ($q) => $q->where('customer_code', '!=', $customerCode))
                        ->exists();

                    if ($duplicateNik) {
                        if ($this->strictNik) {
                            $this->errors[] = "Baris {$rowNum} ({$name}): NIK {$nik} sudah terdaftar pada pelanggan lain.";
                            $this->duplicateCount++;
                            $this->skippedCount++;
                            continue;
                        } else {
                            $this->errors[] = "[PERINGATAN] Baris {$rowNum} ({$name}): NIK {$nik} terdaftar pada lebih dari satu akun (pelanggan multi-layanan/cabang).";
                            $this->duplicateCount++;
                        }
                    }
                } else {
                    $nik = null;
                }

                // Koordinat Pelanggan
                $latitude = $this->getNumericValue($rowData, ['latitude', 'lat']);
                $longitude = $this->getNumericValue($rowData, ['longitude', 'lng', 'long']);
                if ($coordInput && str_contains($coordInput, ',')) {
                    [$latPart, $lngPart] = explode(',', $coordInput, 2);
                    $latitude = (float) trim($latPart);
                    $longitude = (float) trim($lngPart);
                }

                // Parsing Tanggal Dibuat / Berlangganan
                $subscribedAt = $this->parseDate($createdDateRaw) ?: $this->parseDate($subscriptionPeriod) ?: now()->toDateString();
                $expiresAt = $this->parseDate($expiredDateRaw);

                // Normalisasi Parent Queue
                if ($parentQueue === 'none' || $parentQueue === '-') {
                    $parentQueue = null;
                }

                // Normalisasi Status (active, suspended, terminated)
                $status = match ($statusRaw) {
                    'aktif', 'active' => 'active',
                    'suspend', 'suspended', 'isolir' => 'suspended',
                    'terminated', 'non-aktif', 'putus', 'berhenti' => 'terminated',
                    default => 'active',
                };

                // Normalisasi service_type (pppoe, hotspot, static)
                if (! in_array($serviceType, ['pppoe', 'hotspot', 'static'])) {
                    $serviceType = 'pppoe';
                }

                // Resolusi Paket Layanan
                $packageId = null;
                $packageName = $packageInput;
                $monthlyPrice = $priceInput;
                if ($packageInput) {
                    $key = strtolower(trim($packageInput));
                    $matchedPkg = $packagesByName[$key] ?? $packagesByCode[$key] ?? null;

                    if (! $matchedPkg) {
                        $matchedPkg = Package::whereRaw('LOWER(TRIM(name)) = ?', [$key])
                            ->orWhereRaw('LOWER(TRIM(code)) = ?', [$key])
                            ->first();
                        if ($matchedPkg) {
                            $packagesByName[strtolower(trim($matchedPkg->name))] = $matchedPkg;
                            $packagesByCode[strtolower(trim($matchedPkg->code))] = $matchedPkg;
                        }
                    }

                    if ($matchedPkg) {
                        $packageId = $matchedPkg->id;
                        $packageName = $matchedPkg->name;
                        if ($monthlyPrice === null || $monthlyPrice <= 0) {
                            $monthlyPrice = (float) $matchedPkg->price;
                        }
                    } else {
                        // Buat master paket baru jika belum terdaftar
                        // Format code deskriptif dan unik tanpa truncation sempit
                        $cleanName = strtoupper((string) preg_replace('/[^A-Za-z0-9]+/', '-', trim($packageInput)));
                        $cleanName = trim($cleanName, '-');
                        $baseSlug = substr($cleanName, 0, 60);
                        if (empty($baseSlug)) {
                            $baseSlug = strtoupper(Str::random(8));
                        }
                        $baseCode = str_starts_with($baseSlug, 'PKG-') ? $baseSlug : 'PKG-'.$baseSlug;
                        $baseCode = substr($baseCode, 0, 85);

                        $code = $baseCode;
                        $counter = 1;
                        while (isset($packagesByCode[strtolower($code)]) || Package::where('code', $code)->exists()) {
                            $suffix = '-'.$counter;
                            $code = substr($baseCode, 0, 100 - strlen($suffix)).$suffix;
                            $counter++;
                        }

                        $speedMbps = 0;
                        if (preg_match('/(\d+)\s*(?:mbps|m\b)/i', $packageInput.' '.(string) $rateLimit, $speedMatches)) {
                            $speedMbps = (int) $speedMatches[1];
                        }

                        if ($this->isDryRun) {
                            $mockPkg = new Package([
                                'id' => 0,
                                'code' => $code,
                                'name' => $packageInput,
                                'speed_mbps' => $speedMbps,
                                'price' => $monthlyPrice ?: 0,
                                'is_active' => true,
                            ]);
                            $packageId = 0;
                            $packageName = $packageInput;
                            $packagesByName[$key] = $mockPkg;
                            $packagesByCode[strtolower($code)] = $mockPkg;
                        } else {
                            $newPkg = Package::create([
                                'code' => $code,
                                'name' => $packageInput,
                                'speed_mbps' => $speedMbps,
                                'price' => $monthlyPrice ?: 0,
                                'is_active' => true,
                            ]);
                            $packageId = $newPkg->id;
                            $packageName = $newPkg->name;
                            $packagesByName[$key] = $newPkg;
                            $packagesByCode[strtolower($code)] = $newPkg;
                        }
                    }
                }

                // Resolusi Server / BRAS
                $brasId = null;
                if ($brasInput && $brasInput !== '-') {
                    $key = strtolower(trim($brasInput));
                    $matchedBras = $brasDevices[$key] ?? BrasDevice::where('name', $brasInput)->first();
                    if ($matchedBras) {
                        $brasId = $matchedBras->id;
                        $brasDevices[$key] = $matchedBras;
                    } elseif (! $this->isDryRun) {
                        $newBras = BrasDevice::firstOrCreate(
                            ['name' => substr(trim($brasInput), 0, 100)],
                            ['is_active' => true]
                        );
                        $brasId = $newBras->id;
                        $brasDevices[$key] = $newBras;
                    }
                }

                // Resolusi ODP
                $odpId = null;
                if ($odpInput && $odpInput !== '-') {
                    $key = strtolower(trim($odpInput));
                    $matchedOdp = $odpsByCode[$key] ?? $odpsByName[$key] ?? null;
                    if (! $matchedOdp) {
                        $matchedOdp = Odp::where('code', $odpInput)->orWhere('name', $odpInput)->first();
                        if ($matchedOdp) {
                            $odpsByCode[strtolower(trim($matchedOdp->code))] = $matchedOdp;
                            $odpsByName[strtolower(trim($matchedOdp->name))] = $matchedOdp;
                        }
                    }

                    if ($matchedOdp) {
                        $odpId = $matchedOdp->id;
                    } else {
                        $baseOdpCode = substr(trim($odpInput), 0, 45);
                        $odpCode = $baseOdpCode;
                        $cnt = 1;
                        while (isset($odpsByCode[strtolower($odpCode)]) || Odp::where('code', $odpCode)->exists()) {
                            $sfx = '-'.$cnt;
                            $odpCode = substr($baseOdpCode, 0, 50 - strlen($sfx)).$sfx;
                            $cnt++;
                        }

                        if ($this->isDryRun) {
                            $mockOdp = new Odp([
                                'id' => 0,
                                'code' => $odpCode,
                                'name' => $odpInput,
                                'port_capacity' => 8,
                                'is_active' => true,
                            ]);
                            $odpId = 0;
                            $odpsByCode[strtolower($odpCode)] = $mockOdp;
                            $odpsByName[$key] = $mockOdp;
                        } else {
                            $odpLat = null;
                            $odpLng = null;
                            if ($odpCoordInput && str_contains($odpCoordInput, ',')) {
                                [$latP, $lngP] = explode(',', $odpCoordInput, 2);
                                $odpLat = (float) trim($latP);
                                $odpLng = (float) trim($lngP);
                            }
                            $newOdp = Odp::create([
                                'code' => $odpCode,
                                'name' => substr(trim($odpInput), 0, 150),
                                'address' => $odpAddressInput,
                                'latitude' => $odpLat,
                                'longitude' => $odpLng,
                                'port_capacity' => 8,
                                'wilayah' => $wilayah,
                                'notes' => $odpNotesInput,
                                'is_active' => true,
                            ]);
                            $odpId = $newOdp->id;
                            $odpsByCode[strtolower($odpCode)] = $newOdp;
                            $odpsByName[$key] = $newOdp;
                        }
                    }
                }

                // Validasi Port ODP Unik (Pencegahan Port Bentrok)
                if ($odpId && $odpPort) {
                    $portConflict = Customer::where('odp_id', $odpId)
                        ->where('odp_port', $odpPort)
                        ->whereIn('status', ['active', 'suspended', 'held'])
                        ->when($customerCode, fn ($q) => $q->where('customer_code', '!=', $customerCode))
                        ->exists();

                    if ($portConflict) {
                        $this->errors[] = "Baris {$rowNum} ({$name}): Port {$odpPort} pada ODP {$odpInput} sudah digunakan pelanggan aktif lain.";
                        $this->portConflictCount++;
                        $this->skippedCount++;
                        continue;
                    }
                }

                // Resolusi Tim Teknisi
                $teamId = null;
                if ($teamInput && $teamInput !== '-') {
                    $key = strtolower(trim($teamInput));
                    if (isset($teams[$key])) {
                        $teamId = $teams[$key]->id;
                    } elseif (is_numeric($teamInput)) {
                        $teamId = (int) $teamInput;
                    }
                }

                // Resolusi Sales
                $salesId = null;
                if ($salesInput && $salesInput !== '-') {
                    $key = strtolower(trim($salesInput));
                    if (isset($users[$key])) {
                        $salesId = $users[$key]->id;
                    } elseif (is_numeric($salesInput)) {
                        $salesId = (int) $salesInput;
                    }
                }

                // Kode Pelanggan
                if (empty($customerCode)) {
                    $customerCode = IdentifierGenerator::generateCustomerCode(null, now());
                    while (isset($usedCustomerCodes[$customerCode]) || Customer::where('customer_code', $customerCode)->exists()) {
                        $customerCode = 'FM-'.date('Ymd').'-'.strtoupper(substr(uniqid(), -4));
                    }
                }
                $usedCustomerCodes[$customerCode] = true;

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
                    'debt' => $debtInput ?: 0,
                    'debt_amount' => $debtInput ?: 0,
                    'wilayah' => $wilayah,
                    'installed_by_team_id' => $teamId,
                    'sales_id' => $salesId,
                    'notes' => $notes ? "{$notes} [Impor CSV]" : '[Impor CSV]',
                    'location_source' => 'import',
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

                if ($this->isDryRun) {
                    if ($existing) {
                        $this->updatedCount++;
                    } else {
                        $this->importedCount++;
                    }
                } else {
                    if ($existing) {
                        $existing->update($customerData);
                        $this->updatedCount++;
                    } else {
                        $customerData['customer_code'] = $customerCode;
                        Customer::create($customerData);
                        $this->importedCount++;
                    }
                }
            } catch (\Throwable $e) {
                $rowName = ! empty($name) ? " ({$name})" : '';
                $this->errors[] = "Baris {$rowNum}{$rowName}: ".$e->getMessage();
                $this->skippedCount++;
            }
        }
    }

    private function getValue(array $row, array $keys): ?string
    {
        // 1. Prioritas kecocokan persis (Exact match)
        foreach ($keys as $key) {
            foreach ($row as $k => $v) {
                $sanitized = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $k)));
                $sanitized = trim($sanitized, '_');
                if ($sanitized === $key) {
                    $val = trim((string) $v);
                    if ($val !== '' && $val !== '-') {
                        return $val;
                    }
                }
            }
        }

        // 2. Kecocokan substring bila exact match tidak ada
        foreach ($keys as $key) {
            foreach ($row as $k => $v) {
                $sanitized = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $k)));
                $sanitized = trim($sanitized, '_');
                if (str_contains($sanitized, $key)) {
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

    private function parseCurrency(?string $val): ?float
    {
        if ($val === null || $val === '' || $val === '-') {
            return 0;
        }

        // Hapus 'Rp', titik, spasi
        $cleaned = preg_replace('/[^\d]/', '', $val);

        return is_numeric($cleaned) ? (float) $cleaned : 0;
    }

    private function parseDate(?string $val): ?string
    {
        if ($val === null || $val === '' || $val === '-') {
            return null;
        }

        // Normalisasi nama bulan Indonesia ke Inggris
        $idToEn = [
            'januari' => 'january', 'jan' => 'jan',
            'februari' => 'february', 'feb' => 'feb',
            'maret' => 'march', 'mar' => 'mar',
            'april' => 'april', 'apr' => 'apr',
            'mei' => 'may',
            'juni' => 'june', 'jun' => 'jun',
            'juli' => 'july', 'jul' => 'jul',
            'agustus' => 'august', 'agu' => 'aug', 'agt' => 'aug',
            'september' => 'september', 'sep' => 'sep',
            'oktober' => 'october', 'okt' => 'oct',
            'november' => 'november', 'nov' => 'nov',
            'desember' => 'december', 'des' => 'dec',
        ];

        $lowered = strtolower(trim($val));
        foreach ($idToEn as $idMonth => $enMonth) {
            $lowered = preg_replace('/\b'.$idMonth.'\b/i', $enMonth, $lowered);
        }

        try {
            return Carbon::parse($lowered)->format('Y-m-d');
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

    public function getDuplicateCount(): int
    {
        return $this->duplicateCount;
    }

    public function getPortConflictCount(): int
    {
        return $this->portConflictCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
