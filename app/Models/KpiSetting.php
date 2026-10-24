<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiSetting extends Model
{
    use HasFactory;

    protected $table = 'kpi_settings';

    protected $fillable = [
        'key',
        'version',
        'category',
        'value',
        'weights',
        'targets',
        'is_active',
        'read_only_until',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'version' => 'integer',
        'value' => 'array',
        'weights' => 'array',
        'targets' => 'array',
        'is_active' => 'boolean',
        'read_only_until' => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Dapatkan konfigurasi KPI aktif saat ini untuk kategori tertentu (team, technician, sales).
     */
    public static function getActive(string $category): ?self
    {
        return self::where('category', $category)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();
    }

    /**
     * Cek apakah pengaturan ini sedang berada dalam masa uji coba / hanya-lihat (Aturan 11 & Fase 5).
     */
    public function isReadOnly(?Carbon $date = null): bool
    {
        if (! $this->read_only_until) {
            return false;
        }

        $checkDate = $date ? $date->copy()->startOfDay() : now()->startOfDay();

        return $checkDate->lessThanOrEqualTo($this->read_only_until->copy()->startOfDay());
    }

    /**
     * Buat versi baru pengaturan KPI tanpa mengubah rekaman versi lama diam-diam.
     */
    public function createNextVersion(array $weights, ?array $targets = null, ?string $notes = null, ?string $readOnlyUntil = null, ?int $userId = null): self
    {
        // Deaktivasi versi lama
        $this->update(['is_active' => false]);

        $nextVersion = $this->version + 1;
        $newKey = "kpi_{$this->category}_v{$nextVersion}";

        return self::create([
            'key' => $newKey,
            'version' => $nextVersion,
            'category' => $this->category,
            'value' => [
                'description' => "Updated KPI {$this->category} v{$nextVersion}",
                'previous_version' => $this->version,
            ],
            'weights' => $weights,
            'targets' => $targets ?? $this->targets,
            'is_active' => true,
            'read_only_until' => $readOnlyUntil ?? $this->read_only_until?->toDateString(),
            'notes' => $notes ?? "Diperbarui dari versi {$this->version}",
            'created_by' => $userId ?? auth()->id(),
        ]);
    }
}
