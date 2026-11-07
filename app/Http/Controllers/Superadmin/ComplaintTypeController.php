<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintTypeController extends Controller
{
    /**
     * GET /api/complaint-types
     */
    public function index(Request $request): JsonResponse
    {
        $query = ComplaintType::query()
            ->withCount('complaints')
            ->orderBy('is_active', 'desc')
            ->orderBy('name', 'asc');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $types = $query->get()->map(function (ComplaintType $type) {
            return [
                'id' => $type->id,
                'name' => $type->name,
                'description' => $type->description,
                'default_priority' => $type->default_priority,
                'default_priority_label' => match (strtolower($type->default_priority)) {
                    'critical' => 'Kritis',
                    'high' => 'Tinggi',
                    default => 'Sedang',
                },
                'is_active' => (bool) $type->is_active,
                'complaints_count' => $type->complaints_count ?? 0,
                'created_at' => $type->created_at?->toIso8601String(),
                'updated_at' => $type->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * POST /api/complaint-types
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:complaint_types,name',
            'description' => 'nullable|string|max:500',
            'default_priority' => 'required|string|in:critical,high,medium,kritis,tinggi,sedang',
            'is_active' => 'boolean',
        ]);

        $priorityMap = [
            'kritis' => 'critical',
            'tinggi' => 'high',
            'sedang' => 'medium',
        ];
        $normPriority = strtolower($validated['default_priority']);
        $validated['default_priority'] = $priorityMap[$normPriority] ?? $normPriority;
        $validated['is_active'] = $validated['is_active'] ?? true;

        $type = ComplaintType::create($validated);

        activity('complaint_types')
            ->causedBy($request->user())
            ->performedOn($type)
            ->log("Jenis gangguan '{$type->name}' berhasil ditambahkan oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Jenis gangguan '{$type->name}' berhasil ditambahkan.",
            'data' => $type,
        ], 201);
    }

    /**
     * GET /api/complaint-types/{id}
     */
    public function show(int $id): JsonResponse
    {
        $type = ComplaintType::withCount('complaints')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $type,
        ]);
    }

    /**
     * PUT /api/complaint-types/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $type = ComplaintType::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150|unique:complaint_types,name,'.$type->id,
            'description' => 'nullable|string|max:500',
            'default_priority' => 'sometimes|string|in:critical,high,medium,kritis,tinggi,sedang',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['default_priority'])) {
            $priorityMap = [
                'kritis' => 'critical',
                'tinggi' => 'high',
                'sedang' => 'medium',
            ];
            $norm = strtolower($validated['default_priority']);
            $validated['default_priority'] = $priorityMap[$norm] ?? $norm;
        }

        $type->update($validated);

        activity('complaint_types')
            ->causedBy($request->user())
            ->performedOn($type)
            ->log("Jenis gangguan '{$type->name}' diperbarui oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Jenis gangguan '{$type->name}' berhasil diperbarui.",
            'data' => $type,
        ]);
    }

    /**
     * DELETE /api/complaint-types/{id}
     * PRD: Jenis yang sudah dipakai tiket tidak boleh dihapus permanen, hanya dinonaktifkan.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $type = ComplaintType::findOrFail($id);

        $isUsedByComplaints = Complaint::where('complaint_type_id', $id)->exists();

        if ($isUsedByComplaints) {
            $type->update(['is_active' => false]);

            activity('complaint_types')
                ->causedBy($request->user())
                ->performedOn($type)
                ->log("Jenis gangguan '{$type->name}' telah dipakai oleh tiket dan dinonaktifkan oleh {$request->user()->name}");

            return response()->json([
                'success' => true,
                'message' => "Jenis gangguan '{$type->name}' telah digunakan oleh tiket riil, sehingga dinonaktifkan (tidak dihapus permanen).",
                'data' => [
                    'id' => $type->id,
                    'is_active' => false,
                    'action' => 'deactivated',
                ],
            ]);
        }

        $type->delete();

        activity('complaint_types')
            ->causedBy($request->user())
            ->performedOn($type)
            ->log("Jenis gangguan '{$type->name}' berhasil dihapus oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Jenis gangguan '{$type->name}' berhasil dihapus.",
            'data' => [
                'id' => $id,
                'action' => 'deleted',
            ],
        ]);
    }
}

