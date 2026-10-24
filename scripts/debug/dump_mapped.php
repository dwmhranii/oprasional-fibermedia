<?php

use App\Models\TaskCompletionEvidence;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$evidence = TaskCompletionEvidence::first()->toArray();
$evidence['signature_url'] = $evidence['signature_path'] ? Storage::url($evidence['signature_path']) : null;
$evidence['photo_before_url'] = $evidence['photo_before'] ? Storage::url($evidence['photo_before']) : null;
$evidence['photo_after_url'] = $evidence['photo_after'] ? Storage::url($evidence['photo_after']) : null;
echo json_encode($evidence, JSON_PRETTY_PRINT);
