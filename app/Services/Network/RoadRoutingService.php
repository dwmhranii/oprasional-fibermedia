<?php

namespace App\Services\Network;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RoadRoutingService
{
    protected static bool $faked = false;

    /** @var array<string, mixed>|callable|null */
    protected static mixed $fakeResponse = null;

    /**
     * Fake the routing response for testing.
     *
     * @param  array<int, array{0: float, 1: float}>|callable|null  $response
     */
    public static function fake(mixed $response = null): void
    {
        static::$faked = true;
        static::$fakeResponse = $response;
    }

    public static function restore(): void
    {
        static::$faked = false;
        static::$fakeResponse = null;
    }

    /**
     * Cari rute jalan raya otomatis antara dua koordinat [lng, lat] atau [lat, lng].
     *
     * @param  array{0: float, 1: float}  $origin  [lng, lat]
     * @param  array{0: float, 1: float}  $destination  [lng, lat]
     * @return array{
     *     success: bool,
     *     coordinates: array<int, array{0: float, 1: float}>,
     *     distance_meters: float,
     *     snapped_to_road: bool,
     *     message: string
     * }
     */
    public function routeAlongRoad(array $origin, array $destination): array
    {
        // 1. Cek mode testing / fake
        if (static::$faked) {
            if (is_callable(static::$fakeResponse)) {
                return (static::$fakeResponse)($origin, $destination);
            }

            if (is_array(static::$fakeResponse)) {
                return [
                    'success' => true,
                    'coordinates' => static::$fakeResponse,
                    'distance_meters' => $this->calculateStraightDistance($origin, $destination),
                    'snapped_to_road' => true,
                    'message' => 'Rute jalan berhasil didapatkan (faked).',
                ];
            }

            if (static::$fakeResponse instanceof \Throwable) {
                // Fallback to straight line on simulated error
                return $this->fallbackStraightLine($origin, $destination, static::$fakeResponse->getMessage());
            }
        }

        // 2. Format koordinat untuk OSRM: {lon1},{lat1};{lon2},{lat2}
        $lon1 = (float) $origin[0];
        $lat1 = (float) $origin[1];
        $lon2 = (float) $destination[0];
        $lat2 = (float) $destination[1];

        $url = "https://router.project-osrm.org/route/v1/driving/{$lon1},{$lat1};{$lon2},{$lat2}?overview=full&geometries=geojson";

        try {
            $response = Http::timeout(4)
                ->withHeaders([
                    'User-Agent' => 'FibermediaOps/1.0 NetworkRouting',
                ])
                ->get($url);

            if ($response->successful()) {
                $data = $response->json();
                if (($data['code'] ?? '') === 'Ok' && ! empty($data['routes'][0]['geometry']['coordinates'])) {
                    $roadCoordinates = $data['routes'][0]['geometry']['coordinates']; // [[lon, lat], ...]
                    $distance = (float) ($data['routes'][0]['distance'] ?? 0);

                    return [
                        'success' => true,
                        'coordinates' => $roadCoordinates,
                        'distance_meters' => round($distance, 1),
                        'snapped_to_road' => true,
                        'message' => 'Rute mengikuti jalan berhasil dibuat.',
                    ];
                }
            }

            // Jika API merespons dengan status selain Ok
            return $this->fallbackStraightLine($origin, $destination, 'Jalan tidak terpetakan di OSRM, fallback ke jalur lurus.');
        } catch (Exception $e) {
            Log::info("Road snapping service unavailable ({$e->getMessage()}), using straight line fallback.");

            return $this->fallbackStraightLine($origin, $destination, 'Layanan rute jalan tidak dapat dijangkau, fallback ke jalur lurus.');
        }
    }

    /**
     * Fallback garis lurus manual jika rute jalan tidak tersedia.
     *
     * @return array{
     *     success: bool,
     *     coordinates: array<int, array{0: float, 1: float}>,
     *     distance_meters: float,
     *     snapped_to_road: bool,
     *     message: string
     * }
     */
    protected function fallbackStraightLine(array $origin, array $destination, string $reason): array
    {
        return [
            'success' => true,
            'coordinates' => [$origin, $destination],
            'distance_meters' => round($this->calculateStraightDistance($origin, $destination), 1),
            'snapped_to_road' => false,
            'message' => $reason,
        ];
    }

    /**
     * Hitung jarak lurus haversine (meter) antara 2 koordinat [lng, lat].
     */
    protected function calculateStraightDistance(array $coord1, array $coord2): float
    {
        $lat1 = deg2rad($coord1[1]);
        $lon1 = deg2rad($coord1[0]);
        $lat2 = deg2rad($coord2[1]);
        $lon2 = deg2rad($coord2[0]);

        $dlat = $lat2 - $lat1;
        $dlon = $lon2 - $lon1;

        $a = sin($dlat / 2) ** 2 + cos($lat1) * cos($lat2) * (sin($dlon / 2) ** 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return 6371000 * $c; // Radius bumi dalam meter
    }
}
