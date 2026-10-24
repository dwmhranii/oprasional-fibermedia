<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrasDevice;
use App\Models\BrasSessionLog;
use App\Services\Mikrotik\BrasSyncService;
use App\Services\Mikrotik\MikrotikApiClient;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrasDeviceController extends Controller
{
    public function __construct(
        protected BrasSyncService $syncService
    ) {}

    /**
     * Daftar semua perangkat BRAS MikroTik.
     */
    public function index(): JsonResponse
    {
        $devices = BrasDevice::withCount(['customers', 'sessionLogs'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $devices,
        ]);
    }

    /**
     * Tambah konfigurasi perangkat BRAS baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:bras_devices,name',
            'ip_address' => 'required|string|max:45',
            'api_port' => 'nullable|integer|between:1,65535',
            'username' => 'nullable|string|max:100',
            'password' => 'nullable|string',
            'use_ssl' => 'nullable|boolean',
            'timeout' => 'nullable|integer|min:1|max:60',
            'location' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['api_port'] = $validated['api_port'] ?? 8728;
        $validated['timeout'] = $validated['timeout'] ?? 5;
        $validated['use_ssl'] = (bool) ($validated['use_ssl'] ?? false);
        $validated['is_active'] = (bool) ($validated['is_active'] ?? true);

        $device = BrasDevice::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Perangkat BRAS berhasil ditambahkan.',
            'data' => $device,
        ], 201);
    }

    /**
     * Detail satu perangkat BRAS.
     */
    public function show(BrasDevice $brasDevice): JsonResponse
    {
        $brasDevice->loadCount(['customers', 'sessionLogs']);

        return response()->json([
            'success' => true,
            'data' => $brasDevice,
        ]);
    }

    /**
     * Perbarui konfigurasi perangkat BRAS.
     */
    public function update(Request $request, BrasDevice $brasDevice): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100|unique:bras_devices,name,'.$brasDevice->id,
            'ip_address' => 'sometimes|string|max:45',
            'api_port' => 'nullable|integer|between:1,65535',
            'username' => 'nullable|string|max:100',
            'password' => 'nullable|string',
            'use_ssl' => 'nullable|boolean',
            'timeout' => 'nullable|integer|min:1|max:60',
            'location' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        // Jangan timpa password jika tidak diisi saat update
        if (array_key_exists('password', $validated) && empty($validated['password'])) {
            unset($validated['password']);
        }

        $brasDevice->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi BRAS berhasil diperbarui.',
            'data' => $brasDevice,
        ]);
    }

    /**
     * Hapus perangkat BRAS.
     */
    public function destroy(BrasDevice $brasDevice): JsonResponse
    {
        $brasDevice->delete();

        return response()->json([
            'success' => true,
            'message' => 'Perangkat BRAS berhasil dihapus.',
        ]);
    }

    /**
     * Trigger sinkronisasi sesi PPPoE aktif secara manual.
     */
    public function sync(BrasDevice $brasDevice): JsonResponse
    {
        $result = $this->syncService->syncDevice($brasDevice);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'data' => [
                'active_sessions' => $result['active_sessions'],
                'updated_customers' => $result['updated_customers'],
                'bras_device' => $brasDevice->fresh(),
            ],
        ], $result['success'] ? 200 : 422);
    }

    /**
     * Ambil sesi aktif langsung dari router BRAS via API.
     */
    public function sessions(BrasDevice $brasDevice): JsonResponse
    {
        if (empty($brasDevice->ip_address)) {
            return response()->json([
                'success' => false,
                'message' => 'Alamat IP BRAS belum ditentukan.',
            ], 422);
        }

        try {
            $client = new MikrotikApiClient(
                host: $brasDevice->ip_address,
                port: $brasDevice->api_port ?: 8728,
                timeout: $brasDevice->timeout ?: 5,
                ssl: (bool) $brasDevice->use_ssl
            );

            $client->connect(
                username: $brasDevice->username ?? 'admin',
                password: $brasDevice->password ?? ''
            );

            $sessions = $client->getActivePppoeSessions();
            $client->disconnect();

            return response()->json([
                'success' => true,
                'count' => count($sessions),
                'data' => $sessions,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil sesi aktif: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ambil log sesi BRAS dengan source = 'bras'.
     */
    public function logs(Request $request, BrasDevice $brasDevice): JsonResponse
    {
        $limit = min(100, (int) $request->input('limit', 30));

        $logs = BrasSessionLog::where('bras_device_id', $brasDevice->id)
            ->where('source', 'bras')
            ->with(['customer:id,customer_code,name,status,is_online'])
            ->latest()
            ->paginate($limit);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
