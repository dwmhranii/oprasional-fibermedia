<?php

namespace App\Console\Commands;

use App\Modules\Network\Services\KmzImporterService;
use Illuminate\Console\Command;

class NetworkImportKmzCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'network:import-kmz {file? : Path ke berkas KMZ atau KML} {--dry-run : Uji validasi dan simulasi impor tanpa mengubah database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Impor data simpul dan jalur jaringan dari berkas KMZ/KML ke database';

    /**
     * Execute the console command.
     */
    public function handle(KmzImporterService $importer): int
    {
        $filePath = $this->argument('file');

        if (! $filePath) {
            $defaultKmz = storage_path('app/imports/Mapping_All_Point_-_FTTH_Area_Bululawang.kmz');
            $defaultExtracted = storage_path('app/imports/Mapping_All_Point_-_FTTH_Area_Bululawang_20261017_150639.kmz');

            if (file_exists($defaultKmz)) {
                $filePath = $defaultKmz;
            } elseif (file_exists($defaultExtracted)) {
                $filePath = $defaultExtracted;
            } else {
                $this->error('Path berkas KMZ wajib ditentukan atau letakkan di storage/app/imports/Mapping_All_Point_-_FTTH_Area_Bululawang.kmz');

                return Command::FAILURE;
            }
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->info("Memulai proses impor KMZ dari: {$filePath}");
        if ($dryRun) {
            $this->warn('MODE SIMULASI (--dry-run): Database TIDAK akan diubah.');
        }

        $startTime = microtime(true);

        try {
            $result = $importer->import($filePath, $dryRun);
            $duration = round(microtime(true) - $startTime, 2);

            $this->newLine();
            $this->info("=== HASIL IMPOR KMZ JARINGAN ({$duration} detik) ===");

            $summary = $result['summary'];

            $this->table(
                ['Kategori Simpul / Jalur', 'Dibuat', 'Diperbarui', 'Dilewati', 'Catatan Status Khusus'],
                [
                    ['Server / OLT', $summary['olts']['created'], $summary['olts']['updated'], $summary['olts']['skipped'], '-'],
                    ['ODC', $summary['odcs']['created'], $summary['odcs']['updated'], $summary['odcs']['skipped'], "Gangguan: {$summary['odcs']['disrupted']}"],
                    ['ODP', $summary['odps']['created'], $summary['odps']['updated'], $summary['odps']['skipped'], '-'],
                    ['Kabel Jaringan', $summary['cables']['created'], $summary['cables']['updated'], $summary['cables']['skipped'], "Putus: {$summary['cables']['cut']}"],
                    ['Pelanggan (Kecocokan)', '-', $summary['clients']['matched'], $summary['clients']['skipped'], "Koordinat Salah: {$summary['clients']['invalid_coords']}"],
                ]
            );

            $this->newLine();
            $this->line("Total Entitas Dibuat   : <info>{$summary['total_created']}</info>");
            $this->line("Total Entitas Diperbarui: <info>{$summary['total_updated']}</info>");
            $this->line("Total Entitas Dilewati  : <comment>{$summary['total_skipped']}</comment>");
            $this->line("Total Ditolak (Di Luar) : <error>{$summary['total_rejected']}</error>");

            if (! empty($result['invalid_coordinates'])) {
                $this->newLine();
                $this->warn("Ditemukan {$result['invalid_coordinates_count']} titik pelanggan di luar batas area wajar (lon 112-114, lat -9 s.d. -7):");
                $sample = array_slice($result['invalid_coordinates'], 0, 10);
                foreach ($sample as $inv) {
                    $this->line(" - {$inv['username']}: Lon {$inv['longitude']}, Lat {$inv['latitude']}");
                }
                if ($result['invalid_coordinates_count'] > 10) {
                    $this->line(' ... dan '.($result['invalid_coordinates_count'] - 10).' titik lainnya.');
                }
            }

            $this->newLine();
            $this->info("Laporan CSV lengkap telah disimpan di: {$result['report_csv_path']}");

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Gagal menjalankan impor KMZ: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
