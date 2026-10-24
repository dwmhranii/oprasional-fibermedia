<?php

namespace Database\Factories;

use App\Enums\TaskStatus;
use App\Models\Provisioning;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'task_number' => 'TSK-'.fake()->unique()->numerify('##########'),
            'provisioning_id' => Provisioning::factory(),
            'teknisi_id' => User::factory(),
            'assigned_by' => User::factory(),
            'scheduled_date' => now()->addDay()->format('Y-m-d'),
            'scheduled_start' => '09:00',
            'scheduled_end' => '12:00',
            'status' => TaskStatus::ASSIGNED,
            'result' => null,
            'completion_notes' => null,
            'customer_rating' => null,
            'photos' => [],
            'assigned_at' => now(),
            'departed_at' => null,
            'arrived_at' => null,
            'started_at' => null,
            'completed_at' => null,
        ];
    }
}
