<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\TaskCompletionEvidence;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;

echo "--- 1. DATABASE VALUES ---\n";
$evidence = TaskCompletionEvidence::whereNotNull('photo_before')
    ->whereNotNull('photo_after')
    ->whereNotNull('signature_path')
    ->latest()
    ->first();

if (! $evidence) {
    // try to get any evidence that has at least one
    $evidence = TaskCompletionEvidence::whereNotNull('photo_before')->orWhereNotNull('signature_path')->latest()->first();
}

if ($evidence) {
    echo 'ID: '.$evidence->id."\n";
    echo 'photo_before: '.$evidence->photo_before."\n";
    echo 'photo_after: '.$evidence->photo_after."\n";
    echo 'signature_path: '.$evidence->signature_path."\n";

    echo "\n--- 2 & 3. PHYSICAL FILE EXISTENCE ---\n";
    $disk = Storage::disk('public');

    $paths = [
        'photo_before' => $evidence->photo_before,
        'photo_after' => $evidence->photo_after,
        'signature_path' => $evidence->signature_path,
    ];

    foreach ($paths as $key => $path) {
        if (! $path) {
            echo "{$key} is null.\n";

            continue;
        }
        $exists = $disk->exists($path);
        echo "{$key} ({$path}) Exists in 'public' disk: ".($exists ? 'Yes' : 'No')."\n";
        if ($exists) {
            echo 'Absolute path: '.$disk->path($path)."\n";
        } else {
            // Check if it's on local disk instead of public
            if (Storage::disk('local')->exists($path)) {
                echo "Wait, it exists in 'local' disk instead! Absolute path: ".Storage::disk('local')->path($path)."\n";
            }
        }
    }
} else {
    echo "No evidence records found.\n";
}
