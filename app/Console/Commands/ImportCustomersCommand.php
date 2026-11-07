<?php

namespace App\Console\Commands;

use App\Imports\CustomersImport;
use Illuminate\Console\Command;
use Maatwebsite\Excel\Facades\Excel;

class ImportCustomersCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'customers:import 
                            {file : Path ke berkas CSV atau Excel (.csv, .xlsx, .xls)} 
                            {--dry-run : Mode simulasi validasi tanpa menyimpan data ke database} 
                            {--batch=250 : Jumlah baris per batch transaksi}
                            {--lenient-nik : Izinkan NIK data lama yang tidak 16 digit atau multi-layanan tanpa membatalkan baris pelanggan}';

    /**
     * The console command description.
     */
    protected $description = 'Impor data migrasi pelanggan lama (35 kolom) dengan normalisasi, enkripsi NIK, dan deteksi bentrok port ODP';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $filePath = (string) $this->argument('file');

        if (! file_exists($filePath)) {
            $this->error("Berkas tidak ditemukan: {$filePath}");

            return 1;
        }

        $isDryRun = (bool) $this->option('dry-run');
        $isLenientNik = (bool) $this->option('lenient-nik');
        $this->info('===============================================================');
        $this->info('  FIBERMEDIA OPS - IMPOR DATA PELANGGAN (35 KOLOM)             ');
        $this->info('===============================================================');
        $this->line("Berkas: <comment>{$filePath}</comment>");
        $this->line('Mode  : '.($isDryRun ? '<comment>DRY-RUN (Simulasi Validasi)</comment>' : '<info>EKSEKUSI PRODUKSI</info>'));
        if ($isLenientNik) {
            $this->line('Format NIK: <comment>Longgar (Data Warisan / Legacy)</comment>');
        }

        // Deteksi delimiter jika berkas CSV
        $delimiter = ',';
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($ext === 'csv') {
            $delimiter = $this->detectDelimiter($filePath);
            $this->line("Delimiter terdeteksi: <comment>'{$delimiter}'</comment>");
        }

        $import = new CustomersImport($isDryRun, $delimiter, ! $isLenientNik);

        try {
            $this->output->write('Memproses dan memvalidasi baris data... ');
            Excel::import($import, $filePath);
            $this->info('Selesai.');

            $imported = $import->getImportedCount();
            $updated = $import->getUpdatedCount();
            $skipped = $import->getSkippedCount();
            $duplicates = $import->getDuplicateCount();
            $portConflicts = $import->getPortConflictCount();
            $errors = $import->getErrors();

            $this->newLine();
            $this->table(
                ['Metrik Impor', 'Jumlah Baris'],
                [
                    ['Pelanggan Baru', $imported],
                    ['Pelanggan Diperbarui', $updated],
                    ['Baris Dilewati / Galat', $skipped],
                    ['Duplikasi NIK Terdeteksi', $duplicates],
                    ['Bentrok Port ODP Terdeteksi', $portConflicts],
                    ['Total Baris Diproses', $imported + $updated + $skipped],
                ]
            );

            if (! empty($errors)) {
                $this->newLine();
                $this->warn('Daftar Kesalahan & Peringatan Baris (Menampilkan maksimal 20 galat pertama):');
                foreach (array_slice($errors, 0, 20) as $err) {
                    $this->line("  <fg=red>•</> {$err}");
                }
                if (count($errors) > 20) {
                    $remaining = count($errors) - 20;
                    $this->line("  <fg=yellow>... dan {$remaining} kesalahan lainnya.</>");
                }
            }

            if ($isDryRun) {
                $this->newLine();
                $this->warn('[DRY-RUN] Tidak ada data yang disimpan atau diubah pada basis data.');
            } else {
                $this->newLine();
                $this->info("✓ Sukses! {$imported} pelanggan baru ditambahkan, {$updated} pelanggan diperbarui.");
            }

            return 0;
        } catch (\Throwable $e) {
            $this->newLine();
            $this->error("Gagal melakukan impor: {$e->getMessage()}");

            return 1;
        }
    }

    /**
     * Deteksi pemisah (koma, titik koma, atau tab) secara otomatis dari baris pertama.
     */
    private function detectDelimiter(string $path): string
    {
        $handle = @fopen($path, 'r');
        if (! $handle) {
            return ',';
        }

        $firstLine = fgets($handle);
        fclose($handle);

        if (! $firstLine) {
            return ',';
        }

        $delimiters = [
            ',' => substr_count($firstLine, ','),
            ';' => substr_count($firstLine, ';'),
            "\t" => substr_count($firstLine, "\t"),
        ];

        arsort($delimiters);

        return array_key_first($delimiters) ?: ',';
    }
}

