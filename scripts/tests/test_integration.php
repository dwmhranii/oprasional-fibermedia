<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Enums\TaskStatus;
use App\Http\Controllers\Teknisi\TaskController;
use App\Http\Requests\Task\UpdateTaskStatusRequest;
use App\Http\Resources\TaskResource;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

try {
    DB::beginTransaction();

    $submission = clone clone clone Submission::first(); // Clone won't work on DB easily, just query
    // Actually just create a dummy task for testing.
    echo "Writing a test dummy...\n";

    // Test ASSIGNED -> IN_PROGRESS transition directly.
    $task = Task::first();
    $task->status = TaskStatus::ASSIGNED;
    $task->save();

    $request = UpdateTaskStatusRequest::create('/api/teknisi/tasks/'.$task->id.'/status', 'PUT', ['status' => 'in_progress']);
    $request->setContainer($app);
    $request->setRedirector($app->make(Redirector::class));
    $request->validateResolved();
    $controller = app()->make(TaskController::class);

    $admin = clone User::role('Admin')->first();
    Auth::login($admin);

    $response = $controller->updateStatus($request, $task);
    echo 'Response status for ASSIGNED->IN_PROGRESS: '.$response->getStatusCode()."\n";
    $json = json_decode($response->getContent(), true);
    echo 'Message: '.($json['message'] ?? 'N/A')."\n";

    // Check Date formatting
    $resource = new TaskResource($task->fresh());
    $data = $resource->toArray($request);
    echo 'Departed At format: '.($data['departed_at'] ?? 'null')."\n";
    echo 'Arrived At format: '.($data['arrived_at'] ?? 'null')."\n";

    DB::rollBack();
    echo "Success!\n";
} catch (Throwable $e) {
    DB::rollBack();
    echo 'Error: '.$e->getMessage()."\n".$e->getFile().':'.$e->getLine()."\n";
}
