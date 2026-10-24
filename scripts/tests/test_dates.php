<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

try {
    $task = Task::first();
    $task->departed_at = now();

    $resource = new TaskResource($task);
    $array = $resource->toArray(new Request);

    echo 'Departed at class: '.get_class($array['departed_at'])."\n";
    echo 'Departed at string: '.json_encode($array['departed_at'])."\n";

    echo "Success!\n";
} catch (Throwable $e) {
    echo 'Error: '.$e->getMessage()."\n";
}
