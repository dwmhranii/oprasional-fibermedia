<?php

namespace App\Console\Commands;

use App\Enums\ProvisioningStatus;
use App\Models\Provisioning;
use App\Services\SlaResolutionService;
use Illuminate\Console\Command;

class CheckProvisioningSla extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:check-provisioning';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for SLA breaches on failed provisionings that reached max retries';

    /**
     * Execute the console command.
     */
    public function handle(SlaResolutionService $slaService)
    {
        $maxRetries = config('bfass.max_retries', 3);

        $provisionings = Provisioning::where('status', ProvisioningStatus::FAILED)
            ->where('retry_count', '>=', $maxRetries)
            ->get();

        $count = 0;
        foreach ($provisionings as $provisioning) {
            $breach = $slaService->reportBreach(
                'provisioning_failure',
                $provisioning,
                "Provisioning failed and reached max retries ({$maxRetries})"
            );

            if ($breach) {
                $count++;
            }
        }

        $this->info("Detected {$count} new provisioning failure SLA breaches.");
    }
}
