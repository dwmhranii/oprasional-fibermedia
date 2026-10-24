<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Teknisi\TaskController;
use App\Http\Requests\Task\UploadTaskPhotoRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

$admin = User::where('role', 'Superadmin')->first() ?? User::factory()->create(['role' => 'Superadmin']);
$tech = User::where('role', 'Teknisi')->first() ?? User::factory()->create(['role' => 'Teknisi']);
Auth::login($tech);

$task = Task::latest()->first();

$controller = app(TaskController::class);

$file = UploadedFile::fake()->create('before.png', 10, 'image/png');
$request = UploadTaskPhotoRequest::create("/api/teknisi/tasks/{$task->id}/upload-photo", 'POST', ['photo_type' => 'before'], [], ['photo' => $file]);
$request->setContainer(app());
$request->validateResolved();
$controller->uploadPhoto($request, $task);

$file2 = UploadedFile::fake()->create('after.png', 10, 'image/png');
$request2 = UploadTaskPhotoRequest::create("/api/teknisi/tasks/{$task->id}/upload-photo", 'POST', ['photo_type' => 'after'], [], ['photo' => $file2]);
$request2->setContainer(app());
$request2->validateResolved();
$controller->uploadPhoto($request2, $task);

$sig = UploadedFile::fake()->create('sig.png', 10, 'image/png');
$request3 = Request::create("/api/teknisi/tasks/{$task->id}/upload-signature", 'POST', [], [], ['signature' => $sig]);
$controller->uploadSignature($request3, $task);

$task->refresh();
$resource = (new TaskResource($task))->toArray(request());
echo json_encode($resource['shared_verification']);
