<?php

namespace App\Modules\Field\Services;

class GeofenceService
{
    /**
     * Hitung status geofence sesuai Aturan Bisnis 7:
     * - Geofence hanya MENANDAI, tidak menolak.
     * - Radius default 50 m, tidak boleh di bawah 50 m.
     * - Akurasi GPS yang lebih buruk dari radius ditandai "low_accuracy", bukan "outside".
     * - Status yang valid: 'inside', 'outside', 'low_accuracy', 'unverified'.
     *
     * @param  int|float|null  $radiusMeters
     * @return array{status: string, distance_meters: float|null, radius_meters: float, accuracy: float|null}
     */
    public function evaluate(
        ?float $targetLat,
        ?float $targetLng,
        ?float $capturedLat,
        ?float $capturedLng,
        ?float $accuracy = null,
        $radiusMeters = 50
    ): array {
        // Radius minimal 50 m, tidak boleh di bawah 50 m
        $effectiveRadius = max(50.0, (float) ($radiusMeters ?: 50));

        if ($targetLat === null || $targetLng === null || $capturedLat === null || $capturedLng === null) {
            return [
                'status' => 'unverified',
                'distance_meters' => null,
                'radius_meters' => $effectiveRadius,
                'accuracy' => $accuracy,
            ];
        }

        $distance = $this->haversineDistanceMeters($targetLat, $targetLng, $capturedLat, $capturedLng);

        // Jika akurasi GPS lebih buruk dari radius (misal accuracy = 65m sedangkan radius = 50m)
        if ($accuracy !== null && $accuracy > $effectiveRadius) {
            return [
                'status' => 'low_accuracy',
                'distance_meters' => $distance,
                'radius_meters' => $effectiveRadius,
                'accuracy' => $accuracy,
            ];
        }

        if ($distance <= $effectiveRadius) {
            return [
                'status' => 'inside',
                'distance_meters' => $distance,
                'radius_meters' => $effectiveRadius,
                'accuracy' => $accuracy,
            ];
        }

        return [
            'status' => 'outside',
            'distance_meters' => $distance,
            'radius_meters' => $effectiveRadius,
            'accuracy' => $accuracy,
        ];
    }

    /**
     * Haversine formula in meters.
     */
    public function haversineDistanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }
}
