<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

// Find a user with notifications
$user = User::whereHas('notifications')->first();
if (! $user) {
    // just pick any user
    $user = User::first();
}

$app->make('auth')->login($user);

echo "--- LIST NOTIFICATIONS ---\n";
$request = Request::create('/api/notifications', 'GET');
$response = $kernel->handle($request);
echo $response->getContent()."\n\n";

if ($user->notifications()->count() > 0) {
    $notifId = $user->notifications()->first()->id;
    echo "--- MARK AS READ ($notifId) ---\n";
    $request = Request::create("/api/notifications/{$notifId}/read", 'PATCH');
    $response = $kernel->handle($request);
    echo $response->getContent()."\n\n";
}

echo "--- MARK ALL AS READ ---\n";
$request = Request::create('/api/notifications/read-all', 'PATCH');
$response = $kernel->handle($request);
echo $response->getContent()."\n\n";
