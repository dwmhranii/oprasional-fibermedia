<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

$user = User::first();
$app->make('auth')->login($user);

// Notification API
$request = Request::create('/api/notifications', 'GET');
$response = $kernel->handle($request);
echo "Notification API:\n".$response->getContent()."\n\n";

// Task API
$request = Request::create('/api/teknisi/tasks', 'GET');
$response = $kernel->handle($request);
echo "Task API:\n".$response->getContent()."\n\n";
