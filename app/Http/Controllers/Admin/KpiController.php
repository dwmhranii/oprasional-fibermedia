<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KpiSetting;
use App\Modules\Kpi\Services\KpiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KpiController extends Controller
{
    protected KpiService $kpiService;

    public function __construct(KpiService $kpiService)
    {
        $this->kpiService = $kpiService;
    }

    /**
     * Rekap overview bulanan seluruh tim, teknisi, dan sales.
     */
    public function overview(Request $request): JsonResponse
    {
        $period = $request->query('period') ?: Carbon::now()->format('Y-m');
        $overview = $this->kpiService->getMonthlyOverview($period);

        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }

    /**
     * Hitung KPI Tim tertentu pada periode tertentu.
     */
    public function teamKpi(Request $request, int $teamId, string $period): JsonResponse
    {
        $version = $request->query('version') ? (int) $request->query('version') : null;
        $result = $this->kpiService->computeTeamKpi($period, $teamId, $version);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Hitung KPI Individu Teknisi tertentu pada periode tertentu.
     */
    public function technicianKpi(Request $request, int $userId, string $period): JsonResponse
    {
        $version = $request->query('version') ? (int) $request->query('version') : null;
        $result = $this->kpiService->computeTechnicianKpi($period, $userId, $version);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Hitung KPI Sales tertentu pada periode tertentu.
     */
    public function salesKpi(Request $request, int $userId, string $period): JsonResponse
    {
        $version = $request->query('version') ? (int) $request->query('version') : null;
        $result = $this->kpiService->computeSalesKpi($period, $userId, $version);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Input rating pelanggan 1-5 dan catatan dari WhatsApp.
     */
    public function recordRating(Request $request): JsonResponse
    {
        $request->validate([
            'ticket_type' => 'required|in:psb,complaint',
            'ticket_id' => 'required|integer',
            'rating' => 'required|integer|between:1,5',
            'note' => 'nullable|string|max:500',
        ]);

        $ticket = $this->kpiService->recordCustomerRating(
            $request->ticket_type,
            $request->ticket_id,
            $request->rating,
            $request->note,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Rating pelanggan berhasil dicatat.',
            'data' => $ticket,
        ]);
    }

    /**
     * Buat tautan WhatsApp resmi untuk konfirmasi rating pelanggan.
     */
    public function getWhatsAppLink(Request $request): JsonResponse
    {
        $request->validate([
            'ticket_type' => 'required|in:psb,complaint',
            'ticket_id' => 'required|integer',
        ]);

        $linkData = $this->kpiService->generateWhatsAppRatingLink($request->ticket_type, (int) $request->ticket_id);

        return response()->json([
            'success' => true,
            'data' => $linkData,
        ]);
    }

    /**
     * Ambil pengaturan KPI aktif dan daftar versi untuk setiap kategori.
     */
    public function getSettings(): JsonResponse
    {
        $settings = KpiSetting::with('creator')->orderBy('category')->orderByDesc('version')->get();
        $teamActive = KpiSetting::getActive('team');
        $techActive = KpiSetting::getActive('technician');
        $salesActive = KpiSetting::getActive('sales');

        return response()->json([
            'success' => true,
            'data' => \App\Http\Resources\KpiSettingResource::collection($settings),
            'active' => [
                'team' => $teamActive ? new \App\Http\Resources\KpiSettingResource($teamActive) : null,
                'technician' => $techActive ? new \App\Http\Resources\KpiSettingResource($techActive) : null,
                'sales' => $salesActive ? new \App\Http\Resources\KpiSettingResource($salesActive) : null,
            ],
        ]);
    }

    /**
     * Perbarui bobot/target KPI (membuat versi baru agar snapshot lama tidak berubah diam-diam).
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|in:team,technician,sales',
            'weights' => 'required|array',
            'targets' => 'nullable|array',
            'notes' => 'nullable|string|max:255',
            'read_only_until' => 'nullable|date',
        ]);

        $currentActive = KpiSetting::getActive($request->category);
        if (! $currentActive) {
            return response()->json([
                'success' => false,
                'message' => 'Pengaturan KPI kategori ini tidak ditemukan.',
            ], 404);
        }

        $newVersion = $currentActive->createNextVersion(
            weights: $request->weights,
            targets: $request->targets,
            notes: $request->notes,
            readOnlyUntil: $request->read_only_until,
            userId: $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => "Pengaturan KPI {$request->category} berhasil diperbarui ke versi {$newVersion->version}.",
            'data' => new \App\Http\Resources\KpiSettingResource($newVersion),
        ]);
    }

    /**
     * Ekspor Laporan Bulanan dalam format CSV/Excel.
     */
    public function export(Request $request)
    {
        $period = $request->query('period') ?: Carbon::now()->format('Y-m');
        $csvContent = $this->kpiService->exportCsv($period);
        $filename = "laporan-kpi-fibermedia-{$period}.csv";

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Memicu perhitungan snapshot seluruh tim, teknisi, dan sales.
     */
    public function triggerSnapshot(Request $request): JsonResponse
    {
        $period = $request->input('period') ?: Carbon::now()->format('Y-m');
        $results = $this->kpiService->snapshotAll($period);

        return response()->json([
            'success' => true,
            'message' => "Snapshot KPI untuk periode {$period} berhasil dihitung dan disimpan.",
            'data' => $results,
        ]);
    }
}
