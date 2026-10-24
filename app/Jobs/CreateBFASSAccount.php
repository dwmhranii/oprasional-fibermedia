<?php

namespace App\Jobs;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Models\Provisioning;
use App\Models\User;
use App\Notifications\ProvisioningFailedNotification;
use App\Services\BfassHealthCheckService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class CreateBFASSAccount implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Provisioning $provisioning;

    public $tries = 3;

    public function __construct(Provisioning $provisioning)
    {
        $this->provisioning = $provisioning;
    }

    public function handle(BfassHealthCheckService $healthCheck): void
    {
        // Refresh to ensure we have the latest status
        $this->provisioning->refresh();

        if ($this->provisioning->bfass_status === BfassStatus::SUCCESS) {
            Log::info("Provisioning ID {$this->provisioning->id} already has a successful BFASS account. Skipping.");

            return;
        }

        // Perform health check
        $health = $healthCheck->check();
        if (! $health['reachable'] || ! $health['auth_valid']) {
            $this->provisioning->update([
                'status' => ProvisioningStatus::FAILED,
                'bfass_status' => BfassStatus::FAILED,
                'failure_reason' => 'health_check_failure',
                'last_error' => $health['error'] ?? 'Health check failed',
            ]);

            Log::error("BFASS Health Check failed for Provisioning ID {$this->provisioning->id}");

            $admins = User::role(['Admin', 'Superadmin'])->get();
            Notification::send($admins, new ProvisioningFailedNotification($this->provisioning, 'BFASS Health Check Failed'));

            return; // Prevent automatic retry
        }

        // Set status to processing
        $this->provisioning->update([
            'status' => ProvisioningStatus::PROCESSING,
            'bfass_status' => BfassStatus::PROCESSING,
        ]);

        try {
            // Mock BFASS API Call
            Log::info("Mocking BFASS API call for Provisioning ID {$this->provisioning->id}");

            // Simulate API delay
            sleep(2);

            // Simulate success rate
            $forceSuccess = filter_var(config('services.bfass.mock_force_success', false), FILTER_VALIDATE_BOOLEAN);
            $forceFail = filter_var(config('services.bfass.mock_force_fail', false), FILTER_VALIDATE_BOOLEAN);

            if ($forceFail || (! $forceSuccess && rand(1, 100) > 90)) {
                throw new \Exception('Simulated BFASS API connection timeout.');
            }

            $accountId = 'BFASS-'.rand(100000, 999999);

            // Success
            $this->provisioning->update([
                'status' => ProvisioningStatus::SUCCESS,
                'bfass_status' => BfassStatus::SUCCESS,
                'bfass_account_id' => $accountId,
                'bfass_response' => [
                    'status' => 'success',
                    'account_id' => $accountId,
                    'username' => $this->provisioning->bfass_username,
                    'message' => 'Account created successfully in BFASS',
                ],
                'error_log' => null,
            ]);

            Log::info("BFASS API call successful for Provisioning ID {$this->provisioning->id}");

        } catch (\Exception $e) {
            $maxRetries = config('services.bfass.max_retries', 3);
            $newRetryCount = $this->provisioning->retry_count + 1;

            if ($newRetryCount >= $maxRetries) {
                // Max retries reached, fail completely
                $this->provisioning->update([
                    'status' => ProvisioningStatus::FAILED,
                    'bfass_status' => BfassStatus::FAILED,
                    'retry_count' => $newRetryCount,
                    'failure_reason' => 'max_retries_reached',
                    'last_error' => $e->getMessage(),
                    'error_log' => [
                        'message' => $e->getMessage(),
                    ],
                ]);

                Log::error("BFASS API call failed (Max retries reached) for Provisioning ID {$this->provisioning->id}: ".$e->getMessage());

                $admins = User::role(['Admin', 'Superadmin'])->get();
                Notification::send($admins, new ProvisioningFailedNotification($this->provisioning, 'Max Retries Reached'));

                return; // Prevent further automatic retry
            }

            // Failure, will retry
            $this->provisioning->update([
                'status' => ProvisioningStatus::FAILED,
                'bfass_status' => BfassStatus::FAILED,
                'retry_count' => $newRetryCount,
                'error_log' => [
                    'message' => $e->getMessage(),
                ],
                'last_error' => $e->getMessage(),
            ]);

            Log::warning("BFASS API call failed (Retry {$newRetryCount}/{$maxRetries}) for Provisioning ID {$this->provisioning->id}: ".$e->getMessage());

            // Re-throw to allow queue retry
            throw $e;
        }
    }
}
