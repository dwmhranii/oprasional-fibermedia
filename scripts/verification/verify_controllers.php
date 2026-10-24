<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Admin\ProvisioningController;
use App\Http\Controllers\NotificationController;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

$user = User::first();
$app->make('auth')->login($user);
$request = Request::create('/', 'GET');
$app->instance('request', $request);

echo "--- NotificationController ---\n";
$controller = $app->make(NotificationController::class);
$response = $controller->index($request);
echo $response->getContent()."\n\n";

echo "--- ProvisioningController ---\n";
$controller = $app->make(ProvisioningController::class);
$response = $controller->index($request);
echo $response->getContent()."\n\n";
