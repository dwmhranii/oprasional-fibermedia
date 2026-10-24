<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Contracts\Console\Kernel;

try {
    $task = Task::first();
    echo "Task ID: {$task->id}, Status: {$task->status->value}\n";

    // Test canTransitionTo
    echo 'Can transition to ON_THE_WAY? '.($task->canTransitionTo(TaskStatus::ON_THE_WAY) ? 'Yes' : 'No')."\n";
    echo 'Can transition to IN_PROGRESS? '.($task->canTransitionTo(TaskStatus::IN_PROGRESS) ? 'Yes' : 'No')."\n";

    // Change to on_the_way
    $task->status = TaskStatus::ON_THE_WAY;
    $task->save();

    echo "Changed to ON_THE_WAY\n";
    echo 'Can transition to IN_PROGRESS? '.($task->canTransitionTo(TaskStatus::IN_PROGRESS) ? 'Yes' : 'No')."\n";

    // Test the logic in updateStatus
    $targetStatus = TaskStatus::IN_PROGRESS;
    $statusPriority = [
        TaskStatus::ASSIGNED->value => 1,
        TaskStatus::ON_THE_WAY->value => 2,
        TaskStatus::IN_PROGRESS->value => 3,
        TaskStatus::COMPLETED->value => 4,
        TaskStatus::FAILED->value => 4,
    ];

    $currentPriority = $statusPriority[$task->status->value] ?? 0;
    $targetPriority = $statusPriority[$targetStatus->value] ?? 0;

    echo "Current Priority: $currentPriority, Target Priority: $targetPriority\n";

    if ($currentPriority >= $targetPriority && in_array($targetStatus->value, ['on_the_way', 'in_progress'])) {
        echo "Idempotent success\n";
    } else {
        if (! $task->canTransitionTo($targetStatus)) {
            echo "Invalid transition\n";
        } else {
            echo "Transition allowed\n";
        }
    }

} catch (Throwable $e) {
    echo 'Error: '.$e->getMessage()."\n";
}
