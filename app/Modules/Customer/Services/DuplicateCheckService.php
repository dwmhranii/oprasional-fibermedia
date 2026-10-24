<?php

namespace App\Modules\Customer\Services;

use App\Models\Customer;
use App\Models\Submission;

class DuplicateCheckService
{
    /**
     * Memeriksa potensi duplikasi NIK, nomor telepon, dan lokasi/alamat pemasangan.
     * Mengembalikan peringatan tanpa memblokir penyimpanan (sesuai aturan bisnis Fase 4).
     *
     * @param  array  $data  [nik, phone, lat, lng, address, district, city]
     */
    public function check(array $data, ?int $excludeSubmissionId = null): array
    {
        $warnings = [];
        $nikDuplicate = false;
        $phoneDuplicate = false;
        $locationDuplicate = false;
        $matchedCustomers = [];
        $matchedSubmissions = [];

        // 1. Cek Duplikasi NIK (Hash HMAC & Raw NIK)
        $nikRaw = trim((string) ($data['nik'] ?? ''));
        $nikDigits = preg_replace('/\D+/', '', $nikRaw);

        if (! empty($nikDigits)) {
            $nikHash = hash_hmac('sha256', $nikDigits, (string) config('app.key'));

            // Cek di tabel customers
            $existingCustomer = Customer::where('nik_hash', $nikHash)
                ->orWhere('nik', $nikDigits)
                ->orWhere('nik', $nikRaw)
                ->first();

            if ($existingCustomer) {
                $nikDuplicate = true;
                $warnings[] = "NIK '{$nikDigits}' sudah terdaftar pada pelanggan aktif: {$existingCustomer->name} ({$existingCustomer->customer_code}).";
                $matchedCustomers[] = [
                    'id' => $existingCustomer->id,
                    'type' => 'customer',
                    'name' => $existingCustomer->name,
                    'code' => $existingCustomer->customer_code,
                    'reason' => 'nik',
                ];
            }

            // Cek di tabel submissions aktif
            $existingSubmissionQuery = Submission::where(function ($q) use ($nikHash, $nikDigits, $nikRaw) {
                $q->where('nik_hash', $nikHash)
                    ->orWhere('nik', $nikDigits)
                    ->orWhere('nik', $nikRaw);
            })->whereNotIn('status', ['rejected', 'cancelled']);

            if ($excludeSubmissionId) {
                $existingSubmissionQuery->where('id', '!=', $excludeSubmissionId);
            }

            $existingSubmission = $existingSubmissionQuery->first();
            if ($existingSubmission) {
                $nikDuplicate = true;
                $warnings[] = "NIK '{$nikDigits}' sudah diajukan pada tiket pengajuan: {$existingSubmission->customer_name} ({$existingSubmission->submission_number}).";
                $matchedSubmissions[] = [
                    'id' => $existingSubmission->id,
                    'type' => 'submission',
                    'name' => $existingSubmission->customer_name,
                    'number' => $existingSubmission->submission_number,
                    'reason' => 'nik',
                ];
            }
        }

        // 2. Cek Duplikasi Nomor Telepon
        $phoneRaw = trim((string) ($data['phone'] ?? ''));
        $phoneNorm = Customer::normalizePhone($phoneRaw);

        if (! empty($phoneNorm)) {
            // Cek di pelanggan
            $phoneCustomer = Customer::where('phone_normalized', $phoneNorm)
                ->orWhere('phone', $phoneRaw)
                ->first();

            if ($phoneCustomer) {
                $phoneDuplicate = true;
                $warnings[] = "Nomor telepon '{$phoneRaw}' sudah terdaftar pada pelanggan: {$phoneCustomer->name} ({$phoneCustomer->customer_code}).";
                $matchedCustomers[] = [
                    'id' => $phoneCustomer->id,
                    'type' => 'customer',
                    'name' => $phoneCustomer->name,
                    'code' => $phoneCustomer->customer_code,
                    'reason' => 'phone',
                ];
            }

            // Cek di pengajuan
            $phoneSubQuery = Submission::where(function ($q) use ($phoneNorm, $phoneRaw) {
                $q->where('phone_normalized', $phoneNorm)
                    ->orWhere('phone', $phoneRaw);
            })->whereNotIn('status', ['rejected', 'cancelled']);

            if ($excludeSubmissionId) {
                $phoneSubQuery->where('id', '!=', $excludeSubmissionId);
            }

            $phoneSub = $phoneSubQuery->first();
            if ($phoneSub) {
                $phoneDuplicate = true;
                $warnings[] = "Nomor telepon '{$phoneRaw}' sudah digunakan pada tiket pengajuan: {$phoneSub->customer_name} ({$phoneSub->submission_number}).";
                $matchedSubmissions[] = [
                    'id' => $phoneSub->id,
                    'type' => 'submission',
                    'name' => $phoneSub->customer_name,
                    'number' => $phoneSub->submission_number,
                    'reason' => 'phone',
                ];
            }
        }

        // 3. Cek Kedekatan Lokasi / Alamat (Radius <= 30 Meter)
        $targetLat = isset($data['lat']) && is_numeric($data['lat']) ? (float) $data['lat'] : null;
        $targetLng = isset($data['lng']) && is_numeric($data['lng']) ? (float) $data['lng'] : null;

        if ($targetLat !== null && $targetLng !== null) {
            // Bounding box kasar ~0.001 derajat (~110 meter) untuk efisiensi query
            $latMin = $targetLat - 0.0015;
            $latMax = $targetLat + 0.0015;
            $lngMin = $targetLng - 0.0015;
            $lngMax = $targetLng + 0.0015;

            $nearbyCustomers = Customer::whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->whereBetween('latitude', [$latMin, $latMax])
                ->whereBetween('longitude', [$lngMin, $lngMax])
                ->get();

            foreach ($nearbyCustomers as $cust) {
                $dist = $this->calculateDistance($targetLat, $targetLng, (float) $cust->latitude, (float) $cust->longitude);
                if ($dist <= 30.0) {
                    $locationDuplicate = true;
                    $roundedDist = round($dist, 1);
                    $warnings[] = "Lokasi koordinat pemasangan sangat berdekatan ({$roundedDist} m) dengan pelanggan {$cust->name} ({$cust->customer_code}).";
                    $matchedCustomers[] = [
                        'id' => $cust->id,
                        'type' => 'customer',
                        'name' => $cust->name,
                        'code' => $cust->customer_code,
                        'distance_meters' => $roundedDist,
                        'reason' => 'proximity',
                    ];
                    break;
                }
            }

            // Cek juga ke pengajuan lain
            $nearbySubQuery = Submission::whereNotNull('lat')
                ->whereNotNull('lng')
                ->whereBetween('lat', [$latMin, $latMax])
                ->whereBetween('lng', [$lngMin, $lngMax])
                ->whereNotIn('status', ['rejected', 'cancelled']);

            if ($excludeSubmissionId) {
                $nearbySubQuery->where('id', '!=', $excludeSubmissionId);
            }

            $nearbySubmissions = $nearbySubQuery->get();
            foreach ($nearbySubmissions as $sub) {
                $dist = $this->calculateDistance($targetLat, $targetLng, (float) $sub->lat, (float) $sub->lng);
                if ($dist <= 30.0) {
                    $locationDuplicate = true;
                    $roundedDist = round($dist, 1);
                    $warnings[] = "Lokasi koordinat pemasangan sangat berdekatan ({$roundedDist} m) dengan pengajuan {$sub->customer_name} ({$sub->submission_number}).";
                    $matchedSubmissions[] = [
                        'id' => $sub->id,
                        'type' => 'submission',
                        'name' => $sub->customer_name,
                        'number' => $sub->submission_number,
                        'distance_meters' => $roundedDist,
                        'reason' => 'proximity',
                    ];
                    break;
                }
            }
        }

        // 4. Cek Kesamaan Alamat Teks (Jika belum kena duplikat koordinat)
        $address = trim((string) ($data['address'] ?? ''));
        if (! $locationDuplicate && strlen($address) >= 10) {
            $existingAddressCustomer = Customer::where('address', 'like', '%'.$address.'%')->first();

            if ($existingAddressCustomer) {
                $warnings[] = "Alamat pemasangan memiliki kesamaan teks dengan pelanggan: {$existingAddressCustomer->name} ({$existingAddressCustomer->address}).";
            }
        }

        return [
            'has_duplicate' => ! empty($warnings),
            'warnings' => array_values(array_unique($warnings)),
            'nik_duplicate' => $nikDuplicate,
            'phone_duplicate' => $phoneDuplicate,
            'location_duplicate' => $locationDuplicate,
            'matched_customers' => $matchedCustomers,
            'matched_submissions' => $matchedSubmissions,
        ];
    }

    /**
     * Hitung jarak menggunakan formula Haversine (meter).
     */
    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
