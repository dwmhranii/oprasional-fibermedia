<?php

namespace App\Console\Commands;

use App\Services\PermissionRegistry;
use Illuminate\Console\Command;

class SyncPermissionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronkan seluruh hak akses (permissions) dari registri modul ke basis data tanpa menimpa konfigurasi manual Superadmin';

    /**
     * Execute the console command.
     */
    public function handle(PermissionRegistry $registry): int
    {
        $this->info('Memulai sinkronisasi registri hak akses (permissions)...');

        $result = $registry->sync();

        $this->table(
            ['Metrik', 'Jumlah'],
            [
                ['Total Definisi di Registri', $result['total_registered']],
                ['Izin Baru Ditambahkan', count($result['created'])],
                ['Izin Usang di Basis Data', count($result['obsolete'])],
            ]
        );

        if (! empty($result['created'])) {
            $this->info('Izin baru yang berhasil didaftarkan:');
            foreach ($result['created'] as $perm) {
                $this->line("  + {$perm}");
            }
        } else {
            $this->comment('Tidak ada izin baru. Seluruh izin registri sudah sinkron dengan basis data.');
        }

        if (! empty($result['obsolete'])) {
            $this->warn('Perhatian: Ditemukan izin usang di basis data yang tidak terdaftar di registri modul:');
            foreach ($result['obsolete'] as $perm) {
                $this->line("  - {$perm}");
            }
        }

        $this->info('Sinkronisasi permissions berhasil diselesaikan.');

        return Command::SUCCESS;
    }
}
