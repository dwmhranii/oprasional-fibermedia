<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$user = User::whereHas('notifications')->first();
$notifs = $user->notifications()->paginate(15);
$response = [
    'status' => 'success',
    'message' => 'Notifications retrieved successfully.',
    'data' => $notifs->toArray(),
];
echo json_encode($response, JSON_PRETTY_PRINT);
