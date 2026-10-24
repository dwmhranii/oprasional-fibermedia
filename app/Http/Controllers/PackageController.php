<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Services\PackageSyncService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PackageController extends Controller
{
    /**
     * Get packages catalog.
     * Serves active packages by default, or all packages for admin.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Package::query();

        if (! $request->boolean('all')) {
            $query->active();
        }

        $packages = $query->orderBy('price', 'asc')->get();

        $lastSynced = Package::max('synced_at');

        return $this->successResponse([
            'packages' => $packages,
            'synced_at' => $lastSynced ? Carbon::parse($lastSynced)->toIso8601String() : null,
        ], 'Packages retrieved successfully');
    }

    /**
     * Create a new package (Admin / Superadmin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:100|unique:packages,code',
            'name' => 'required|string|max:150',
            'speed_mbps' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_popular' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = Str::slug($validated['name'].'-'.$validated['speed_mbps'].'mbps');
        }

        $validated['is_popular'] = $validated['is_popular'] ?? false;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['synced_at'] = now();

        $package = Package::create($validated);

        return $this->successResponse($package, 'Paket baru berhasil ditambahkan', 201);
    }

    /**
     * Update existing package (Admin / Superadmin).
     */
    public function update(Request $request, Package $package): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'speed_mbps' => 'sometimes|required|integer|min:1',
            'price' => 'sometimes|required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_popular' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        $package->update($validated);

        return $this->successResponse($package, 'Data paket berhasil diperbarui');
    }

    /**
     * Toggle active status of a package (Admin / Superadmin).
     */
    public function toggleActive(Package $package): JsonResponse
    {
        $package->is_active = ! $package->is_active;
        $package->save();

        $statusText = $package->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return $this->successResponse($package, "Paket '{$package->name}' berhasil {$statusText}");
    }

    /**
     * Delete a package (RESTRICTED TO SUPERADMIN ONLY).
     */
    public function destroy(Package $package): JsonResponse
    {
        $packageName = $package->name;
        $package->delete();

        return $this->successResponse(null, "Paket '{$packageName}' berhasil dihapus");
    }

    /**
     * Trigger manual package synchronization with multi-tier fallback.
     * Restricted to Admin / Superadmin roles with rate limiting.
     */
    public function sync(PackageSyncService $syncService): JsonResponse
    {
        $result = $syncService->sync();

        return $this->successResponse([
            'synced' => $result['synced'],
            'synced_at' => $result['synced_at'],
            'method' => $result['method'] ?? 'local',
        ], $result['message']);
    }
}
