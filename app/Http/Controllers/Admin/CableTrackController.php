<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Network\CableTrackRequest;
use App\Http\Resources\CableTrackResource;
use App\Http\Resources\CustomerResource;
use App\Models\CableTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class CableTrackController extends Controller
{
    /**
     * Daftar jalur kabel dengan filter pencarian, status, dan jalur belum digambar.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = CableTrack::query()->with(['connectedOdc', 'connectedOdp', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('operational_status')) {
            $query->where('operational_status', $request->input('operational_status'));
        }

        if ($request->boolean('undrawn')) {
            // Belum digambar bila coordinates null atau kosong/kurang dari 2 titik
            $query->where(function ($q) {
                $q->whereNull('coordinates')
                    ->orWhere('coordinates', '[]')
                    ->orWhere('simplified_points_count', '<', 2);
            });
        }

        $perPage = min(100, (int) $request->input('per_page', 25));
        $tracks = $query->latest('id')->paginate($perPage);

        return CableTrackResource::collection($tracks);
    }

    /**
     * Simpan jalur kabel baru.
     */
    public function store(CableTrackRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['client_uuid'] = (string) Str::uuid();
        $validated['created_by_id'] = auth()->id();

        $coords = $validated['coordinates'] ?? [];
        $validated['raw_points_count'] = is_array($coords) ? count($coords) : 0;
        $validated['simplified_points_count'] = is_array($coords) ? count($coords) : 0;

        $track = CableTrack::create($validated);

        return (new CableTrackResource($track->load(['connectedOdc', 'connectedOdp', 'creator'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Tampilkan detail satu jalur kabel.
     */
    public function show(CableTrack $cableTrack): CableTrackResource
    {
        return new CableTrackResource($cableTrack->load(['connectedOdc', 'connectedOdp', 'creator']));
    }

    /**
     * Perbarui konfigurasi atau jalur koordinat kabel.
     */
    public function update(CableTrackRequest $request, CableTrack $cableTrack): CableTrackResource
    {
        $validated = $request->validated();

        if (array_key_exists('coordinates', $validated) && is_array($validated['coordinates'])) {
            $validated['simplified_points_count'] = count($validated['coordinates']);
        }

        $cableTrack->update($validated);

        return new CableTrackResource($cableTrack->fresh(['connectedOdc', 'connectedOdp', 'creator']));
    }

    /**
     * Setujui jalur kabel usulan teknisi.
     */
    public function approve(CableTrack $cableTrack): JsonResponse
    {
        $cableTrack->update([
            'status' => 'approved',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Jalur kabel berhasil disetujui.',
            'data' => new CableTrackResource($cableTrack->fresh(['connectedOdc', 'connectedOdp', 'creator'])),
        ]);
    }

    /**
     * Hapus jalur kabel.
     */
    public function destroy(CableTrack $cableTrack): JsonResponse
    {
        $cableTrack->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jalur kabel berhasil dihapus.',
        ]);
    }

    /**
     * Tampilkan daftar pelanggan yang terdampak bila kabel terganggu / putus.
     */
    public function affectedCustomers(CableTrack $cableTrack): AnonymousResourceCollection
    {
        $customers = $cableTrack->getAffectedCustomers();

        return CustomerResource::collection($customers);
    }
}
