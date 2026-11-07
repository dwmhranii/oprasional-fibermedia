<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    /**
     * Register or heartbeat user device from PWA/Field app.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_uuid' => 'required|string|max:100',
            'label' => 'nullable|string|max:150',
            'model' => 'nullable|string|max:150',
            'platform' => 'nullable|string|max:50',
        ]);

        $user = $request->user();

        $device = Device::firstOrNew(['device_uuid' => $validated['device_uuid']]);

        // Batasi maksimal 2 perangkat terdaftar per akun sesuai PRD Final v1.2
        if (! $device->exists) {
            $activeDeviceCount = Device::where('user_id', $user->id)
                ->whereNull('revoked_at')
                ->count();

            if ($activeDeviceCount >= 2) {
                if (config('app.env') !== 'production') {
                    Device::where('user_id', $user->id)
                        ->whereNull('revoked_at')
                        ->orderBy('last_seen_at', 'asc')
                        ->first()
                        ?->update(['revoked_at' => now()]);
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Batas maksimal 2 perangkat per akun telah tercapai. Hubungi administrator untuk mencabut perangkat lama.',
                    ], 422);
                }
            }
        }

        $device->user_id = $user->id;
        $device->label = $validated['label'] ?? $device->label ?? 'Perangkat Mobile';
        $device->model = $validated['model'] ?? $device->model;
        $device->platform = $validated['platform'] ?? $device->platform;
        $device->last_seen_at = now();

        // Auto approve in local or non-production environment or if user can manage devices
        if (! $device->exists && (config('app.env') !== 'production' || $user->can('devices.manage'))) {
            $device->approved_at = now();
            $device->approved_by_id = $user->id;
        }

        $device->save();

        return response()->json([
            'success' => true,
            'message' => $device->is_approved ? 'Perangkat terdaftar dan disetujui.' : 'Perangkat didaftarkan, menunggu persetujuan admin.',
            'data' => [
                'id' => $device->id,
                'device_uuid' => $device->device_uuid,
                'label' => $device->label,
                'is_approved' => $device->is_approved,
                'approved_at' => $device->approved_at,
            ],
        ]);
    }

    /**
     * List devices for admin management.
     */
    public function index(Request $request)
    {
        $query = Device::with(['user.currentTeam', 'approvedBy'])->latest('last_seen_at');

        if ($request->filled('status')) {
            if ($request->status === 'approved') {
                $query->whereNotNull('approved_at')->whereNull('revoked_at');
            } elseif ($request->status === 'pending') {
                $query->whereNull('approved_at')->whereNull('revoked_at');
            } elseif ($request->status === 'revoked') {
                $query->whereNotNull('revoked_at');
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('label', 'like', "%{$search}%")
                    ->orWhere('device_uuid', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $devices = $query->paginate($request->integer('per_page', 20));

        return \App\Http\Resources\DeviceResource::collection($devices);
    }

    /**
     * Approve device.
     */
    public function approve(Request $request, $id): JsonResponse
    {
        $device = Device::findOrFail($id);
        $device->update([
            'approved_at' => now(),
            'approved_by_id' => $request->user()->id,
            'revoked_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Perangkat berhasil disetujui.',
            'data' => new \App\Http\Resources\DeviceResource($device->fresh(['user', 'approvedBy'])),
        ]);
    }

    /**
     * Revoke device.
     */
    public function revoke(Request $request, $id): JsonResponse
    {
        $device = Device::findOrFail($id);
        $device->update([
            'revoked_at' => now(),
        ]);

        // Sesuai PRD Final v1.2: Mencabut perangkat menghapus token seketika
        $device->user?->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Perangkat berhasil dicabut.',
            'data' => new \App\Http\Resources\DeviceResource($device->fresh(['user', 'approvedBy'])),
        ]);
    }
}
