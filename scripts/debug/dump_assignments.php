<?php

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$user = User::whereHas('roles', function ($q) {
    $q->whereIn('name', ['Admin', 'Superadmin']);
})->first();
if ($user) {
    auth()->login($user);
}

$task = Task::with(['assignments' => function ($q) {
    $q->with('evidence');
}])->whereHas('assignments.evidence')->latest('id')->first();

if (! $task) {
    echo "No task with evidence found\n";
    exit;
}

$resource = new TaskResource($task);
$data = $resource->toArray(request());

echo json_encode($data['all_assignments'] ?? [], JSON_PRETTY_PRINT);
