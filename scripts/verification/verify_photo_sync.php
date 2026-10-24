<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Teknisi\TaskController;
use App\Http\Requests\Task\UploadTaskPhotoRequest;
use App\Models\Task;
use App\Models\TaskCompletionEvidence;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;

$user = User::whereHas('roles', function ($q) {
    $q->where('name', 'Admin');
})->first();
if (! $user) {
    $user = User::first();
}

$teknisi = User::whereHas('roles', function ($q) {
    $q->where('name', 'Teknisi');
})->first();
Auth::login($teknisi);
$task = Task::whereHas('assignments', function ($q) use ($teknisi) {
    $q->where('user_id', $teknisi->id);
})->first();

if (! $task) {
    echo "No task assigned to user found.\n";
    exit;
}

// Clear state to avoid already_completed early return
$task->update([
    'photos' => [],
    'customer_signature_path' => null,
]);

$controller = app(TaskController::class);

echo "--- 1. UPLOADING BEFORE PHOTO ---\n";
$tmpBefore = tempnam(sys_get_temp_dir(), 'before_');
copy(__DIR__.'/public/favicon.ico', $tmpBefore);
$fileBefore = new UploadedFile($tmpBefore, 'before.jpg', 'image/jpeg', null, true);

$requestBefore = UploadTaskPhotoRequest::create("/api/teknisi/tasks/{$task->id}/upload-photo", 'POST', ['photo_type' => 'before'], [], ['photo' => $fileBefore]);
$requestBefore->setUserResolver(function () use ($teknisi) {
    return $teknisi;
});
$controller->uploadPhoto($requestBefore, $task);

$task->refresh();
$evidence = TaskCompletionEvidence::whereHas('assignment', function ($q) use ($task, $teknisi) {
    $q->where('task_id', $task->id)->where('user_id', $teknisi->id);
})->first();

echo 'tasks.photos: '.json_encode($task->photos)."\n";
echo 'task_completion_evidences.photo_before: '.($evidence->photo_before ?? 'NULL')."\n\n";

echo "--- 2. UPLOADING AFTER PHOTO ---\n";
$tmpAfter = tempnam(sys_get_temp_dir(), 'after_');
copy(__DIR__.'/public/favicon.ico', $tmpAfter);
$fileAfter = new UploadedFile($tmpAfter, 'after.jpg', 'image/jpeg', null, true);

$requestAfter = UploadTaskPhotoRequest::create("/api/teknisi/tasks/{$task->id}/upload-photo", 'POST', ['photo_type' => 'after'], [], ['photo' => $fileAfter]);
$requestAfter->setUserResolver(function () use ($teknisi) {
    return $teknisi;
});
$controller->uploadPhoto($requestAfter, $task);

$task->refresh();
$evidence->refresh();
echo 'tasks.photos: '.json_encode($task->photos)."\n";
echo 'task_completion_evidences.photo_after: '.($evidence->photo_after ?? 'NULL')."\n\n";

echo "--- 3. TASK RESOURCE JSON OUTPUT ---\n";
Auth::login($user);
$task->load(['provisioning.submission', 'teknisi', 'assignments.user', 'assignments.evidence']);
$requestShow = Request::create("/api/teknisi/tasks/{$task->id}", 'GET');
$requestShow->setUserResolver(function () use ($user) {
    return $user;
});
$jsonResponse = $controller->show($task);
$data = json_decode($jsonResponse->getContent(), true)['data'];
$current = $data['current_assignment'];
echo 'all_assignments[].evidence.photo_before_url: '.($current['evidence']['photo_before_url'] ?? 'NULL')."\n";
echo 'all_assignments[].evidence.photo_after_url: '.($current['evidence']['photo_after_url'] ?? 'NULL')."\n";
