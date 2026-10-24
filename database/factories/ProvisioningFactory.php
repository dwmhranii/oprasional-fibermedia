<?php

namespace Database\Factories;

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Provisioning>
 */
class ProvisioningFactory extends Factory
{
    protected $model = Provisioning::class;

    public function definition(): array
    {
        return [
            'provisioning_number' => 'PRV-'.fake()->unique()->numerify('##########'),
            'submission_id' => Submission::factory(),
            'admin_id' => User::factory(),
            'bfass_username' => fake()->unique()->userName(),
            'bfass_account_id' => 'BFASS-'.fake()->numerify('######'),
            'bfass_status' => BfassStatus::PENDING,
            'service_type' => 'FTTH',
            'nas_server' => 'NAS-TEST',
            'nas_ip' => '192.168.1.1',
            'ip_address' => '10.0.0.2',
            'ip_pool' => 'POOL-TEST',
            'bandwidth_profile' => '100M',
            'bandwidth_up' => 100,
            'bandwidth_down' => 100,
            'status' => ProvisioningStatus::PENDING,
            'retry_count' => 0,
            'bfass_response' => null,
            'error_log' => null,
            'notes' => fake()->sentence(),
            'completed_at' => null,
        ];
    }
}
