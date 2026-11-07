<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    /**
     * GET /api/holidays
     */
    public function index(Request $request): JsonResponse
    {
        $query = Holiday::query()->orderBy('holiday_date', 'asc');

        if ($request->filled('year')) {
            $year = (int) $request->year;
            $query->whereBetween('holiday_date', ["{$year}-01-01", "{$year}-12-31"]);
        }

        $holidays = $query->get()->map(function (Holiday $h) {
            return [
                'id' => $h->id,
                'name' => $h->name,
                'holiday_date' => $h->holiday_date?->format('Y-m-d'),
                'description' => $h->description,
                'created_at' => $h->created_at?->toIso8601String(),
                'updated_at' => $h->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $holidays,
        ]);
    }

    /**
     * POST /api/holidays
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'holiday_date' => 'required|date|unique:holidays,holiday_date',
            'description' => 'nullable|string|max:255',
        ]);

        $holiday = Holiday::create($validated);

        activity('holidays')
            ->causedBy($request->user())
            ->performedOn($holiday)
            ->log("Hari libur nasional '{$holiday->name}' ({$holiday->holiday_date->format('d/m/Y')}) ditambahkan oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Hari libur '{$holiday->name}' berhasil ditambahkan.",
            'data' => $holiday,
        ], 201);
    }

    /**
     * GET /api/holidays/{id}
     */
    public function show(int $id): JsonResponse
    {
        $holiday = Holiday::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $holiday,
        ]);
    }

    /**
     * PUT /api/holidays/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $holiday = Holiday::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'holiday_date' => 'sometimes|date|unique:holidays,holiday_date,'.$holiday->id,
            'description' => 'nullable|string|max:255',
        ]);

        $holiday->update($validated);

        activity('holidays')
            ->causedBy($request->user())
            ->performedOn($holiday)
            ->log("Hari libur '{$holiday->name}' diperbarui oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Hari libur '{$holiday->name}' berhasil diperbarui.",
            'data' => $holiday,
        ]);
    }

    /**
     * DELETE /api/holidays/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $holiday = Holiday::findOrFail($id);
        $name = $holiday->name;
        $holiday->delete();

        activity('holidays')
            ->causedBy($request->user())
            ->performedOn($holiday)
            ->log("Hari libur '{$name}' dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Hari libur '{$name}' berhasil dihapus.",
        ]);
    }
}

