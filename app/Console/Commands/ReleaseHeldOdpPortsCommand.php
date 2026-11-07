<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\OdpPortHistory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReleaseHeldOdpPortsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'odp:release-held-ports';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Melepaskan port ODP yang telah melewati masa tahan 30 hari kalender setelah pelanggan terminated (PRD Final v1.2)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Memeriksa port ODP berstatus held yang melewati masa tahan 30 hari...');

        $now = now();
        $expiredRecords = OdpPortHistory::where('action', 'held')
            ->whereNull('released_at')
            ->where('held_until', '<=', $now)
            ->with(['customer', 'odp'])
            ->get();

        if ($expiredRecords->isEmpty()) {
            $this->info('Tidak ada port ODP yang kedaluwarsa masa tahannya.');

            return self::SUCCESS;
        }

        $releasedCount = 0;

        foreach ($expiredRecords as $record) {
            DB::transaction(function () use ($record, $now, &$releasedCount) {
                $customer = $record->customer;
                $odp = $record->odp;
                $port = $record->port_number;

                // 1. Catat pelepasan port di history
                $record->update([
                    'action' => 'released',
                    'released_at' => $now,
                    'notes' => 'Port ODP otomatis dilepas setelah 30 hari kalender masa tahan pasca-terminated.',
                ]);

                // 2. Lepaskan port dari customer jika masih terikat
                if ($customer) {
                    $customer->update([
                        'odp_port' => null,
                        'status' => 'terminated',
                    ]);

                    activity('odp')
                        ->performedOn($customer)
                        ->withProperties([
                            'odp_id' => $record->odp_id,
                            'port_number' => $port,
                            'held_until' => $record->held_until?->toIso8601String(),
                            'released_at' => $now->toIso8601String(),
                        ])
                        ->log("Port {$port} pada ODP {$odp?->code} berhasil dilepas otomatis setelah 30 hari masa tahan.");
                }

                $releasedCount++;
            });
        }

        $this->info("Berhasil melepaskan {$releasedCount} port ODP.");

        return self::SUCCESS;
    }
}

