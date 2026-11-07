<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\NetworkCable;
use App\Models\NetworkStatusLog;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use App\Modules\Network\Services\KmzExporterService;
use App\Modules\Network\Services\KmzImporterService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class NetworkApiController extends Controller
{
    /**
     * Peta Jaringan GeoJSON dengan dukungan filter bbox, tipe simpul, ETag, dan Cache.
     */
    public function map(Request $request): JsonResponse
    {
        $bbox = $request->query('bbox'); // minLon,minLat,maxLon,maxLat
        $types = $request->query('types') ? explode(',', $request->query('types')) : ['olt', 'odc', 'odp', 'cable'];

        $parsedBbox = null;
        if ($bbox) {
            $parts = explode(',', $bbox);
            if (count($parts) === 4) {
                $parsedBbox = [
                    'minLon' => (float) $parts[0],
                    'minLat' => (float) $parts[1],
                    'maxLon' => (float) $parts[2],
                    'maxLat' => (float) $parts[3],
                ];
            }
        }

        // Cache key unik berdasarkan parameter
        $cacheKey = 'network_map_geojson_'.md5(json_encode([$bbox, $types]));
        $etag = Cache::remember($cacheKey.'_etag', 60, function () {
            $latestOlt = Olt::max('updated_at');
            $latestOdc = Odc::max('updated_at');
            $latestOdp = Odp::max('updated_at');
            $latestCable = NetworkCable::max('updated_at');

            return md5($latestOlt.$latestOdc.$latestOdp.$latestCable);
        });

        if ($request->header('If-None-Match') === '"'.$etag.'"') {
            return response()->json(null, 304);
        }

        $features = Cache::remember($cacheKey, 30, function () use ($types, $parsedBbox) {
            $list = [];

            // 1. OLT
            if (in_array('olt', $types)) {
                $olts = Olt::query()
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->get();

                foreach ($olts as $olt) {
                    if ($parsedBbox && ! $this->inBbox($olt->longitude, $olt->latitude, $parsedBbox)) {
                        continue;
                    }

                    $list[] = [
                        'type' => 'Feature',
                        'geometry' => [
                            'type' => 'Point',
                            'coordinates' => [(float) $olt->longitude, (float) $olt->latitude],
                        ],
                        'properties' => [
                            'id' => $olt->id,
                            'type' => 'olt',
                            'code' => $olt->code,
                            'name' => $olt->name,
                            'status' => $olt->status ?? 'normal',
                            'address' => $olt->address,
                            'is_active' => (bool) $olt->is_active,
                        ],
                    ];
                }
            }

            // 2. ODC
            if (in_array('odc', $types)) {
                $odcs = Odc::query()
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->withCount('odps')
                    ->get();

                foreach ($odcs as $odc) {
                    if ($parsedBbox && ! $this->inBbox($odc->longitude, $odc->latitude, $parsedBbox)) {
                        continue;
                    }

                    $list[] = [
                        'type' => 'Feature',
                        'geometry' => [
                            'type' => 'Point',
                            'coordinates' => [(float) $odc->longitude, (float) $odc->latitude],
                        ],
                        'properties' => [
                            'id' => $odc->id,
                            'type' => 'odc',
                            'code' => $odc->code,
                            'name' => $odc->name,
                            'status' => $odc->status ?? 'normal',
                            'address' => $odc->address,
                            'capacity_odp' => $odc->capacity_odp,
                            'odps_count' => $odc->odps_count,
                            'olt_id' => $odc->olt_id,
                        ],
                    ];
                }
            }

            // 3. ODP
            if (in_array('odp', $types)) {
                $odps = Odp::query()
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->withCount(['customers' => function ($q) {
                        $q->where('status', '!=', 'terminated')->whereNotNull('odp_port');
                    }])
                    ->get();

                foreach ($odps as $odp) {
                    if ($parsedBbox && ! $this->inBbox($odp->longitude, $odp->latitude, $parsedBbox)) {
                        continue;
                    }

                    $list[] = [
                        'type' => 'Feature',
                        'geometry' => [
                            'type' => 'Point',
                            'coordinates' => [(float) $odp->longitude, (float) $odp->latitude],
                        ],
                        'properties' => [
                            'id' => $odp->id,
                            'type' => 'odp',
                            'code' => $odp->code,
                            'name' => $odp->name,
                            'status' => $odp->status ?? 'normal',
                            'address' => $odp->address,
                            'port_capacity' => (int) $odp->port_capacity,
                            'used_ports' => (int) $odp->customers_count,
                            'free_ports' => max(0, $odp->port_capacity - $odp->customers_count),
                            'odc_id' => $odp->odc_id,
                            'needs_review' => (bool) $odp->needs_review,
                        ],
                    ];
                }
            }

            // 4. Kabel
            if (in_array('cable', $types)) {
                $cables = NetworkCable::query()
                    ->whereNotNull('route')
                    ->get();

                foreach ($cables as $cable) {
                    $route = is_array($cable->route) ? $cable->route : [];
                    if (count($route) < 2) {
                        continue;
                    }

                    if ($parsedBbox && ! $this->routeInBbox($route, $parsedBbox)) {
                        continue;
                    }

                    $list[] = [
                        'type' => 'Feature',
                        'geometry' => [
                            'type' => 'LineString',
                            'coordinates' => $route,
                        ],
                        'properties' => [
                            'id' => $cable->id,
                            'type' => 'cable',
                            'code' => $cable->code,
                            'name' => $cable->name,
                            'kind' => $cable->kind,
                            'is_backbone' => (bool) $cable->is_backbone,
                            'status' => $cable->status ?? 'normal',
                            'length_m' => (float) $cable->length_m,
                            'route_drawn' => (bool) $cable->route_drawn,
                            'from_type' => $cable->from_type,
                            'from_id' => $cable->from_id,
                            'to_type' => $cable->to_type,
                            'to_id' => $cable->to_id,
                        ],
                    ];
                }
            }

            return $list;
        });

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ], 200, ['ETag' => '"'.$etag.'"']);
    }

    /**
     * Sinkronisasi data jaringan inkremental.
     */
    public function sync(Request $request): JsonResponse
    {
        $since = $request->query('since');

        $queryOlt = Olt::query();
        $queryOdc = Odc::query();
        $queryOdp = Odp::query();
        $queryCable = NetworkCable::query();

        $deleted = [
            'olt_ids' => [],
            'odc_ids' => [],
            'odp_ids' => [],
            'cable_ids' => [],
        ];

        if ($since) {
            try {
                $sinceDate = Carbon::parse($since)->toDateTimeString();
                $queryOlt->where('updated_at', '>=', $sinceDate);
                $queryOdc->where('updated_at', '>=', $sinceDate);
                $queryOdp->where('updated_at', '>=', $sinceDate);
                $queryCable->where('updated_at', '>=', $sinceDate);

                $deleted['olt_ids'] = Olt::onlyTrashed()->where('deleted_at', '>=', $sinceDate)->pluck('id')->toArray();
                $deleted['odc_ids'] = Odc::onlyTrashed()->where('deleted_at', '>=', $sinceDate)->pluck('id')->toArray();
                $deleted['odp_ids'] = Odp::onlyTrashed()->where('deleted_at', '>=', $sinceDate)->pluck('id')->toArray();
                $deleted['cable_ids'] = NetworkCable::onlyTrashed()->where('deleted_at', '>=', $sinceDate)->pluck('id')->toArray();
            } catch (\Throwable) {
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'olts' => $queryOlt->get(),
                'odcs' => $queryOdc->get(),
                'odps' => $queryOdp->get(),
                'cables' => $queryCable->get(),
                'deleted' => $deleted,
                'sync_timestamp' => now()->toIso8601String(),
            ],
        ]);
    }

    // =========================================================================
    // OLT CRUD
    // =========================================================================

    public function oltsIndex(Request $request): JsonResponse
    {
        $olts = Olt::withCount('odcs')->orderBy('name', 'asc')->get();

        return response()->json(['success' => true, 'data' => $olts]);
    }

    public function oltsStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:olts,code',
            'ip_address' => 'nullable|ip',
            'address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = 'OLT-'.strtoupper(Str::slug($validated['name']));
        }
        $validated['client_uuid'] = (string) Str::uuid();

        $olt = Olt::create($validated);

        return response()->json(['success' => true, 'data' => $olt], 201);
    }

    public function oltsShow(Olt $olt): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $olt->load('odcs')]);
    }

    public function oltsUpdate(Request $request, Olt $olt): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'code' => 'nullable|string|max:50|unique:olts,code,'.$olt->id,
            'ip_address' => 'nullable|ip',
            'address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $olt->update($validated);

        return response()->json(['success' => true, 'data' => $olt]);
    }

    public function oltsDestroy(Olt $olt): JsonResponse
    {
        $olt->delete();

        return response()->json(['success' => true, 'message' => 'OLT berhasil dihapus.']);
    }

    // =========================================================================
    // ODC CRUD
    // =========================================================================

    public function odcsIndex(Request $request): JsonResponse
    {
        $query = Odc::with('olt')->withCount('odps')->orderBy('code', 'asc');
        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(fn ($q) => $q->where('code', 'like', "%{$s}%")->orWhere('name', 'like', "%{$s}%"));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function odcsStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'olt_id' => 'nullable|exists:olts,id',
            'code' => 'required|string|max:50|unique:odcs,code',
            'name' => 'required|string|max:150',
            'address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'capacity_odp' => 'nullable|integer|min:1|max:144',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['client_uuid'] = (string) Str::uuid();
        $odc = Odc::create($validated);

        return response()->json(['success' => true, 'data' => $odc], 201);
    }

    public function odcsShow(Odc $odc): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $odc->load(['olt', 'odps'])]);
    }

    public function odcsUpdate(Request $request, Odc $odc): JsonResponse
    {
        $validated = $request->validate([
            'olt_id' => 'nullable|exists:olts,id',
            'code' => 'sometimes|required|string|max:50|unique:odcs,code,'.$odc->id,
            'name' => 'sometimes|required|string|max:150',
            'address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'capacity_odp' => 'nullable|integer|min:1|max:144',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $odc->update($validated);

        return response()->json(['success' => true, 'data' => $odc]);
    }

    public function odcsDestroy(Odc $odc): JsonResponse
    {
        $odc->delete();

        return response()->json(['success' => true, 'message' => 'ODC berhasil dihapus.']);
    }

    // =========================================================================
    // ODP CRUD & PENCARIAN TERDEKAT & DETAIL PORT
    // =========================================================================

    public function odpsIndex(Request $request): JsonResponse
    {
        $query = Odp::with('odc')->orderBy('code', 'asc');
        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(fn ($q) => $q->where('code', 'like', "%{$s}%")->orWhere('name', 'like', "%{$s}%"));
        }
        if ($request->filled('odc_id')) {
            $query->where('odc_id', $request->input('odc_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function odpsStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'odc_id' => 'nullable|exists:odcs,id',
            'code' => 'required|string|max:50|unique:odps,code',
            'name' => 'required|string|max:150',
            'address' => 'nullable|string|max:500',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'port_capacity' => 'nullable|integer|min:1|max:64',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['client_uuid'] = (string) Str::uuid();
        $validated['is_approved'] = true;
        $validated['needs_review'] = false;
        $odp = Odp::create($validated);

        return response()->json(['success' => true, 'data' => $odp], 201);
    }

    public function odpsShow(Odp $odp): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $odp->load(['odc', 'customers'])]);
    }

    public function odpsUpdate(Request $request, Odp $odp): JsonResponse
    {
        $validated = $request->validate([
            'odc_id' => 'nullable|exists:odcs,id',
            'code' => 'sometimes|required|string|max:50|unique:odps,code,'.$odp->id,
            'name' => 'sometimes|required|string|max:150',
            'address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'port_capacity' => 'nullable|integer|min:1|max:64',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'notes' => 'nullable|string|max:1000',
        ]);

        $odp->update($validated);

        return response()->json(['success' => true, 'data' => $odp]);
    }

    public function odpsDestroy(Odp $odp): JsonResponse
    {
        $odp->delete();

        return response()->json(['success' => true, 'message' => 'ODP berhasil dihapus.']);
    }

    /**
     * Temukan ODP terdekat berdasarkan koordinat latitude & longitude.
     */
    public function nearestOdps(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius_m' => 'nullable|numeric|min:10',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        $lat = (float) $request->input('lat');
        $lng = (float) $request->input('lng');
        $radius = (float) $request->input('radius_m', 2000);
        $limit = (int) $request->input('limit', 10);

        $odps = Odp::whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->where('is_active', true)
            ->with(['odc:id,code,name'])
            ->withCount(['customers' => function ($q) {
                $q->where('status', '!=', 'terminated')->whereNotNull('odp_port');
            }])
            ->get();

        $results = [];
        foreach ($odps as $odp) {
            $distM = KmzImporterService::haversineDistance($lat, $lng, (float) $odp->latitude, (float) $odp->longitude);
            if ($distM <= $radius) {
                $results[] = [
                    'id' => $odp->id,
                    'code' => $odp->code,
                    'name' => $odp->name,
                    'latitude' => (float) $odp->latitude,
                    'longitude' => (float) $odp->longitude,
                    'odc' => $odp->odc,
                    'port_capacity' => (int) $odp->port_capacity,
                    'used_ports' => (int) $odp->customers_count,
                    'free_ports' => max(0, $odp->port_capacity - $odp->customers_count),
                    'distance_meters' => round($distM, 1),
                ];
            }
        }

        usort($results, fn ($a, $b) => $a['distance_meters'] <=> $b['distance_meters']);
        $results = array_slice($results, 0, $limit);

        return response()->json(['success' => true, 'data' => $results]);
    }

    /**
     * Dapatkan detail keterisian seluruh port pada satu ODP.
     */
    public function odpPorts(Odp $odp): JsonResponse
    {
        $capacity = (int) ($odp->port_capacity ?: 8);
        $customers = Customer::where('odp_id', $odp->id)
            ->where('status', '!=', 'terminated')
            ->select('id', 'name', 'customer_code', 'username', 'odp_port', 'status', 'is_online')
            ->get()
            ->keyBy('odp_port');

        $ports = [];
        for ($i = 1; $i <= $capacity; $i++) {
            $occupant = $customers->get($i);
            $ports[] = [
                'port_number' => $i,
                'is_occupied' => (bool) $occupant,
                'customer' => $occupant ? [
                    'id' => $occupant->id,
                    'name' => $occupant->name,
                    'customer_code' => $occupant->customer_code,
                    'username' => $occupant->username,
                    'status' => $occupant->status,
                    'is_online' => (bool) $occupant->is_online,
                ] : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'odp' => [
                    'id' => $odp->id,
                    'code' => $odp->code,
                    'name' => $odp->name,
                    'port_capacity' => $capacity,
                    'used_count' => $customers->count(),
                    'free_count' => max(0, $capacity - $customers->count()),
                ],
                'ports' => $ports,
            ],
        ]);
    }

    // =========================================================================
    // KABEL CRUD & ROUTING
    // =========================================================================

    public function cablesIndex(Request $request): JsonResponse
    {
        $query = NetworkCable::with(['creator:id,name'])->latest('id');

        if ($request->boolean('undrawn')) {
            $query->where('route_drawn', false);
        }
        if ($request->filled('kind')) {
            $query->where('kind', $request->input('kind'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    public function cablesStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100|unique:network_cables,code',
            'from_type' => 'required|string|in:olt,odc,odp',
            'from_id' => 'nullable|integer',
            'from_name' => 'nullable|string|max:255',
            'to_type' => 'required|string|in:odc,odp,customer',
            'to_id' => 'nullable|integer',
            'to_name' => 'nullable|string|max:255',
            'kind' => 'required|string|in:olt_odc,odc_odp,odp_customer',
            'is_backbone' => 'nullable|boolean',
            'route' => 'nullable|array',
            'length_m' => 'nullable|numeric|min:0',
            'route_drawn' => 'nullable|boolean',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = 'CBL-'.strtoupper(Str::slug($validated['name'])).'-'.rand(100, 999);
        }
        $validated['client_uuid'] = (string) Str::uuid();
        $validated['created_by_id'] = $request->user()?->id;

        if (! empty($validated['route']) && empty($validated['length_m'])) {
            $validated['length_m'] = KmzImporterService::calculateRouteDistance($validated['route']);
        }

        $cable = NetworkCable::create($validated);

        return response()->json(['success' => true, 'data' => $cable], 201);
    }

    public function cablesShow(NetworkCable $cable): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $cable->load('creator')]);
    }

    public function cablesUpdate(Request $request, NetworkCable $cable): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'kind' => 'sometimes|required|string|in:olt_odc,odc_odp,odp_customer',
            'is_backbone' => 'nullable|boolean',
            'route' => 'nullable|array',
            'length_m' => 'nullable|numeric|min:0',
            'route_drawn' => 'nullable|boolean',
            'status' => 'nullable|string|in:normal,disrupted,cut,maintenance',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (isset($validated['route']) && empty($validated['length_m'])) {
            $validated['length_m'] = KmzImporterService::calculateRouteDistance($validated['route']);
        }

        $cable->update($validated);

        return response()->json(['success' => true, 'data' => $cable]);
    }

    /**
     * Perbarui jalur rute kabel & hitung otomatis panjang jaraknya.
     */
    public function updateCableRoute(Request $request, NetworkCable $cable): JsonResponse
    {
        $validated = $request->validate([
            'route' => 'required|array|min:2',
            'notes' => 'nullable|string|max:500',
        ]);

        $route = $validated['route'];
        $lengthM = KmzImporterService::calculateRouteDistance($route);

        $cable->update([
            'route' => $route,
            'length_m' => $lengthM,
            'route_drawn' => true,
            'notes' => $validated['notes'] ?? $cable->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Jalur kabel berhasil disimpan (panjang: {$lengthM} m).",
            'data' => $cable,
        ]);
    }

    public function cablesDestroy(NetworkCable $cable): JsonResponse
    {
        $cable->delete();

        return response()->json(['success' => true, 'message' => 'Kabel berhasil dihapus.']);
    }

    // =========================================================================
    // PERUBAHAN STATUS OPERASIONAL DENGAN AUDIT LOG
    // =========================================================================

    public function updateNodeStatus(Request $request, string $type, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:normal,disrupted,cut,maintenance',
            'reason' => 'nullable|string|max:500',
            'source' => 'nullable|string|in:manual,kmz,bras',
            'dry_run' => 'nullable|boolean',
        ]);

        $model = match ($type) {
            'olt' => Olt::findOrFail($id),
            'odc' => Odc::findOrFail($id),
            'odp' => Odp::findOrFail($id),
            'cable' => NetworkCable::findOrFail($id),
            default => abort(404, 'Tipe simpul tidak dikenali.'),
        };

        $toStatus = $validated['status'];
        $dryRun = $request->boolean('dry_run', false);
        $incidentService = app(\App\Modules\Network\Services\IncidentService::class);

        // Jika dry run untuk disrupted / cut, kembalikan pratinjau dampak
        if ($dryRun && in_array($toStatus, ['disrupted', 'cut'])) {
            $preview = $incidentService->preview($type, $id);

            return response()->json([
                'success' => true,
                'message' => 'Pratinjau dampak gangguan massal.',
                'data' => [
                    'mode' => 'preview',
                    'node' => $model,
                    'preview' => $preview,
                ],
            ]);
        }

        $fromStatus = $model->status ?? 'normal';
        $model->update(['status' => $toStatus]);

        $log = NetworkStatusLog::create([
            'node_type' => $type,
            'node_id' => $id,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'reason' => $validated['reason'] ?? 'Perubahan status operasional via API',
            'source' => $validated['source'] ?? 'manual',
            'user_id' => $request->user()?->id,
        ]);

        $incidentResult = null;
        if (in_array($toStatus, ['disrupted', 'cut'])) {
            $incidentResult = $incidentService->openFromStatusChange(
                nodeType: $type,
                nodeId: $id,
                status: $toStatus,
                reason: $validated['reason'] ?? null,
                actor: $request->user(),
                dryRun: false
            );
        } elseif ($toStatus === 'normal') {
            $incidentResult = $incidentService->resolveMassOutage(
                nodeType: $type,
                nodeId: $id,
                resolutionNotes: $validated['reason'] ?? null,
                actor: $request->user()
            );
        }

        return response()->json([
            'success' => true,
            'message' => "Status {$type} #{$id} berhasil diperbarui ke {$toStatus}.",
            'data' => [
                'node' => $model,
                'log' => $log,
                'incident' => $incidentResult,
            ],
        ]);
    }

    // =========================================================================
    // IMPOR & EKSPOR KMZ
    // =========================================================================

    public function importKmz(Request $request, KmzImporterService $importer): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:51200', // max 50MB
            'dry_run' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        $dryRun = $request->boolean('dry_run');

        $tempPath = $file->getRealPath();
        $result = $importer->import($tempPath, $dryRun, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => $dryRun ? 'Simulasi impor KMZ berhasil diselesaikan.' : 'Impor data KMZ berhasil diproses.',
            'data' => $result,
        ]);
    }

    public function exportKmz(KmzExporterService $exporter): BinaryFileResponse
    {
        $kmzPath = $exporter->export();

        return response()->download($kmzPath, 'Fibermedia_Network_Export_'.date('Ymd_His').'.kmz', [
            'Content-Type' => 'application/vnd.google-earth.kmz',
        ]);
    }

    public function downloadReport(Request $request): BinaryFileResponse
    {
        $filename = basename((string) $request->query('filename'));
        $path = storage_path('app/reports/'.$filename);
        if (! file_exists($path)) {
            abort(404, 'Berkas laporan tidak ditemukan.');
        }

        return response()->download($path, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    // =========================================================================
    // PMTILES MANIFEST
    // =========================================================================

    public function tilesManifest(): JsonResponse
    {
        $pmtilesPath = storage_path('app/tiles/area.pmtiles');
        $fileSize = file_exists($pmtilesPath) ? filesize($pmtilesPath) : 15728640;
        $version = file_exists($pmtilesPath) ? date('Y.m.d', filemtime($pmtilesPath)) : '2026.10.1';

        return response()->json([
            'name' => 'Fibermedia Area Bululawang Vector Tiles',
            'version' => $version,
            'size_bytes' => $fileSize,
            'size_formatted' => round($fileSize / (1024 * 1024), 1).' MB',
            'url' => url('/api/network/tiles/area.pmtiles'),
            'bounds' => [112.55, -8.15, 112.75, -8.00],
            'center' => [112.637789, -8.081413, 14],
            'minzoom' => 10,
            'maxzoom' => 16,
            'attribution' => '© Fibermedia Ops, OpenStreetMap contributors, Protomaps',
        ]);
    }

    // =========================================================================
    // HELPER BOUNDING BOX
    // =========================================================================

    protected function inBbox(float $lon, float $lat, array $bbox): bool
    {
        return ($lon >= $bbox['minLon'] && $lon <= $bbox['maxLon'] &&
                $lat >= $bbox['minLat'] && $lat <= $bbox['maxLat']);
    }

    protected function routeInBbox(array $route, array $bbox): bool
    {
        foreach ($route as $pt) {
            if (is_array($pt) && count($pt) >= 2) {
                if ($this->inBbox((float) $pt[0], (float) $pt[1], $bbox)) {
                    return true;
                }
            }
        }

        return false;
    }
}
