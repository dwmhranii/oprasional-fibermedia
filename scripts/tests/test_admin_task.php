<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

try {
    $superadmin = User::role('Superadmin')->first();
    Auth::login($superadmin);

    $task = Task::first();
    $request = Request::create('/api/teknisi/tasks/'.$task->id, 'GET');
    $request->setUserResolver(fn () => $superadmin);

    $resource = new TaskResource($task);
    $array = $resource->toArray($request);

    echo 'All Assignments length: '.count($array['all_assignments'])."\n";
    echo 'Has Role Admin/Superadmin: '.($superadmin->hasRole(['Admin', 'Superadmin']) ? 'Yes' : 'No')."\n";

    echo "Success!\n";
} catch (Throwable $e) {
    echo 'Error: '.$e->getMessage()."\n".$e->getFile().':'.$e->getLine()."\n";
}
