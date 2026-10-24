<?php

use App\Http\Resources\SubmissionResource;
use App\Models\Submission;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$submission = Submission::with('documents')->has('documents')->first();

if (! $submission) {
    echo "No submission with documents found\n";
    exit;
}

$resource = new SubmissionResource($submission);
$request = request();
$data = $resource->toArray($request);

echo json_encode($data['documents'] ?? $data, JSON_PRETTY_PRINT);
