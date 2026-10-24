<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Task;
use Illuminate\Contracts\Console\Kernel;

$task = Task::find(2);
$assignments = $task->assignments()->with('evidence')->get();

echo "Task 2\n";
foreach ($assignments as $a) {
    echo "Assignment {$a->id}: Status = {$a->status}\n";
    if ($a->evidence) {
        echo "  Evidence:\n";
        echo "    Selfie: {$a->evidence->attendance_photo_path}\n";
        echo "    Before: {$a->evidence->photo_before}\n";
        echo "    After: {$a->evidence->photo_after}\n";
        echo "    Signature: {$a->evidence->signature_path}\n";
    } else {
        echo "  No evidence\n";
    }
}
