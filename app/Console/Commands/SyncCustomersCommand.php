<?php

namespace App\Console\Commands;

use App\Models\BrasDevice;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Submission;
use App\Utils\IdentifierGenerator;
use Illuminate\Console\Command;

class SyncCustomersCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'customers:sync';

    /**
     * The console command description.
     */
    protected $description = 'Sync completed and active submissions into the customers table with 35 operational columns';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting customer synchronization with new 35-column schema...');

        $submissions = Submission::with(['provisioning.tasks', 'user'])->get();
        $syncedCount = 0;

        $defaultBras = BrasDevice::first();

        foreach ($submissions as $submission) {
            $statusVal = is_object($submission->status) ? $submission->status->value : $submission->status;

            // Only sync completed / provisioned / approved / active submissions
            if (in_array($statusVal, ['completed', 'provisioned', 'approved'])) {
                $customerCode = IdentifierGenerator::generateCustomerCode($submission->id, $submission->created_at);
                $prov = $submission->provisioning;
                $task = $prov?->tasks?->first();

                // Find or match package
                $package = Package::where('name', $submission->package_name)->first();

                // Find or match ODP
                $odpCode = $prov?->odp ?? 'ODP-BLW-01';
                $odp = Odp::firstOrCreate([
                    'code' => $odpCode,
                ], [
                    'name' => $odpCode,
                    'port_capacity' => 8,
                    'wilayah' => $submission->village ?? 'Bululawang',
                    'is_active' => true,
                ]);

                $customer = Customer::updateOrCreate([
                    'id' => $submission->customer_id,
                ], [
                    'customer_code' => $customerCode,
                    'name' => $submission->customer_name,
                    'nik' => $submission->nik,
                    'email' => $submission->email,
                    'address' => $submission->address,
                    'latitude' => $submission->latitude,
                    'longitude' => $submission->longitude,
                    'phone' => $submission->phone,
                    'service_type' => 'pppoe',
                    'bras_id' => $defaultBras?->id,
                    'username' => $prov?->bfass_username ?? ('cust_'.strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $customerCode))),
                    'password' => $prov?->bfass_password ?? 'secret123',
                    'package_id' => $package?->id,
                    'package' => $submission->package_name,
                    'monthly_price' => $package?->price ?? $submission->package_price ?? 0,
                    'local_address' => '10.10.0.1',
                    'remote_address' => $prov?->ip_address,
                    'rate_limit' => $submission->package_speed ? "{$submission->package_speed}M/{$submission->package_speed}M" : '20M/20M',
                    'subscribed_at' => $task?->completed_at ? $task->completed_at->toDateString() : now()->toDateString(),
                    'expires_at' => now()->addMonth()->toDateString(),
                    'onu_index' => $prov?->onu_index ?? '1/1/1:1',
                    'odp_id' => $odp->id,
                    'odp_code' => $odpCode,
                    'odp_port' => 1,
                    'debt' => 0,
                    'wilayah' => $submission->village ?? 'Bululawang',
                    'installed_by_team_id' => $task?->assigned_team_id,
                    'installed_task_id' => $task?->id,
                    'sales_id' => $submission->sales_id ?? $submission->user_id,
                    'status' => 'active',
                ]);

                $submission->update([
                    'customer_id' => $customer->id,
                    'customer_code' => $customer->customer_code,
                ]);

                $syncedCount++;
            }
        }

        $this->info("Successfully synced {$syncedCount} customers.");

        return Command::SUCCESS;
    }
}
