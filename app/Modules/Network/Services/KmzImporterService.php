<?php

namespace App\Modules\Network\Services;

use App\Models\Customer;
use App\Models\NetworkCable;
use App\Models\NetworkStatusLog;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SimpleXMLElement;
use ZipArchive;

class KmzImporterService
{
    /**
     * Batas area wajar (Malang Bululawang):
     * Longitude: 112.0 s.d. 114.0
     * Latitude: -9.0 s.d. -7.0
     */
    public const MIN_LON = 112.0;
    public const MAX_LON = 114.0;
    public const MIN_LAT = -9.0;
    public const MAX_LAT = -7.0;

    /**
     * Ekstrak berkas KML dari path berkas KMZ atau direktori.
     */
    public function extractKmlContent(string $path): string
    {
        if (is_dir($path)) {
            $docKml = $path.DIRECTORY_SEPARATOR.'doc.kml';
            if (file_exists($docKml)) {
                return file_get_contents($docKml);
            }
            throw new \InvalidArgumentException("Direktori tidak memuat berkas doc.kml: {$path}");
        }

        if (! file_exists($path)) {
            throw new \InvalidArgumentException("Berkas tidak ditemukan: {$path}");
        }

        // Jika langsung berkas .kml
        if (str_ends_with(strtolower($path), '.kml')) {
            return file_get_contents($path);
        }

        // Buka arsip zip/kmz
        $zip = new ZipArchive;
        if ($zip->open($path) === true) {
            $kmlContent = null;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (str_ends_with(strtolower($filename), '.kml')) {
                    $kmlContent = $zip->getFromIndex($i);
                    break;
                }
            }
            $zip->close();

            if ($kmlContent !== null) {
                return $kmlContent;
            }
            throw new \RuntimeException("Tidak ada berkas .kml di dalam arsip KMZ: {$path}");
        }

