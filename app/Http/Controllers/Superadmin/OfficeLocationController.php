<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfficeLocationController extends Controller
{
    /**
     * GET /api/office-locations
     */
    public function index(Request $request): JsonResponse
    {
        $query = OfficeLocation::query()->orderBy('is_active', 'desc')->orderBy('name', 'asc');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $offices = $query->get()->map(function (OfficeLocation $office) {
            return [
                'id' => $office->id,
                'name' => $office->name,
                'latitude' => (float) $office->latitude,
                'longitude' => (float) $office->longitude,
                'radius_meters' => (int) ($office->radius_meters ?: 50),
                'valid_wifi_ips' => $office->valid_wifi_ips ?? [],
                'wifi_incident_active' => (bool) $office->wifi_incident_active,
                'wifi_incident_at' => $office->wifi_incident_at?->toIso8601String(),
                'wifi_incident_note' => $office->wifi_incident_note,
                'is_active' => (bool) $office->is_active,
                'created_at' => $office->created_at?->toIso8601String(),
                'updated_at' => $office->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $offices,
        ]);
    }

    /**
     * POST /api/office-locations
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius_meters' => 'nullable|integer|min:20|max:1000',
            'valid_wifi_ips' => 'nullable|array',
            'valid_wifi_ips.*' => 'string|max:45',
            'is_active' => 'boolean',
        ]);

        $validated['radius_meters'] = max(20, (int) ($validated['radius_meters'] ?? 50));
        $validated['valid_wifi_ips'] = array_values(array_unique(array_filter($validated['valid_wifi_ips'] ?? [])));
        $validated['is_active'] = $validated['is_active'] ?? true;

        $office = OfficeLocation::create($validated);

        activity('office_locations')
            ->causedBy($request->user())
            ->performedOn($office)
            ->log("Titik kantor '{$office->name}' berhasil ditambahkan oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Titik kantor '{$office->name}' berhasil ditambahkan.",
            'data' => $office,
        ], 201);
    }

    /**
     * GET /api/office-locations/{id}
     */
    public function show(int $id): JsonResponse
    {
        $office = OfficeLocation::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $office,
        ]);
    }

    /**
     * PUT /api/office-locations/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $office = OfficeLocation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'latitude' => 'sometimes|numeric|between:-90,90',
            'longitude' => 'sometimes|numeric|between:-180,180',
            'radius_meters' => 'sometimes|integer|min:20|max:1000',
            'valid_wifi_ips' => 'nullable|array',
            'valid_wifi_ips.*' => 'string|max:45',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['valid_wifi_ips'])) {
            $validated['valid_wifi_ips'] = array_values(array_unique(array_filter($validated['valid_wifi_ips'])));
        }

        $office->update($validated);

        activity('office_locations')
            ->causedBy($request->user())
            ->performedOn($office)
            ->log("Titik kantor '{$office->name}' diperbarui oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Titik kantor '{$office->name}' berhasil diperbarui.",
            'data' => $office,
        ]);
    }

    /**
     * POST /api/office-locations/{id}/toggle-incident
     * Saklar penanda gangguan Wi-Fi darurat / sementara (PRD Final v1.2).
     */
    public function toggleIncident(Request $request, int $id): JsonResponse
    {
        $office = OfficeLocation::findOrFail($id);

        $validated = $request->validate([
            'wifi_incident_active' => 'required|boolean',
            'wifi_incident_note' => 'nullable|string|max:255',
        ]);

        $isActive = $validated['wifi_incident_active'];

        $office->update([
            'wifi_incident_active' => $isActive,
            'wifi_incident_at' => $isActive ? now() : null,
            'wifi_incident_note' => $isActive ? ($validated['wifi_incident_note'] ?? 'Gangguan sementara pada router Wi-Fi kantor') : null,
        ]);

        activity('office_locations')
            ->causedBy($request->user())
            ->performedOn($office)
            ->log(($isActive ? 'Penanda gangguan Wi-Fi darurat diaktifkan' : 'Penanda gangguan Wi-Fi dinonaktifkan')." pada '{$office->name}' oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => $isActive ? 'Penanda gangguan Wi-Fi darurat diaktifkan. Staf dapat melakukan absensi kantor tanpa verifikasi IP Wi-Fi.' : 'Penanda gangguan Wi-Fi dinonaktifkan. Verifikasi IP Wi-Fi kembali aktif normal.',
            'data' => $office,
        ]);
    }

    /**
     * GET /api/office-locations/nearest
     * Deteksi kantor terdekat otomatis dengan perhitungan Haversine (Agnostik DB).
     */
    public function nearest(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $lat = (float) $request->latitude;
        $lng = (float) $request->longitude;

        $offices = OfficeLocation::where('is_active', true)->get();
        if ($offices->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada kantor aktif yang terdaftar.',
            ], 404);
        }

        $nearestOffice = null;
        $minDistanceMeters = PHP_FLOAT_MAX;

        foreach ($offices as $office) {
            $dist = $this->haversineDistance($lat, $lng, (float) $office->latitude, (float) $office->longitude);
            if ($dist < $minDistanceMeters) {
                $minDistanceMeters = $dist;
                $nearestOffice = $office;
            }
        }

        $radius = (int) ($nearestOffice->radius_meters ?: 50);
        $isWithinRadius = $minDistanceMeters <= $radius;

        return response()->json([
            'success' => true,
            'data' => [
                'office' => $nearestOffice,
                'distance_meters' => round($minDistanceMeters, 1),
                'radius_meters' => $radius,
                'is_within_radius' => $isWithinRadius,
                'wifi_incident_active' => (bool) $nearestOffice->wifi_incident_active,
            ],
        ]);
    }

    /**
     * DELETE /api/office-locations/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $office = OfficeLocation::findOrFail($id);

        if (OfficeLocation::count() <= 1) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus kantor terakhir. Sistem membutuhkan minimal satu titik kantor.',
            ], 422);
        }

        $office->delete();

        activity('office_locations')
            ->causedBy($request->user())
            ->performedOn($office)
            ->log("Titik kantor '{$office->name}' dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Titik kantor '{$office->name}' berhasil dihapus.",
        ]);
    }

    /**
     * Rumus Haversine untuk kalkulasi jarak 2 titik koordinat bumi dalam satuan meter.
     */
    private function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meter

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}

