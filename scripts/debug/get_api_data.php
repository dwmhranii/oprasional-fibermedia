<?php

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$task = Task::first();

if (! $task) {
    echo "No task found\n";
    exit;
}

$user = User::whereHas('roles', function ($q) {
    $q->where('name', 'Superadmin');
})->first();

if ($user) {
    auth()->login($user);
}

$request = request();
$request->setUserResolver(function () use ($user) {
    return $user;
});

$resource = new TaskResource($task);
$data = $resource->toArray($request);

echo json_encode($data, JSON_PRETTY_PRINT);
