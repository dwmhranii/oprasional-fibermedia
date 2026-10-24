<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

$query = User::role('Teknisi')
    ->where('status', 'active')
    ->whereNotNull('team')
    ->select('team', DB::raw('count(*) as total'))
    ->groupBy('team')
    ->havingRaw('COUNT(*) >= 2')
    ->orderBy('team');

echo $query->toSql()."\n";
