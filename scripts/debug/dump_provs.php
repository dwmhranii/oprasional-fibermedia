<?php

use App\Models\Provisioning;
use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$provs = Provisioning::whereNotNull('bfass_response')->take(5)->get();
foreach ($provs as $p) {
    echo 'ID: '.$p->id."\n";
    echo json_encode($p->bfass_response, JSON_PRETTY_PRINT)."\n\n";
}
