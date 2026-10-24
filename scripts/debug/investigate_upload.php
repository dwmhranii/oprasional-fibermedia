<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Task;
use App\Models\TaskCompletionEvidence;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Grab a random task to test
$task = Task::first();
if (! $task) {
    echo "No task found.\n";
    exit;
}

$photoType = 'before';
$path = "tasks/{$task->id}/fake_before_".time().'.jpg';

DB::transaction(function () use ($task, $photoType, $path) {
    $lockedTask = Task::lockForUpdate()->find($task->id);
    $photos = $lockedTask->photos ?? [];
    $photos[$photoType] = $path;
    $lockedTask->update(['photos' => $photos]);
});

// Now query BOTH
$updatedTask = Task::find($task->id);
$evidence = TaskCompletionEvidence::whereHas('assignment', function ($q) use ($task) {
    $q->where('task_id', $task->id);
})->first();

echo "--- Modified Table Information ---\n";
echo "Table: tasks\n";
echo 'Primary Key ID: '.$updatedTask->id."\n";
echo "Updated Column: photos\n";
echo 'Value Written: '.json_encode($updatedTask->photos)."\n\n";

echo "--- Query Results After Upload ---\n";
echo "[tasks]\n";
echo 'photos: '.json_encode($updatedTask->photos)."\n\n";

echo "[task_completion_evidences]\n";
if ($evidence) {
    echo 'photo_before: '.($evidence->photo_before ?? 'NULL')."\n";
    echo 'photo_after: '.($evidence->photo_after ?? 'NULL')."\n";
} else {
    echo "No task_completion_evidences record found for this task.\n";
}
