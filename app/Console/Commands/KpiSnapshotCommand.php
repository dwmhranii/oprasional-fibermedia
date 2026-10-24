<?php

namespace App\Console\Commands;

use App\Modules\Kpi\Services\KpiService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class KpiSnapshotCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kpi:snapshot {--period= : Periode bulan dalam format YYYY-MM (default: bulan berjalan)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Hitung dan simpan snapshot metrik KPI harian/bulanan untuk seluruh tim, teknisi, dan sales';

    /**
     * Execute the console command.
     */
    public function handle(KpiService $kpiService): int
    {
        $period = $this->option('period') ?: Carbon::now()->format('Y-m');

        $this->info("Menghitung snapshot KPI untuk periode: {$period}...");

        try {
            $results = $kpiService->snapshotAll($period);

            $teamsCount = count($results['teams']);
            $techCount = count($results['technicians']);
            $salesCount = count($results['sales']);

            $this->info('Berhasil menyimpan snapshot KPI:');
            $this->line("- Tim Lapangan   : {$teamsCount} tim");
            $this->line("- Teknisi        : {$techCount} orang");
            $this->line("- Sales          : {$salesCount} orang");

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Gagal menjalankan snapshot KPI: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
