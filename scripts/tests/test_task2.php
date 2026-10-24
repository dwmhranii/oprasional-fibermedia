<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Task;
use Illuminate\Contracts\Console\Kernel;

$tasks = Task::whereHas('assignments', function ($q) {
    $q->where('status', 'submitted');
})->get();

foreach ($tasks as $task) {
    echo "Task ID: {$task->id}\n";
    echo "Status: {$task->status->value}\n";
    echo "Customer Signature Path: {$task->customer_signature_path}\n";
    echo "Photos:\n";
    print_r($task->photos);
    echo 'Raw Photos: '.($task->getAttributes()['photos'] ?? 'null')."\n";
    echo "--------------------------\n";
}
