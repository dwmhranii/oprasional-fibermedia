<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Network\Services\MassOutageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MassOutageController extends Controller
{
    protected MassOutageService $massOutageService;

    public function __construct(MassOutageService $massOutageService)
    {
        $this->massOutageService = $massOutageService;
    }

    /**
     * Tampilkan daftar pelanggan terdampak dari elemen jaringan yang dipilih.
     */
    public function affectedCustomers(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:odc,odp,cable_track,cable',
            'element_id' => 'required|integer',
        ]);

        $customers = $this->massOutageService->getAffectedCustomers(
            $request->query('element_type'),
            (int) $request->query('element_id')
        );

        return response()->json([
            'success' => true,
            'data' => [
                'total_affected' => $customers->count(),
                'customers' => $customers->map(function ($c) {
                    return [
                        'id' => $c->id,
                        'customer_code' => $c->customer_code,
                        'name' => $c->name,
                        'phone' => $c->phone,
                        'address' => $c->address,
                        'odp_id' => $c->odp_id,
                        'odp_port' => $c->odp_port,
                        'package' => $c->package,
                        'status' => $c->status,
                    ];
                }),
            ],
        ]);
    }

    /**
     * Picu gangguan massal: ubah status elemen jaringan ke disrupted/cut,
     * buat SATU tiket untuk seluruh pelanggan terdampak, dan masukkan ke antrean dispatch.
     */
    public function trigger(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:odc,odp,cable_track,cable',
            'element_id' => 'required|integer',
            'status' => 'required|in:disrupted,cut',
            'notes' => 'nullable|string|max:500',
        ]);

        $result = $this->massOutageService->triggerMassOutage(
            elementType: $request->input('element_type'),
            elementId: (int) $request->input('element_id'),
            status: $request->input('status'),
            notes: $request->input('notes'),
            actor: $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Tiket gangguan massal berhasil dibuat dan dialokasikan ke tim lapangan.',
            'data' => [
                'complaint' => $result['complaint'],
                'affected_count' => $result['affected_count'],
                'element' => $result['element'],
            ],
        ], 201);
    }

    /**
     * Pulihkan gangguan massal kembali ke status normal.
     */
    public function resolve(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:odc,odp,cable_track,cable',
            'element_id' => 'required|integer',
            'resolution_notes' => 'nullable|string|max:500',
        ]);

        $result = $this->massOutageService->resolveMassOutage(
            elementType: $request->input('element_type'),
            elementId: (int) $request->input('element_id'),
            resolutionNotes: $request->input('resolution_notes'),
            actor: $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Status elemen jaringan berhasil dipulihkan ke normal dan tiket diselesaikan.',
            'data' => $result,
        ]);
    }
}
