<?php

use App\Models\TaskAssignment;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$assignment = TaskAssignment::with('evidence')->whereHas('evidence')->first();

if (! $assignment) {
    echo "No assignment with evidence found\n";
    exit;
}

echo json_encode($assignment->evidence->toArray(), JSON_PRETTY_PRINT);
