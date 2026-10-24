<?php

namespace App\Console\Commands;

use App\Enums\SubmissionStatus;
use App\Models\Submission;
use App\Services\SlaResolutionService;
use Illuminate\Console\Command;

class CheckPendingValidationSla extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:check-pending-validation';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for SLA breaches on submissions pending validation for > 24 hours';

    /**
     * Execute the console command.
     */
    public function handle(SlaResolutionService $slaService)
    {
        $cutoff = now()->subHours(24);

        $submissions = Submission::whereIn('status', [
            SubmissionStatus::PENDING->value,
            SubmissionStatus::PENDING_VALIDATION->value,
        ])
            ->where('created_at', '<', $cutoff)
            ->get();

        $count = 0;
        foreach ($submissions as $submission) {
            $breach = $slaService->reportBreach(
                'pending_validation',
                $submission,
                'Submission has been pending validation for more than 24 hours'
            );

            if ($breach) {
                $count++;
            }
        }

        $this->info("Detected {$count} new pending validation SLA breaches.");
    }
}
