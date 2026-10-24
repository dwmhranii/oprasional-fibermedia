<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CableTrack;
use App\Models\Customer;
use App\Models\Odp;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;

class NetworkSyncController extends Controller
{
    /**
     * Sinkron data jaringan incremental ke Dexie PWA (Item 3).
     */
    public function sync(Request $request)
    {
        $since = $request->query('since');
        $query = Odp::query();

        $deletedOdpIds = [];

        if ($since) {
            try {
                $sinceCarbon = is_numeric($since)
                    ? Carbon::createFromTimestamp((int) $since)
                    : Carbon::parse($since);

                $formattedSince = $sinceCarbon->format('Y-m-d H:i:s');
                $query->where('updated_at', '>=', $formattedSince);

                // Ambil id ODP yang terhapus setelah timestamp 'since'
                $deletedOdpIds = Odp::onlyTrashed()
                    ->where('deleted_at', '>=', $formattedSince)
                    ->pluck('id')
                    ->toArray();
            } catch (\Throwable) {
                // If invalid date format, proceed with full query
            }
        }

        $odps = $query->get()->map(function ($odp) {
            return [
                'id' => $odp->id,
                'client_uuid' => $odp->client_uuid,
                'code' => $odp->code,
                'name' => $odp->name,
                'address' => $odp->address,
                'latitude' => $odp->latitude !== null ? (float) $odp->latitude : null,
                'longitude' => $odp->longitude !== null ? (float) $odp->longitude : null,
                'proposed_latitude' => $odp->proposed_latitude !== null ? (float) $odp->proposed_latitude : null,
                'proposed_longitude' => $odp->proposed_longitude !== null ? (float) $odp->proposed_longitude : null,
                'port_capacity' => (int) ($odp->port_capacity ?? 8),
                'wilayah' => $odp->wilayah,
                'status' => $odp->status ?? 'active',
                'is_approved' => (bool) $odp->is_approved,
                'is_active' => (bool) $odp->is_active,
                'updated_at' => $odp->updated_at?->toIso8601String(),
            ];
        });

        // Ambil daftar port yang terisi per ODP
        $usedPorts = Customer::whereNotNull('odp_id')
            ->whereNotNull('odp_port')
            ->where('status', '!=', 'terminated')
            ->select('odp_id', 'odp_port')
            ->get()
            ->groupBy('odp_id')
            ->map(function ($items) {
                return $items->pluck('odp_port')->unique()->values()->all();
            });

        return response()->json([
            'success' => true,
            'data' => [
                'odps' => $odps,
                'used_ports' => $usedPorts,
                'deleted_odp_ids' => $deletedOdpIds,
                'sync_timestamp' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Tambah ODP dari lapangan dengan client_uuid & Idempotency-Key (Item 4 & 7).
     * Mencegah timpa koordinat yang sudah disetujui admin.
     */
    public function storeOdp(Request $request)
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        $clientUuid = $request->input('client_uuid') ?: $idempotencyKey ?: (string) Str::uuid();

        // 1. Cek idempotency: jika client_uuid sudah ada, jangan buat ganda
        $existing = Odp::where('client_uuid', $clientUuid)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'ODP sudah terdaftar sebelumnya (idempotent).',
                'data' => $existing,
            ], 200);
        }

        $validated = $request->validate([
            'client_uuid' => 'nullable|string|max:100',
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:100',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'port_capacity' => 'nullable|integer|min:1|max:64',
            'wilayah' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $code = $validated['code'] ?? null;
        if (! $code) {
            $code = 'ODP-FLD-'.strtoupper(substr(str_replace('-', '', $clientUuid), 0, 6));
        }

        // 2. Cek apakah ada ODP dengan kode yang sama yang sudah disetujui admin
        $existingByCode = Odp::where('code', $code)->first();
        if ($existingByCode) {
            if ($existingByCode->is_approved) {
                // Jangan timpa koordinat yang sudah disetujui! Buat sebagai usulan perubahan
                $existingByCode->proposed_latitude = $validated['latitude'];
                $existingByCode->proposed_longitude = $validated['longitude'];
                $existingByCode->status = 'needs_review';
                $existingByCode->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Perubahan koordinat ODP diajukan sebagai usulan (perlu ditinjau admin).',
                    'data' => $existingByCode,
                ], 200);
            }

            // Jika belum disetujui, update koordinat
            $existingByCode->update([
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'name' => $validated['name'],
                'status' => 'needs_review',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'ODP berhasil diperbarui dan menunggu peninjauan admin.',
                'data' => $existingByCode,
            ], 200);
        }

        // 3. Simpan ODP baru dengan status needs_review
        $odp = Odp::create([
            'client_uuid' => $clientUuid,
            'code' => $code,
            'name' => $validated['name'],
            'address' => $validated['address'] ?? null,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'port_capacity' => $validated['port_capacity'] ?? 8,
            'wilayah' => $validated['wilayah'] ?? 'Kota',
            'notes' => $validated['notes'] ?? 'Dibuat dari HP di lapangan',
            'status' => 'needs_review',
            'is_approved' => false,
            'is_active' => true,
            'created_by_id' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usulan ODP baru berhasil disimpan dan menunggu peninjauan admin.',
            'data' => $odp,
        ], 201);
    }

