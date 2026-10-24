<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

// Grab any task that has provisioning
$task = Task::whereNotNull('provisioning_id')->first();
if (! $task) {
    echo "No task with provisioning found.\n";
    exit;
}

// Find a user assigned to this task
$teknisi = User::whereHas('roles', function ($q) {
    $q->where('name', 'Teknisi');
})->first();

echo "--- 1. FULL JSON DUMP ---\n";
$task->load(['provisioning.submission', 'teknisi', 'assignments.user', 'assignments.evidence']);
$resource = new TaskResource($task);
$request = Request::create("/api/teknisi/tasks/{$task->id}", 'GET');
$request->setUserResolver(function () use ($teknisi) {
    return $teknisi;
});
$data = json_decode(json_encode($resource->toArray($request)), true);

echo "--- PROVISIONING VERIFICATION ---\n";
echo json_encode($data['provisioning'], JSON_PRETTY_PRINT)."\n\n";
