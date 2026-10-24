<?php

namespace Database\Factories;

use App\Enums\SubmissionStatus;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Submission>
 */
class SubmissionFactory extends Factory
{
    protected $model = Submission::class;

    public function definition(): array
    {
        return [
            'submission_number' => 'SUB-'.fake()->unique()->numerify('##########'),
            'user_id' => User::factory(),
            'customer_name' => fake()->name(),
            'nik' => fake()->numerify('################'),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'district' => fake()->city(),
            'city' => fake()->city(),
            'province' => fake()->state(),
            'lat' => fake()->latitude(-8.5, -6.0),
            'lng' => fake()->longitude(105.0, 115.0),
            'package_name' => 'Fiber 100Mbps',
            'package_speed' => '100Mbps',
            'package_price' => 450000,
            'installation_fee' => 150000,
            'total_price' => 600000,
            'documents' => [],
            'status' => SubmissionStatus::PENDING,
            'notes' => [],
            'source' => 'web',
            'ip_address' => '127.0.0.1',
        ];
    }
}
