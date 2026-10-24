<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Network\OdpRequest;
use App\Http\Resources\OdpResource;
use App\Models\Odp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OdpController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Odp::query()->with(['odc', 'customers'])->orderBy('code', 'asc');

        if ($request->filled('odc_id') && $request->input('odc_id') !== 'all') {
            $query->where('odc_id', $request->input('odc_id'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('operational_status', $request->input('status'));
        }

        if ($request->filled('wilayah') && $request->input('wilayah') !== 'all') {
            $query->where('wilayah', $request->input('wilayah'));
        }

        if ($request->has('is_approved')) {
            $query->where('is_approved', $request->boolean('is_approved'));
        }

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                    ->orWhere('name', 'like', "%{$s}%")
                    ->orWhere('address', 'like', "%{$s}%");
            });
        }

        $perPage = (int) $request->input('per_page', 20);
        $odps = $query->paginate($perPage);

        return OdpResource::collection($odps);
    }

    public function store(OdpRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['is_approved'] = true; // Admin creates directly approved

        $odp = Odp::create($validated);

        activity('network')
            ->performedOn($odp)
            ->causedBy($request->user())
            ->withProperties(['code' => $odp->code, 'name' => $odp->name])
            ->log("ODP {$odp->code} ({$odp->name}) berhasil ditambahkan.");

        return (new OdpResource($odp))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Odp $odp): OdpResource
    {
        $odp->load(['odc', 'customers']);

        return new OdpResource($odp);
    }

    public function update(OdpRequest $request, Odp $odp): JsonResponse
    {
        $validated = $request->validated();
        $oldStatus = $odp->operational_status;
        $odp->update($validated);

        if (isset($validated['operational_status']) && $validated['operational_status'] !== $oldStatus) {
            activity('network')
                ->performedOn($odp)
                ->causedBy($request->user())
                ->withProperties([
                    'code' => $odp->code,
                    'old_status' => $oldStatus,
                    'new_status' => $validated['operational_status'],
                ])
                ->log("Status operasional ODP {$odp->code} diubah dari {$oldStatus} ke {$validated['operational_status']}");
        }

        return response()->json([
            'success' => true,
            'message' => "Data ODP {$odp->code} berhasil diperbarui.",
            'data' => new OdpResource($odp),
        ]);
    }

    /**
     * Persetujuan perubahan ODP baru atau pergeseran titik koordinat yang diajukan teknisi.
     */
    public function approve(Request $request, Odp $odp): JsonResponse
    {
        $validated = $request->validate([
            'approve' => 'required|boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validated['approve']) {
            $updates = [
                'is_approved' => true,
            ];

            // Terapkan koordinat yang diusulkan bila ada
            if ($odp->proposed_latitude !== null && $odp->proposed_longitude !== null) {
                $updates['latitude'] = $odp->proposed_latitude;
                $updates['longitude'] = $odp->proposed_longitude;
            }

            $odp->update($updates);

            activity('network')
                ->performedOn($odp)
                ->causedBy($request->user())
                ->withProperties(['code' => $odp->code, 'notes' => $validated['notes'] ?? null])
                ->log("Perubahan titik/ODP {$odp->code} telah disetujui oleh {$request->user()->name}");

            $msg = "Perubahan ODP {$odp->code} berhasil disetujui.";
        } else {
            // Tolak usulan perubahan koordinat
            $odp->update([
                'proposed_latitude' => null,
                'proposed_longitude' => null,
            ]);

            activity('network')
                ->performedOn($odp)
                ->causedBy($request->user())
                ->withProperties(['code' => $odp->code, 'notes' => $validated['notes'] ?? null])
                ->log("Usulan perubahan ODP {$odp->code} ditolak oleh {$request->user()->name}");

            $msg = "Usulan perubahan ODP {$odp->code} ditolak.";
        }

        return response()->json([
            'success' => true,
            'message' => $msg,
            'data' => new OdpResource($odp),
        ]);
    }

    public function destroy(Request $request, Odp $odp): JsonResponse
    {
        $code = $odp->code;
        $odp->delete();

        activity('network')
            ->performedOn($odp)
            ->causedBy($request->user())
            ->withProperties(['code' => $code])
            ->log("ODP {$code} dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "ODP {$code} berhasil dihapus.",
        ]);
    }
}
