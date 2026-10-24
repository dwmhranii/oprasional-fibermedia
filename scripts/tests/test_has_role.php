<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

try {
    $superadmin = User::role('Superadmin')->first();
    echo 'hasRole array: '.($superadmin->hasRole(['Superadmin', 'Admin']) ? 'Yes' : 'No')."\n";
    echo 'hasAnyRole array: '.($superadmin->hasAnyRole(['Superadmin', 'Admin']) ? 'Yes' : 'No')."\n";

} catch (Throwable $e) {
    echo 'Error: '.$e->getMessage()."\n";
}
