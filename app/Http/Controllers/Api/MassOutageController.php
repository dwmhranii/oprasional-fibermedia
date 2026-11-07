<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Incident;
use App\Modules\Network\Services\MassOutageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MassOutageController extends Controller
{
    public function __construct(
        protected MassOutageService $massOutageService
    ) {}

    /**
     * Tampilkan daftar pelanggan terdampak dari elemen jaringan yang dipilih.
     */
    public function affectedCustomers(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:olt,odc,odp,cable_track,cable,network_cable',
            'element_id' => 'required|integer',
        ]);

        $details = $this->massOutageService->getAffectedDetails(
            $request->query('element_type'),
            (int) $request->query('element_id')
        );

        return response()->json([
            'success' => true,
            'data' => [
                'total_affected' => $details['total_affected'],
                'isolated_count' => $details['isolated_count'],
                'per_odp' => $details['per_odp'],
                'node_info' => $details['node_info'],
                'customers' => $details['customers']->map(function ($c) {
                    return [
                        'id' => $c->id,
                        'customer_code' => $c->customer_code,
                        'name' => $c->name,
                        'phone' => $c->phone,
                        'address' => $c->address,
                        'odp_id' => $c->odp_id,
                        'odp_port' => $c->odp_port,
                        'odp_code' => $c->odp?->code,
                        'package' => $c->package,
                        'status' => $c->status,
                        'is_online' => (bool) $c->is_online,
                    ];
                }),
            ],
        ]);
    }

    /**
     * Pratinjau dampak sebelum memicu gangguan massal.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:olt,odc,odp,cable_track,cable,network_cable',
            'element_id' => 'required|integer',
        ]);

        $preview = $this->massOutageService->getAffectedDetails(
            $request->query('element_type'),
            (int) $request->query('element_id')
        );

        return response()->json([
            'success' => true,
            'data' => $preview,
        ]);
    }

    /**
     * Picu gangguan massal: ubah status elemen jaringan ke disrupted/cut,
     * buat SATU tiket untuk seluruh pelanggan terdampak, dan masukkan ke antrean dispatch.
     */
    public function trigger(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:olt,odc,odp,cable_track,cable,network_cable',
            'element_id' => 'required|integer',
            'status' => 'required|in:disrupted,cut',
            'notes' => 'nullable|string|max:500',
            'dry_run' => 'nullable|boolean',
        ]);

        $result = $this->massOutageService->triggerMassOutage(
            elementType: $request->input('element_type'),
            elementId: (int) $request->input('element_id'),
            status: $request->input('status'),
            notes: $request->input('notes'),
            actor: $request->user(),
            dryRun: $request->boolean('dry_run', false)
        );

        $statusCode = ($result['mode'] ?? '') === 'preview' ? 200 : 201;

        return response()->json([
            'success' => true,
            'message' => ($result['mode'] ?? '') === 'preview'
                ? 'Pratinjau dampak gangguan massal'
                : 'Tiket gangguan massal berhasil dibuat dan dialokasikan ke tim lapangan.',
            'data' => [
                'complaint' => $result['complaint'] ?? null,
                'incident' => $result['incident'] ?? null,
                'affected_count' => $result['affected_count'] ?? ($result['total_affected'] ?? 0),
                'element' => $result['element'] ?? ($result['node_info'] ?? null),
                'preview' => ($result['mode'] ?? '') === 'preview' ? $result : null,
            ],
        ], $statusCode);
    }

    /**
     * Pulihkan gangguan massal kembali ke status normal.
     */
    public function resolve(Request $request): JsonResponse
    {
        $request->validate([
            'element_type' => 'required|in:olt,odc,odp,cable_track,cable,network_cable',
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
            'message' => 'Status elemen jaringan dipulihkan ke normal dan tiket pengaduan diselesaikan.',
            'data' => $result,
        ]);
    }

    /**
     * Pisahkan pelanggan terdampak ke tiket mandiri baru (action "Pisahkan ke tiket sendiri").
     */
    public function split(Request $request): JsonResponse
    {
        $request->validate([
            'incident_id' => 'required|integer|exists:incidents,id',
            'customer_id' => 'required|integer|exists:customers,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $result = $this->massOutageService->splitCustomer(
            incidentId: (int) $request->input('incident_id'),
            customerId: (int) $request->input('customer_id'),
            reason: $request->input('reason'),
            actor: $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Pelanggan berhasil dipisahkan ke tiket mandiri baru.',
            'data' => $result,
        ], 201);
    }

    /**
     * Dapatkan daftar insiden gangguan massal yang sedang aktif.
     */
    public function activeIncidents(): JsonResponse
    {
        $incidents = Incident::with(['complaint:id,ticket_number,incident_id,status,subject,assigned_team_id', 'complaint.assignedTeam:id,name'])
            ->where('status', 'open')
            ->latest('id')
            ->get()
            ->map(function ($inc) {
                $affectedCount = $inc->customers()->wherePivot('state', 'affected')->count();

                return [
                    'id' => $inc->id,
                    'code' => $inc->code,
                    'node_type' => $inc->node_type,
                    'node_id' => $inc->node_id,
                    'node_name' => $inc->node?->name ?? strtoupper($inc->node_type)." #{$inc->node_id}",
                    'severity' => $inc->severity,
                    'detected_at' => $inc->detected_at?->toIso8601String(),
                    'affected_count' => $affectedCount,
                    'summary' => $inc->summary,
                    'complaint' => $inc->complaint ? [
                        'id' => $inc->complaint->id,
                        'ticket_number' => $inc->complaint->ticket_number,
                        'status' => $inc->complaint->status?->value ?? $inc->complaint->status,
                        'assigned_team' => $inc->complaint->assignedTeam?->name,
                    ] : null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'total_active_incidents' => $incidents->count(),
                'total_affected_customers' => $incidents->sum('affected_count'),
                'incidents' => $incidents,
            ],
        ]);
    }

    /**
     * Ekspor CSV daftar pelanggan terdampak gangguan massal.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $request->validate([
            'incident_id' => 'nullable|integer|exists:incidents,id',
            'element_type' => 'nullable|in:olt,odc,odp,cable_track,cable,network_cable',
            'element_id' => 'nullable|integer',
        ]);

        if ($request->filled('incident_id')) {
            $incident = Incident::with(['customers.odp'])->findOrFail($request->query('incident_id'));
            $customers = $incident->customers;
            $filename = "pelanggan_terdampak_{$incident->code}.csv";
        } else {
            $details = $this->massOutageService->getAffectedDetails(
                $request->query('element_type'),
                (int) $request->query('element_id')
            );
            $customers = $details['customers'];
            $filename = "pelanggan_terdampak_{$request->query('element_type')}_{$request->query('element_id')}.csv";
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($customers) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // UTF-8 BOM
            fputcsv($handle, ['ID', 'ID Pelanggan', 'Nama Pelanggan', 'Telepon', 'Alamat', 'ODP', 'Port', 'Paket', 'Status', 'Tautan WhatsApp']);

            foreach ($customers as $c) {
                $phoneClean = preg_replace('/\D+/', '', (string) $c->phone);
                if (str_starts_with($phoneClean, '0')) {
                    $phoneClean = '62'.substr($phoneClean, 1);
                }
                $waText = urlencode("Halo {$c->name}, kami menginformasikan bahwa saat ini sedang terjadi gangguan jaringan di area Anda dan tim teknisi kami sedang dalam penanganan.");
                $waUrl = $phoneClean ? "https://wa.me/{$phoneClean}?text={$waText}" : '-';

                fputcsv($handle, [
                    $c->id,
                    $c->customer_code,
                    $c->name,
                    $c->phone,
                    $c->address,
                    $c->odp?->name ?? "ODP #{$c->odp_id}",
                    $c->odp_port ?? '-',
                    $c->package ?? '-',
                    $c->status,
                    $waUrl,
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}
