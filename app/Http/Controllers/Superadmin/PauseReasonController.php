<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\PauseReason;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PauseReasonController extends Controller
{
    /**
     * GET /api/pause-reasons
     */
    public function index(Request $request): JsonResponse
    {
        $query = PauseReason::query()->orderBy('order_index', 'asc');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $reasons = $query->get()->map(function (PauseReason $r) {
            return [
                'id' => $r->id,
                'code' => $r->code,
                'reason' => $r->reason,
                'requires_photo' => (bool) $r->requires_photo,
                'is_active' => (bool) $r->is_active,
                'order_index' => (int) $r->order_index,
                'created_at' => $r->created_at?->toIso8601String(),
                'updated_at' => $r->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $reasons,
        ]);
    }

    /**
     * POST /api/pause-reasons
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:pause_reasons,code',
            'reason' => 'required|string|max:255',
            'requires_photo' => 'boolean',
            'is_active' => 'boolean',
            'order_index' => 'nullable|integer',
        ]);

        $validated['order_index'] = $validated['order_index'] ?? ((PauseReason::max('order_index') ?? 0) + 1);
        $validated['requires_photo'] = $validated['requires_photo'] ?? false;
        $validated['is_active'] = $validated['is_active'] ?? true;

        $pauseReason = PauseReason::create($validated);

        activity('pause_reasons')
            ->causedBy($request->user())
            ->performedOn($pauseReason)
            ->log("Alasan jeda SLA '{$pauseReason->reason}' ditambahkan oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Alasan jeda SLA '{$pauseReason->reason}' berhasil ditambahkan.",
            'data' => $pauseReason,
        ], 201);
    }

    /**
     * GET /api/pause-reasons/{id}
     */
    public function show(int $id): JsonResponse
    {
        $pauseReason = PauseReason::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $pauseReason,
        ]);
    }

    /**
     * PUT /api/pause-reasons/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $pauseReason = PauseReason::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:50|unique:pause_reasons,code,'.$pauseReason->id,
            'reason' => 'sometimes|string|max:255',
            'requires_photo' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'order_index' => 'sometimes|integer',
        ]);

        $pauseReason->update($validated);

        activity('pause_reasons')
            ->causedBy($request->user())
            ->performedOn($pauseReason)
            ->log("Alasan jeda SLA '{$pauseReason->reason}' diperbarui oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Alasan jeda SLA '{$pauseReason->reason}' berhasil diperbarui.",
            'data' => $pauseReason,
        ]);
    }

    /**
     * DELETE /api/pause-reasons/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $pauseReason = PauseReason::findOrFail($id);
        $name = $pauseReason->reason;
        $pauseReason->delete();

        activity('pause_reasons')
            ->causedBy($request->user())
            ->performedOn($pauseReason)
            ->log("Alasan jeda SLA '{$name}' dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Alasan jeda SLA '{$name}' berhasil dihapus.",
        ]);
    }
}

