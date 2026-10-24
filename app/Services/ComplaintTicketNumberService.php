<?php

namespace App\Services;

use App\Models\ComplaintTicketCounter;
use Illuminate\Support\Facades\DB;

class ComplaintTicketNumberService
{
    /**
     * Generate format nomor tiket: COMP-{YYYY}-{NNNNN}
     * Contoh: COMP-2026-00001
     */
    public function generate(): string
    {
        return DB::transaction(function () {
            $year = (int) now()->format('Y');

            $counter = ComplaintTicketCounter::lockForUpdate()
                ->firstOrCreate(
                    ['year' => $year],
                    ['last_number' => 0]
                );

            $counter->increment('last_number');
            $counter->refresh();

            return sprintf('COMP-%d-%05d', $year, $counter->last_number);
        });
    }
}
