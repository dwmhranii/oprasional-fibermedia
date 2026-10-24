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

// Mock Auth
$user = User::whereHas('roles', function ($q) {
    $q->where('name', 'Teknisi');
})->first();
if (! $user) {
    $user = User::first();
}
Auth::login($user);

// Find a task assigned to this user
$task = Task::whereHas('assignments', function ($q) use ($user) {
    $q->where('user_id', $user->id);
})->first();

if (! $task) {
    echo "No task assigned to user found.\n";
    exit;
}

$controller = app(TaskController::class);

echo "--- UPLOADING BEFORE PHOTO ---\n";
// Create fake uploaded file
$tmpBefore = tempnam(sys_get_temp_dir(), 'before_');
file_put_contents($tmpBefore, 'fake_before_image_content');
$fileBefore = new UploadedFile($tmpBefore, 'before.jpg', 'image/jpeg', null, true);

$requestBefore = UploadTaskPhotoRequest::create("/api/teknisi/tasks/{$task->id}/upload-photo", 'POST', ['photo_type' => 'before'], [], ['photo' => $fileBefore]);
$requestBefore->setUserResolver(function () use ($user) {
    return $user;
});

// Execute
$responseBefore = $controller->uploadPhoto($requestBefore, $task);
echo 'Upload Before Status: '.$responseBefore->getStatusCode()."\n";

echo "--- UPLOADING AFTER PHOTO ---\n";
$tmpAfter = tempnam(sys_get_temp_dir(), 'after_');
file_put_contents($tmpAfter, 'fake_after_image_content');
$fileAfter = new UploadedFile($tmpAfter, 'after.jpg', 'image/jpeg', null, true);

$requestAfter = UploadTaskPhotoRequest::create("/api/teknisi/tasks/{$task->id}/upload-photo", 'POST', ['photo_type' => 'after'], [], ['photo' => $fileAfter]);
$requestAfter->setUserResolver(function () use ($user) {
    return $user;
});

$responseAfter = $controller->uploadPhoto($requestAfter, $task);
echo 'Upload After Status: '.$responseAfter->getStatusCode()."\n";

echo "\n--- VERIFICATION ---\n";
$evidence = TaskCompletionEvidence::whereHas('assignment', function ($q) use ($task, $user) {
    $q->where('task_id', $task->id)->where('user_id', $user->id);
})->first();

if ($evidence) {
    echo 'task_completion_evidences.photo_before: '.($evidence->photo_before ?? 'NULL')."\n";
    echo 'task_completion_evidences.photo_after: '.($evidence->photo_after ?? 'NULL')."\n";
} else {
    echo "No evidence record found!\n";
}

echo "\n--- TASK RESOURCE JSON OUTPUT ---\n";
// Create a fake request with user
$requestShow = Request::create("/api/teknisi/tasks/{$task->id}", 'GET');
$requestShow->setUserResolver(function () use ($user) {
    return $user;
});

$jsonResponse = $controller->show($task);
$data = json_decode($jsonResponse->getContent(), true)['data'];

$currentAssignment = $data['current_assignment'];
if ($currentAssignment) {
    echo 'current_assignment.evidence.photo_before_url: '.($currentAssignment['evidence']['photo_before_url'] ?? 'NULL')."\n";
    echo 'current_assignment.evidence.photo_after_url: '.($currentAssignment['evidence']['photo_after_url'] ?? 'NULL')."\n";
} else {
    echo "No current_assignment in JSON response.\n";
}
