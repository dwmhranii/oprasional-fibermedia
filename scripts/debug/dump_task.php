<?php

use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
$task = Task::with('assignments.evidence')->whereHas('assignments.evidence')->first();
echo json_encode((new TaskResource($task))->toArray(request()), JSON_PRETTY_PRINT);
