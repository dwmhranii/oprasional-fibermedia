<?php

namespace App\Console\Commands;

use App\Models\BrasDevice;
use App\Services\Mikrotik\BrasSyncService;
use Illuminate\Console\Command;

class SyncBrasSessionsCommand extends Command
{
    protected $signature = 'bras:sync-sessions {--bras_id= : ID perangkat BRAS spesifik}';

    protected $description = 'Sinkronisasi daftar sesi aktif PPPoE dari router BRAS MikroTik dan perbarui status online pelanggan';

    public function handle(BrasSyncService $syncService): int
    {
        $brasId = $this->option('bras_id');

        if ($brasId) {
            $device = BrasDevice::find($brasId);
            if (! $device) {
                $this->error("Perangkat BRAS dengan ID {$brasId} tidak ditemukan.");

                return self::FAILURE;
            }

            $this->info("Menyinkronkan sesi dari BRAS: {$device->name} ({$device->ip_address})...");
            $result = $syncService->syncDevice($device);

            if ($result['success']) {
                $this->info("Selesai. Sesi aktif: {$result['active_sessions']}, Pelanggan diperbarui: {$result['updated_customers']}.");

                return self::SUCCESS;
            } else {
                $this->error("Gagal: {$result['message']}");

                return self::FAILURE;
            }
        }

        $this->info('Menyinkronkan sesi dari seluruh BRAS aktif...');
        $results = $syncService->syncAll();

        $totalActive = 0;
        foreach ($results as $item) {
            $status = $item['result']['success'] ? '<info>SUKSES</info>' : '<error>GAGAL</error>';
            $active = $item['result']['active_sessions'] ?? 0;
            $totalActive += $active;
            $this->line("- [{$item['bras_id']}] {$item['name']}: {$status} ({$active} sesi) - {$item['result']['message']}");
        }

        $this->info("Sinkronisasi selesai. Total sesi aktif: {$totalActive}.");

        return self::SUCCESS;
    }
}
