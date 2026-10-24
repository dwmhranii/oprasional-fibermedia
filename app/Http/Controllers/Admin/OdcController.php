<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Network\OdcRequest;
use App\Http\Resources\OdcResource;
use App\Models\Odc;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OdcController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Odc::query()->withCount('odps')->orderBy('code', 'asc');

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('operational_status', $request->input('status'));
        }

        if ($request->filled('wilayah') && $request->input('wilayah') !== 'all') {
            $query->where('wilayah', $request->input('wilayah'));
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
        $odcs = $query->paginate($perPage);

        return OdcResource::collection($odcs);
    }

    public function store(OdcRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $odc = Odc::create($validated);

        activity('network')
            ->performedOn($odc)
            ->causedBy($request->user())
            ->withProperties(['code' => $odc->code, 'name' => $odc->name])
            ->log("ODC {$odc->code} ({$odc->name}) berhasil ditambahkan.");

        return (new OdcResource($odc))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Odc $odc): OdcResource
    {
        $odc->load(['odps.customers']);

        return new OdcResource($odc);
    }

    public function update(OdcRequest $request, Odc $odc): JsonResponse
    {
        $validated = $request->validated();
        $oldStatus = $odc->operational_status;
        $odc->update($validated);

        if (isset($validated['operational_status']) && $validated['operational_status'] !== $oldStatus) {
            activity('network')
                ->performedOn($odc)
                ->causedBy($request->user())
                ->withProperties([
                    'code' => $odc->code,
                    'old_status' => $oldStatus,
                    'new_status' => $validated['operational_status'],
                ])
                ->log("Status operasional ODC {$odc->code} diubah dari {$oldStatus} ke {$validated['operational_status']}");
        }

        return response()->json([
            'success' => true,
            'message' => "Data ODC {$odc->code} berhasil diperbarui.",
            'data' => new OdcResource($odc),
        ]);
    }

    public function destroy(Request $request, Odc $odc): JsonResponse
    {
        $code = $odc->code;
        $odc->delete();

        activity('network')
            ->performedOn($odc)
            ->causedBy($request->user())
            ->withProperties(['code' => $code])
            ->log("ODC {$code} dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "ODC {$code} berhasil dihapus.",
        ]);
    }
}
