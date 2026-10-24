<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Submission;
use App\Models\TaskCompletionEvidence;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

echo "--- 4. CONFIGURATION ---\n";
echo 'APP_URL (env): '.env('APP_URL')."\n";
echo "config('app.url'): ".config('app.url')."\n";
echo "config('filesystems.default'): ".config('filesystems.default')."\n";
echo "config('filesystems.disks.public.url'): ".config('filesystems.disks.public.url')."\n";
echo "\n";

echo "--- 5. STORAGE LINK ---\n";
$publicPath = public_path('storage');
if (is_link($publicPath)) {
    echo "Symbolic link exists: YES\n";
    echo 'Link target: '.readlink($publicPath)."\n";
} elseif (file_exists($publicPath)) {
    echo "Symbolic link exists: IT IS A REGULAR DIRECTORY (Not a symlink)\n";
} else {
    echo "Symbolic link exists: NO\n";
}
echo "\n";

echo "--- 1 & 2. DATABASE & SERIALIZATION ---\n";
// Let's create dummy files in storage/app/public if needed to test reachability, or just look at DB for actual records.
use App\Models\SubmissionDocument;
use Illuminate\Contracts\Console\Kernel;

// Sales Module (Submission)
$doc = SubmissionDocument::latest()->first();
if (! $doc) {
    // mock it
    $doc = new stdClass;
    $doc->path = 'submissions/ktp/fake_ktp.jpg';
    Storage::disk('public')->put($doc->path, 'fake');
}
echo "[Sales Module]\n";
echo 'Document stored path: '.$doc->path."\n";
echo 'Document generated URL: '.Storage::url($doc->path)."\n";
echo "\n";

// Technician Module (TaskCompletionEvidence)
$evidence = TaskCompletionEvidence::whereNotNull('photo_before')->orWhereNotNull('signature_path')->latest()->first();
if (! $evidence) {
    $evidence = new stdClass;
    $evidence->photo_before = 'task_evidence/before/fake_before.jpg';
    $evidence->photo_after = 'task_evidence/after/fake_after.jpg';
    $evidence->signature_path = 'task_evidence/signatures/fake_sig.png';

    Storage::disk('public')->put($evidence->photo_before, 'fake');
    Storage::disk('public')->put($evidence->photo_after, 'fake');
    Storage::disk('public')->put($evidence->signature_path, 'fake');
}
echo "[Technician Module]\n";
echo 'Before Photo stored path: '.$evidence->photo_before."\n";
echo 'Before Photo generated URL: '.Storage::url($evidence->photo_before)."\n";
echo 'After Photo stored path: '.$evidence->photo_after."\n";
echo 'After Photo generated URL: '.Storage::url($evidence->photo_after)."\n";
echo 'Signature stored path: '.$evidence->signature_path."\n";
echo 'Signature generated URL: '.Storage::url($evidence->signature_path)."\n";
echo "\n";

echo "--- 6. HTTP REACHABILITY ---\n";
$urls = [
    'Document' => Storage::url($doc->path),
    'Before Photo' => Storage::url($evidence->photo_before),
];

foreach ($urls as $name => $url) {
    try {
        // Just checking reachability via HTTP request.
        // Note: localhost might refuse connection if server isn't running.
        // We are checking if the URL string points to a running host, but since we are in CLI, there might not be a dev server running.
        // But we will attempt.
        $response = Http::timeout(2)->get($url);
        echo "{$name} URL ({$url}) reachability: HTTP ".$response->status()."\n";
    } catch (Exception $e) {
        $msg = $e->getMessage();
        if (strpos($msg, 'Connection refused') !== false) {
            echo "{$name} URL ({$url}) reachability: Connection Refused (Server not running?)\n";
        } else {
            echo "{$name} URL ({$url}) reachability: Failed (".$msg.")\n";
        }
    }
}