        throw new \RuntimeException("Gagal membuka arsip KMZ: {$path}");
    }

    /**
     * Impor data KMZ ke database.
     */
    public function import(string $filePath, bool $dryRun = false, ?int $userId = null): array
    {
        $kmlString = $this->extractKmlContent($filePath);

        // Hapus namespace default agar XPath & traversal SimpleXML lebih andal
        $cleanedKml = preg_replace('/xmlns="[^"]+"/', '', $kmlString);
        $cleanedKml = preg_replace('/<([a-zA-Z0-9]+):([a-zA-Z0-9]+)/', '<$2', $cleanedKml);
        $cleanedKml = preg_replace('/<\/([a-zA-Z0-9]+):([a-zA-Z0-9]+)/', '</$2', $cleanedKml);

        $xml = simplexml_load_string($cleanedKml, 'SimpleXMLElement', LIBXML_PARSEHUGE);
        if (! $xml) {
            throw new \RuntimeException('Format berkas KML tidak valid atau gagal di-parse.');
        }

        $folders = $xml->xpath('//Folder') ?: [];

        $reportRows = [];
        $invalidCoords = [];

        $stats = [
            'olts' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'odcs' => ['created' => 0, 'updated' => 0, 'skipped' => 0, 'disrupted' => 0],
            'odps' => ['created' => 0, 'updated' => 0, 'skipped' => 0],
            'cables' => ['created' => 0, 'updated' => 0, 'skipped' => 0, 'cut' => 0],
            'clients' => ['matched' => 0, 'skipped' => 0, 'invalid_coords' => 0],
            'total_created' => 0,
            'total_updated' => 0,
            'total_skipped' => 0,
            'total_rejected' => 0,
        ];

        $processImport = function () use (&$folders, &$stats, &$reportRows, &$invalidCoords, $userId, $dryRun) {
            // 1. Proses OLT (Server / OLT)
            $oltFolder = $this->findFolder($folders, ['server / olt', 'olt']);
            $oltMap = []; // code/name => id
            if ($oltFolder) {
                foreach ($oltFolder->Placemark as $pm) {
                    $this->importOlt($pm, $stats, $reportRows, $oltMap, $dryRun);
                }
            }

            // 2. Proses ODC
            $odcFolder = $this->findFolder($folders, ['odc']);
            $odcMap = []; // code/name => id
            if ($odcFolder) {
                foreach ($odcFolder->Placemark as $pm) {
                    $this->importOdc($pm, $stats, $reportRows, $odcMap, $userId, $dryRun);
                }
            }

            // 3. Proses ODP
            $odpFolder = $this->findFolder($folders, ['odp']);
            $odpMap = []; // code/name => id
            if ($odpFolder) {
                foreach ($odpFolder->Placemark as $pm) {
                    $this->importOdp($pm, $stats, $reportRows, $odpMap, $dryRun);
                }
            }

            // 4. Proses Kabel (Kabel / Jalur)
            $cablesOltToOdc = $this->findFolder($folders, ['kabel server/odc ke odc', 'server/odc ke odc']);
            $cablesOdcToOdp = $this->findFolder($folders, ['kabel odc ke odp', 'odc ke odp']);
            $cablesOdpToClient = $this->findFolder($folders, ['kabel odp ke client', 'odp ke client']);

            $allCableFolders = [
                'olt_odc' => $cablesOltToOdc,
                'odc_odp' => $cablesOdcToOdp,
                'odp_customer' => $cablesOdpToClient,
            ];

            $customerOdpLinks = []; // username => odp_name/code

            foreach ($allCableFolders as $kind => $folder) {
                if ($folder) {
                    foreach ($folder->Placemark as $pm) {
                        $this->importCable($pm, $kind, $stats, $reportRows, $oltMap, $odcMap, $odpMap, $customerOdpLinks, $userId, $dryRun);
                    }
                }
            }

            // 5. Proses Client (Client Online & Client Offline)
            $clientOnlineFolder = $this->findFolder($folders, ['client online']);
            $clientOfflineFolder = $this->findFolder($folders, ['client offline']);

            $clientPlacemarks = [];
            if ($clientOnlineFolder) {
                foreach ($clientOnlineFolder->Placemark as $pm) {
                    $clientPlacemarks[] = $pm;
                }
            }
            if ($clientOfflineFolder) {
                foreach ($clientOfflineFolder->Placemark as $pm) {
                    $clientPlacemarks[] = $pm;
                }
            }

            foreach ($clientPlacemarks as $pm) {
                $this->importClient($pm, $stats, $reportRows, $invalidCoords, $customerOdpLinks, $dryRun);
            }
        };

        if ($dryRun) {
            DB::beginTransaction();
            try {
                $processImport();
            } finally {
                DB::rollBack();
            }
        } else {
            DB::transaction(function () use ($processImport) {
                $processImport();
            });
        }

        $stats['total_created'] = $stats['olts']['created'] + $stats['odcs']['created'] + $stats['odps']['created'] + $stats['cables']['created'];
        $stats['total_updated'] = $stats['olts']['updated'] + $stats['odcs']['updated'] + $stats['odps']['updated'] + $stats['cables']['updated'] + $stats['clients']['matched'];
        $stats['total_skipped'] = $stats['olts']['skipped'] + $stats['odcs']['skipped'] + $stats['odps']['skipped'] + $stats['cables']['skipped'] + $stats['clients']['skipped'];
        $stats['total_rejected'] = count($invalidCoords);

        // Buat file CSV laporan
        $csvContent = $this->generateCsvReport($reportRows);
        $csvFilename = 'kmz_import_report_'.date('Ymd_His').'.csv';
        $reportDir = storage_path('app/reports');
        if (! file_exists($reportDir)) {
            File::makeDirectory($reportDir, 0755, true);
        }
        $csvPath = $reportDir.DIRECTORY_SEPARATOR.$csvFilename;
        File::put($csvPath, $csvContent);

        return [
            'success' => true,
            'dry_run' => $dryRun,
            'summary' => $stats,
            'invalid_coordinates_count' => count($invalidCoords),
            'invalid_coordinates' => $invalidCoords,
            'report_csv_path' => $csvPath,
            'report_csv_filename' => $csvFilename,
        ];
    }

    /**
     * Kumpulkan seluruh Folder secara rekursif.
     */
    protected function collectFolders(SimpleXMLElement $node, array &$folders): void
    {
        if (isset($node->Folder)) {
            foreach ($node->Folder as $folder) {
                $folders[] = $folder;
                $this->collectFolders($folder, $folders);
            }
        }
    }

    /**
     * Cari Folder berdasarkan kata kunci nama.
     */
    protected function findFolder(array $folders, array $keywords): ?SimpleXMLElement
    {
        foreach ($folders as $folder) {
            $name = strtolower(trim((string) $folder->name));
            foreach ($keywords as $kw) {
                if (str_contains($name, strtolower($kw))) {
                    return $folder;
                }
            }
        }

        return null;
    }

    /**
     * Parsing ExtendedData menjadi array asosiatif.
     */
    public function parseExtendedData(SimpleXMLElement $pm): array
    {
        $data = [];
        if (isset($pm->ExtendedData) && isset($pm->ExtendedData->Data)) {
            foreach ($pm->ExtendedData->Data as $d) {
                $k = (string) $d['name'];
                $v = isset($d->value) ? (string) $d->value : '';
                $data[$k] = trim($v);
            }
        }

        return $data;
    }

    /**
     * Parsing koordinat titik tunggal (lon,lat,alt).
     */
    public function parsePointCoordinates(SimpleXMLElement $pm): array
    {
        if (isset($pm->Point) && isset($pm->Point->coordinates)) {
            $raw = trim((string) $pm->Point->coordinates);
            $parts = explode(',', $raw);
            if (count($parts) >= 2) {
                return [
                    'lon' => (float) trim($parts[0]),
                    'lat' => (float) trim($parts[1]),
                ];
            }
        }

        return ['lon' => null, 'lat' => null];
    }

    /**
     * Parsing koordinat LineString menjadi array [[lon, lat], ...].
     */
    public function parseLineStringCoordinates(SimpleXMLElement $pm): array
    {
        $route = [];
        if (isset($pm->LineString) && isset($pm->LineString->coordinates)) {
            $raw = trim((string) $pm->LineString->coordinates);
            $pairs = preg_split('/\s+/', $raw);
            foreach ($pairs as $p) {
                if (empty(trim($p))) {
                    continue;
                }
                $parts = explode(',', trim($p));
                if (count($parts) >= 2) {
                    $route[] = [(float) trim($parts[0]), (float) trim($parts[1])];
                }
            }
        }

        return $route;
    }

    /**
     * Validasi batas koordinat area Malang Bululawang.
     */
    public static function isCoordinateValid(?float $lat, ?float $lon): bool
    {
        if ($lat === null || $lon === null) {
            return false;
        }

        return ($lon >= self::MIN_LON && $lon <= self::MAX_LON && $lat >= self::MIN_LAT && $lat <= self::MAX_LAT);
    }

    /**
     * Parsing angka panjang kabel dari string teks.
     */
    public static function parseCableLength(?string $raw): float
    {
        if (empty($raw)) {
            return 0.0;
        }

        if (preg_match('/([\d\.]+)\s*km/i', $raw, $m)) {
            return round(((float) $m[1]) * 1000, 2);
        }

        if (preg_match('/([\d\.]+)\s*m/i', $raw, $m)) {
            return round((float) $m[1], 2);
        }

        return 0.0;
    }

    /**
     * Hitung panjang jalur kabel dari akumulasi titik koordinat (formula Haversine).
     */
    public static function calculateRouteDistance(array $route): float
    {
        if (count($route) < 2) {
            return 0.0;
        }

        $totalMeters = 0.0;
        for ($i = 0; $i < count($route) - 1; $i++) {
            $lon1 = $route[$i][0];
            $lat1 = $route[$i][1];
            $lon2 = $route[$i + 1][0];
            $lat2 = $route[$i + 1][1];

            $totalMeters += self::haversineDistance($lat1, $lon1, $lat2, $lon2);
        }

        return round($totalMeters, 2);
    }

    public static function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meter
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    // =========================================================================
    // IMPOR ENTITAS
    // =========================================================================

    protected function importOlt(SimpleXMLElement $pm, array &$stats, array &$reportRows, array &$oltMap, bool $dryRun): void
    {
        $name = trim((string) $pm->name);
        $ext = $this->parseExtendedData($pm);
        $coords = $this->parsePointCoordinates($pm);

        $code = $ext['Kode'] ?? $ext['Code'] ?? ('OLT-'.strtoupper(Str::slug($name)));
        $address = $ext['Alamat'] ?? null;

        $existing = Olt::where('code', $code)->orWhere('name', $name)->first();
        if ($existing) {
            if (! $dryRun) {
                $existing->update([
                    'name' => $name,
                    'address' => $address ?: $existing->address,
                    'latitude' => $coords['lat'] ?? $existing->latitude,
                    'longitude' => $coords['lon'] ?? $existing->longitude,
                ]);
            }
            $oltMap[$name] = $existing->id;
            $oltMap[$code] = $existing->id;
            $stats['olts']['updated']++;
            $reportRows[] = ['OLT', $code, $name, 'UPDATED', 'Diperbarui'];
        } else {
            $oltId = 1;
            if (! $dryRun) {
                $olt = Olt::create([
                    'code' => $code,
                    'name' => $name,
                    'address' => $address,
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lon'],
                    'status' => 'normal',
                    'is_active' => true,
                    'client_uuid' => (string) Str::uuid(),
                ]);
                $oltId = $olt->id;
            }
            $oltMap[$name] = $oltId;
            $oltMap[$code] = $oltId;
            $stats['olts']['created']++;
            $reportRows[] = ['OLT', $code, $name, 'CREATED', 'Berhasil dibuat'];
        }
    }

    protected function importOdc(SimpleXMLElement $pm, array &$stats, array &$reportRows, array &$odcMap, ?int $userId, bool $dryRun): void
    {
        $name = trim((string) $pm->name);
        $ext = $this->parseExtendedData($pm);
        $coords = $this->parsePointCoordinates($pm);
        $code = $ext['Kode'] ?? $ext['Code'] ?? $name;

        $rawStatus = $ext['Status'] ?? 'Normal';
        $isDisrupted = (stripos($rawStatus, 'gangguan') !== false);
        $operationalStatus = $isDisrupted ? 'disrupted' : 'normal';

        if ($isDisrupted) {
            $stats['odcs']['disrupted']++;
        }

        $address = $ext['Alamat'] ?? null;
        $notes = $ext['Keterangan'] ?? null;
        $capacityOdp = isset($ext['Jumlah ODP']) ? (int) $ext['Jumlah ODP'] : 24;

        $existing = Odc::where('code', $code)->first();
        if ($existing) {
            if (! $dryRun) {
                $oldStatus = $existing->status;
                $existing->update([
                    'name' => $name,
                    'address' => $address ?: $existing->address,
                    'notes' => $notes ?: $existing->notes,
                    'latitude' => $coords['lat'] ?? $existing->latitude,
                    'longitude' => $coords['lon'] ?? $existing->longitude,
                    'capacity_odp' => $capacityOdp ?: $existing->capacity_odp,
                    'status' => $operationalStatus,
                    'operational_status' => $operationalStatus,
                ]);

                if ($isDisrupted && $oldStatus !== 'disrupted') {
                    NetworkStatusLog::create([
                        'node_type' => 'odc',
                        'node_id' => $existing->id,
                        'from_status' => $oldStatus,
                        'to_status' => 'disrupted',
                        'reason' => 'Status awal dari impor KMZ (Terindikasi Gangguan)',
                        'source' => 'kmz',
                        'user_id' => $userId,
                    ]);
                }
            }
            $odcMap[$name] = $existing->id;
            $odcMap[$code] = $existing->id;
            $stats['odcs']['updated']++;
            $reportRows[] = ['ODC', $code, $name, 'UPDATED', "Diperbarui (Status: {$operationalStatus})"];
        } else {
            $odcId = count($odcMap) + 1;
            if (! $dryRun) {
                $odc = Odc::create([
                    'code' => $code,
                    'name' => $name,
                    'address' => $address,
                    'notes' => $notes,
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lon'],
                    'capacity_odp' => $capacityOdp,
                    'status' => $operationalStatus,
                    'operational_status' => $operationalStatus,
                    'wilayah' => 'Bululawang',
                    'is_active' => true,
                    'client_uuid' => (string) Str::uuid(),
                ]);
                $odcId = $odc->id;

                if ($isDisrupted) {
                    NetworkStatusLog::create([
                        'node_type' => 'odc',
                        'node_id' => $odc->id,
                        'from_status' => 'normal',
                        'to_status' => 'disrupted',
                        'reason' => 'Status awal dari impor KMZ (Terindikasi Gangguan)',
                        'source' => 'kmz',
                        'user_id' => $userId,
                    ]);
                }
            }
            $odcMap[$name] = $odcId;
            $odcMap[$code] = $odcId;
            $stats['odcs']['created']++;
            $reportRows[] = ['ODC', $code, $name, 'CREATED', "Berhasil dibuat (Status: {$operationalStatus})"];
        }
    }

    protected function importOdp(SimpleXMLElement $pm, array &$stats, array &$reportRows, array &$odpMap, bool $dryRun): void
    {
        $name = trim((string) $pm->name);
        $ext = $this->parseExtendedData($pm);
        $coords = $this->parsePointCoordinates($pm);
        $code = $ext['Kode'] ?? $ext['Code'] ?? $name;

        $address = $ext['Alamat'] ?? null;
        $notes = $ext['Keterangan'] ?? null;
        $portCapacity = isset($ext['Jumlah Port']) ? (int) $ext['Jumlah Port'] : 8;

        $existing = Odp::where('code', $code)->first();
        if ($existing) {
            if (! $dryRun) {
                $existing->update([
                    'name' => $name,
                    'address' => $address ?: $existing->address,
                    'notes' => $notes ?: $existing->notes,
                    'latitude' => $coords['lat'] ?? $existing->latitude,
                    'longitude' => $coords['lon'] ?? $existing->longitude,
                    'port_capacity' => $portCapacity ?: $existing->port_capacity,
                ]);
            }
            $odpMap[$name] = $existing->id;
            $odpMap[$code] = $existing->id;
            $stats['odps']['updated']++;
            $reportRows[] = ['ODP', $code, $name, 'UPDATED', 'Diperbarui'];
        } else {
            $odpId = count($odpMap) + 1;
            if (! $dryRun) {
                $odp = Odp::create([
                    'code' => $code,
                    'name' => $name,
                    'address' => $address,
                    'notes' => $notes,
                    'latitude' => $coords['lat'],
                    'longitude' => $coords['lon'],
                    'port_capacity' => $portCapacity,
                    'status' => 'normal',
                    'operational_status' => 'normal',
                    'wilayah' => 'Bululawang',
                    'is_active' => true,
                    'is_approved' => true,
                    'needs_review' => false,
                    'client_uuid' => (string) Str::uuid(),
                ]);
                $odpId = $odp->id;
            }
            $odpMap[$name] = $odpId;
            $odpMap[$code] = $odpId;
            $stats['odps']['created']++;
            $reportRows[] = ['ODP', $code, $name, 'CREATED', "Berhasil dibuat (Port: {$portCapacity})"];
        }
    }

    protected function importCable(
        SimpleXMLElement $pm,
        string $kind,
        array &$stats,
        array &$reportRows,
        array &$oltMap,
        array &$odcMap,
        array &$odpMap,
        array &$customerOdpLinks,
        ?int $userId,
        bool $dryRun
    ): void {
        $name = trim((string) $pm->name);
        $ext = $this->parseExtendedData($pm);
        $route = $this->parseLineStringCoordinates($pm);

        $fromName = $ext['Dari'] ?? '';
        $toName = $ext['Ke'] ?? '';
        $isBackbone = (isset($ext['Backbone']) && strcasecmp($ext['Backbone'], 'ya') === 0);
        $rawStatus = $ext['Status'] ?? 'Normal';
        $isCut = (stripos($rawStatus, 'putus') !== false);
        $status = $isCut ? 'cut' : 'normal';

        if ($isCut) {
            $stats['cables']['cut']++;
        }

        $lengthM = self::parseCableLength($ext['Panjang Kabel'] ?? '');
        if ($lengthM <= 0 && count($route) >= 2) {
            $lengthM = self::calculateRouteDistance($route);
        }

        // Resolusi from_type/from_id dan to_type/to_id
        $fromType = null;
        $fromId = null;
        $toType = null;
        $toId = null;

        if ($kind === 'olt_odc') {
            $fromType = 'olt';
            $fromId = $oltMap[$fromName] ?? null;
            $toType = 'odc';
            $toId = $odcMap[$toName] ?? null;

            // Sambungkan ODC ke OLT induk
            if (! $dryRun && $toId && $fromId) {
                Odc::where('id', $toId)->whereNull('olt_id')->update(['olt_id' => $fromId]);
            }
        } elseif ($kind === 'odc_odp') {
            $fromType = 'odc';
            $fromId = $odcMap[$fromName] ?? null;
            $toType = 'odp';
            $toId = $odpMap[$toName] ?? null;

            // Sambungkan ODP ke ODC induk
            if (! $dryRun && $toId && $fromId) {
                Odp::where('id', $toId)->whereNull('odc_id')->update(['odc_id' => $fromId]);
            }
        } elseif ($kind === 'odp_customer') {
            $fromType = 'odp';
            $fromId = $odpMap[$fromName] ?? null;
            $toType = 'customer';
            $customerOdpLinks[$toName] = $fromName; // Link customer username to ODP name
        }

        $code = 'CBL-'.strtoupper(substr(md5($name.$fromName.$toName), 0, 10));

        $existing = NetworkCable::where('code', $code)->orWhere('name', $name)->first();
        if ($existing) {
            if (! $dryRun) {
                $oldStatus = $existing->status;
                $existing->update([
                    'from_type' => $fromType ?: $existing->from_type,
                    'from_id' => $fromId ?: $existing->from_id,
                    'from_name' => $fromName ?: $existing->from_name,
                    'to_type' => $toType ?: $existing->to_type,
                    'to_id' => $toId ?: $existing->to_id,
                    'to_name' => $toName ?: $existing->to_name,
                    'kind' => $kind,
                    'is_backbone' => $isBackbone,
                    'route' => $route ?: $existing->route,
                    'length_m' => $lengthM ?: $existing->length_m,
                    'route_drawn' => false,
                    'status' => $status,
                ]);

                if ($isCut && $oldStatus !== 'cut') {
                    NetworkStatusLog::create([
                        'node_type' => 'cable',
                        'node_id' => $existing->id,
                        'from_status' => $oldStatus,
                        'to_status' => 'cut',
                        'reason' => 'Status awal dari impor KMZ (Terindikasi Putus)',
                        'source' => 'kmz',
                        'user_id' => $userId,
                    ]);
                }
            }
            $stats['cables']['updated']++;
            $reportRows[] = ['KABEL', $code, $name, 'UPDATED', "Kabel diperbarui ({$lengthM} m, Status: {$status})"];
        } else {
            if (! $dryRun) {
                $cable = NetworkCable::create([
                    'code' => $code,
                    'name' => $name,
                    'from_type' => $fromType ?: 'unknown',
                    'from_id' => $fromId,
                    'from_name' => $fromName,
                    'to_type' => $toType ?: 'unknown',
                    'to_id' => $toId,
                    'to_name' => $toName,
                    'kind' => $kind,
                    'is_backbone' => $isBackbone,
                    'route' => $route,
                    'length_m' => $lengthM,
                    'route_drawn' => false,
                    'status' => $status,
                    'client_uuid' => (string) Str::uuid(),
                ]);

                if ($isCut) {
                    NetworkStatusLog::create([
                        'node_type' => 'cable',
                        'node_id' => $cable->id,
                        'from_status' => 'normal',
                        'to_status' => 'cut',
                        'reason' => 'Status awal dari impor KMZ (Terindikasi Putus)',
                        'source' => 'kmz',
                        'user_id' => $userId,
                    ]);
                }
            }
            $stats['cables']['created']++;
            $reportRows[] = ['KABEL', $code, $name, 'CREATED', "Kabel berhasil dibuat ({$lengthM} m, Status: {$status})"];
        }
    }

    protected function importClient(
        SimpleXMLElement $pm,
        array &$stats,
        array &$reportRows,
        array &$invalidCoords,
        array &$customerOdpLinks,
        bool $dryRun
    ): void {
        $username = trim((string) $pm->name);
        $coords = $this->parsePointCoordinates($pm);

        // Validasi koordinat wajar
        if (! self::isCoordinateValid($coords['lat'], $coords['lon'])) {
            $stats['clients']['invalid_coords']++;
            $invalidCoords[] = [
                'username' => $username,
                'latitude' => $coords['lat'],
                'longitude' => $coords['lon'],
                'reason' => "Koordinat di luar batas area wajar (lon: {$coords['lon']}, lat: {$coords['lat']})",
            ];
            $reportRows[] = [
                'PELANGGAN',
                $username,
                $username,
                'REJECTED',
                "Koordinat di luar batas area wajar (lon: {$coords['lon']}, lat: {$coords['lat']})",
            ];

            return; // JANGAN diimpor bila koordinat salah
        }

        // Cari kecocokan pelanggan berdasarkan username
        $customer = Customer::where('username', $username)->first();

        if (! $customer) {
            // Pelanggan tidak cocok TIDAK dibuat
            $stats['clients']['skipped']++;
            $reportRows[] = [
                'PELANGGAN',
                $username,
                $username,
                'SKIPPED',
                'Username tidak ditemukan di database pelanggan (tidak dibuat baru)',
            ];

            return;
        }

        // Pelanggan ditemukan
        $updates = [];
        // Simpan koordinat HANYA jika kosong
        if (empty($customer->latitude) && empty($customer->longitude)) {
            $updates['latitude'] = $coords['lat'];
            $updates['longitude'] = $coords['lon'];
            $updates['location_source'] = 'kmz';
        }

        // Tautkan ODP HANYA jika pelanggan ini adalah salah satu dari 5 pelanggan yang terhubung kabel ODP
        if (isset($customerOdpLinks[$username])) {
            $odpName = $customerOdpLinks[$username];
            $odp = Odp::where('name', $odpName)->orWhere('code', $odpName)->first();
            if ($odp && empty($customer->odp_id)) {
                $updates['odp_id'] = $odp->id;
            }
        }

        if (! empty($updates)) {
            if (! $dryRun) {
                $customer->update($updates);
            }
            $stats['clients']['matched']++;
            $reportRows[] = [
                'PELANGGAN',
                $customer->customer_code ?? $username,
                $customer->name ?? $username,
                'UPDATED',
                'Koordinat pelanggan berhasil disinkronkan dari KMZ',
            ];
        } else {
            $stats['clients']['skipped']++;
            $reportRows[] = [
                'PELANGGAN',
                $customer->customer_code ?? $username,
                $customer->name ?? $username,
                'SKIPPED',
                'Pelanggan sudah memiliki koordinat valid (tidak ditimpa)',
            ];
        }
    }

    /**
     * Hasilkan isi berkas CSV laporan.
     */
    protected function generateCsvReport(array $reportRows): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, ['Tipe', 'Kode', 'Nama', 'Status', 'Keterangan']);

        foreach ($reportRows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }
}