    /**
     * Rekam jalur kabel dari watchPosition HP (Item 5).
     */
    public function storeCableTrack(Request $request)
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        $clientUuid = $request->input('client_uuid') ?: $idempotencyKey ?: (string) Str::uuid();

        // 1. Cek idempotency
        $existing = CableTrack::where('client_uuid', $clientUuid)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Usulan jalur kabel sudah tercatat sebelumnya (idempotent).',
                'data' => $existing,
            ], 200);
        }

        $validated = $request->validate([
            'client_uuid' => 'nullable|string|max:100',
            'name' => 'required|string|max:150',
            'coordinates' => 'required|array|min:2',
            'raw_points_count' => 'nullable|integer',
            'simplified_points_count' => 'nullable|integer',
            'total_length_meters' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $track = CableTrack::create([
            'client_uuid' => $clientUuid,
            'name' => $validated['name'],
            'coordinates' => $validated['coordinates'],
            'raw_points_count' => $validated['raw_points_count'] ?? count($validated['coordinates']),
            'simplified_points_count' => $validated['simplified_points_count'] ?? count($validated['coordinates']),
            'total_length_meters' => $validated['total_length_meters'] ?? 0,
            'created_by_id' => $request->user()?->id,
            'status' => 'proposed',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usulan jalur kabel berhasil disimpan.',
            'data' => $track,
        ], 201);
    }

    /**
     * Ambil daftar rekam jejak kabel untuk pemetaan admin.
     */
    public function indexCableTracks()
    {
        $tracks = CableTrack::with(['creator:id,name', 'connectedOdc:id,code,name', 'connectedOdp:id,code,name'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $tracks,
        ]);
    }

    /**
     * Manifest Peta Offline PMTiles (Item 1).
     */
    public function tilesManifest()
    {
        $pmtilesPath = storage_path('app/tiles/area.pmtiles');
        $fileSize = file_exists($pmtilesPath) ? filesize($pmtilesPath) : 15728640; // 15 MB placeholder
        $version = file_exists($pmtilesPath) ? date('Y.m.d', filemtime($pmtilesPath)) : '2026.10.1';

        return response()->json([
            'name' => 'Fibermedia Area Malang Bululawang Vector Tiles',
            'version' => $version,
            'size_bytes' => $fileSize,
            'size_formatted' => round($fileSize / (1024 * 1024), 1).' MB',
            'url' => url('/tiles/area.pmtiles'),
            'bounds' => [112.55, -8.15, 112.75, -8.00],
            'center' => [112.63, -8.08, 14],
            'attribution' => '© Fibermedia Ops, OpenStreetMap contributors',
        ]);
    }

    /**
     * Serve PMTiles file with range request support for MapLibre/PWA.
     */
    public function servePmtiles(Request $request)
    {
        $pmtilesPath = storage_path('app/tiles/area.pmtiles');
        if (! file_exists($pmtilesPath)) {
            // Jika belum ada file biner PMTiles sesungguhnya, sediakan stub biner atau 200 stream
            return response('PMTILES_PLACEHOLDER_DATA', 200, [
                'Content-Type' => 'application/vnd.pmtiles',
                'Accept-Ranges' => 'bytes',
                'Access-Control-Allow-Origin' => '*',
            ]);
        }

        return Response::file($pmtilesPath, [
            'Content-Type' => 'application/vnd.pmtiles',
            'Accept-Ranges' => 'bytes',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }
}
