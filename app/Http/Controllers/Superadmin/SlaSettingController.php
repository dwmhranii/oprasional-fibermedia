<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\SlaSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlaSettingController extends Controller
{
    /**
     * GET /api/sla-settings
     */
    public function index(): JsonResponse
    {
        $settings = SlaSetting::orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END")
            ->get()
            ->map(function (SlaSetting $s) {
                return [
                    'id' => $s->id,
                    'priority' => $s->priority,
                    'priority_label' => match (strtolower($s->priority)) {
                        'critical' => 'Kritis',
                        'high' => 'Tinggi',
                        default => 'Sedang',
                    },
                    'resolution_hours' => (int) $s->resolution_hours,
                    'resolution_minutes' => (int) $s->resolution_minutes,
                    'description' => $s->description,
                    'is_active' => (bool) $s->is_active,
                    'updated_at' => $s->updated_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $settings,
            'meta' => [
                'operational_hours' => '08:00 - 20:00 WIB',
                'operational_days' => 'Senin - Sabtu (Kecuali Hari Libur Nasional)',
                'sla_window_notice' => 'Target durasi SLA hanya dihitung pada jendela operasional dan otomatis tersalin saat tiket dibuat (perubahan tidak memengaruhi tiket berjalan).',
            ],
        ]);
    }

    /**
     * PUT /api/sla-settings/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $setting = SlaSetting::findOrFail($id);

        $validated = $request->validate([
            'resolution_hours' => 'required|numeric|min:0.5|max:168',
            'is_active' => 'sometimes|boolean',
            'description' => 'nullable|string|max:255',
        ]);

        $oldHours = $setting->resolution_hours;
        $oldMinutes = $setting->resolution_minutes;

        $newHours = (float) $validated['resolution_hours'];
        $newMinutes = (int) round($newHours * 60);

        $setting->update([
            'resolution_hours' => $newHours,
            'resolution_minutes' => $newMinutes,
            'is_active' => $validated['is_active'] ?? $setting->is_active,
            'description' => $validated['description'] ?? $setting->description,
        ]);

        // Rekam riwayat audit: siapa, kapan, nilai lama, nilai baru per PRD
        activity('sla_settings')
            ->causedBy($request->user())
            ->performedOn($setting)
            ->withProperties([
                'priority' => $setting->priority,
                'old_resolution_hours' => $oldHours,
                'old_resolution_minutes' => $oldMinutes,
                'new_resolution_hours' => $newHours,
                'new_resolution_minutes' => $newMinutes,
            ])
            ->log("Target SLA prioritas '{$setting->priority}' diubah dari {$oldHours} jam ({$oldMinutes} menit) menjadi {$newHours} jam ({$newMinutes} menit) oleh {$request->user()->name}");

        return response()->json([
            'success' => true,
            'message' => "Pengaturan SLA prioritas '{$setting->priority}' berhasil diperbarui.",
            'data' => $setting,
        ]);
    }

    /**
     * POST /api/sla-settings/batch
     * Memperbarui target SLA sekaligus (Kritis, Tinggi, Sedang).
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.priority' => 'required|string|in:critical,high,medium,kritis,tinggi,sedang',
            'settings.*.resolution_hours' => 'required|numeric|min:0.5|max:168',
        ]);

        $priorityMap = [
            'kritis' => 'critical',
            'tinggi' => 'high',
            'sedang' => 'medium',
        ];

        $updated = [];
        foreach ($validated['settings'] as $item) {
            $norm = strtolower($item['priority']);
            $priority = $priorityMap[$norm] ?? $norm;
            $hours = (float) $item['resolution_hours'];
            $minutes = (int) round($hours * 60);

            $setting = SlaSetting::firstOrNew(['priority' => $priority]);
            $oldHours = $setting->resolution_hours;
            $oldMinutes = $setting->resolution_minutes;

            $setting->resolution_hours = $hours;
            $setting->resolution_minutes = $minutes;
            $setting->is_active = true;
            $setting->save();

            activity('sla_settings')
                ->causedBy($request->user())
                ->performedOn($setting)
                ->withProperties([
                    'priority' => $priority,
                    'old_hours' => $oldHours,
                    'old_minutes' => $oldMinutes,
                    'new_hours' => $hours,
                    'new_minutes' => $minutes,
                ])
                ->log("Target SLA '{$priority}' diperbarui menjadi {$hours} jam oleh {$request->user()->name}");

            $updated[] = $setting;
        }

        return response()->json([
            'success' => true,
            'message' => 'Seluruh target SLA berhasil diperbarui dan dicatat dalam audit log.',
            'data' => $updated,
        ]);
    }
}

