<?php

use App\Enums\ProvisioningStatus;
use App\Enums\TaskAssignmentStatus;
use App\Enums\TaskStatus;
use App\Http\Controllers\Teknisi\TaskController;
use App\Http\Resources\TaskResource;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskCompletionEvidence;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

DB::beginTransaction();

try {
    // 1. Setup Data
    Role::firstOrCreate(['name' => 'Teknisi']);
    $teknisiA = User::factory()->create(['team' => 'Team Alpha', 'status' => 'active']);
    $teknisiA->assignRole('Teknisi');

    $teknisiB = User::factory()->create(['team' => 'Team Alpha', 'status' => 'active']);
    $teknisiB->assignRole('Teknisi');

    $submission = Submission::factory()->create(['lat' => -6.2, 'lng' => 106.8]);
    $provisioning = Provisioning::factory()->create(['submission_id' => $submission->id, 'status' => ProvisioningStatus::PROCESSING]);

    $task = Task::factory()->create([
        'provisioning_id' => $provisioning->id,
        'status' => TaskStatus::PHASE_1_SUBMITTED,
        'assigned_team' => 'Team Alpha',
    ]);

    $assignmentA = TaskAssignment::create([
        'task_id' => $task->id,
        'user_id' => $teknisiA->id,
        'status' => TaskAssignmentStatus::ASSIGNED,
    ]);

    $assignmentB = TaskAssignment::create([
        'task_id' => $task->id,
        'user_id' => $teknisiB->id,
        'status' => TaskAssignmentStatus::ASSIGNED,
    ]);

    TaskCompletionEvidence::create([
        'task_assignment_id' => $assignmentA->id,
        'attendance_photo_path' => 'fake_path.jpg',
    ]);

    // 2. Simulate POST /phase-2 for Teknisi A
    $request = Request::create("/api/teknisi/tasks/{$task->id}/phase-2", 'POST', [
        'completion_notes' => 'Done',
        'latitude' => -6.2,
        'longitude' => 106.8,
        'accuracy' => 10,
    ]);
    $request->setUserResolver(function () use ($teknisiA) {
        return $teknisiA;
    });
    app()->instance('request', $request);

    // Simulate auth
    Auth::login($teknisiA);

    $controller = app(TaskController::class);
    // Ignore gate bypass for script
    // We can just call phase2 method. But it has Gate::authorize which might fail if not in web req.
    // Instead of calling phase2, let's manually execute its logic to simulate the exact DB update.
    DB::transaction(function () use ($assignmentA, $request) {
        $evidence = TaskCompletionEvidence::where('task_assignment_id', $assignmentA->id)->first();
        $evidence->update([
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'accuracy' => $request->accuracy,
            'notes' => $request->completion_notes,
            'submitted_at' => now(),
            'status' => 'submitted',
        ]);
        $assignmentA->update([
            'status' => TaskAssignmentStatus::PHASE_2_COMPLETE,
            'phase_2_submitted_at' => now(),
        ]);
    });

    echo "--- 1. DATABASE STATE ---\n";
    $task->refresh();
    echo "Parent Task ID: {$task->id}, Status: {$task->status->value}\n";
    $assignments = TaskAssignment::where('task_id', $task->id)->get();
    foreach ($assignments as $a) {
        $statusType = gettype($a->status);
        $statusVal = $statusType === 'object' && $a->status instanceof BackedEnum ? $a->status->value : $a->status;
        echo "Assignment ID: {$a->id}, User ID: {$a->user_id}, Status: {$statusVal} (Type: ".($a->status instanceof BackedEnum ? 'BackedEnum' : $statusType).")\n";
    }

    echo "\n--- 2. RAW JSON RESPONSE (GET /api/teknisi/tasks/{id}) ---\n";
    $getRequest = Request::create("/api/teknisi/tasks/{$task->id}", 'GET');
    $getRequest->setUserResolver(function () use ($teknisiA) {
        return $teknisiA;
    });

    // We can just construct the TaskResource to see exactly what it evaluates
    $task->load(['provisioning.submission', 'teknisi', 'assignments.user', 'assignments.evidence']);

    $resource = new TaskResource($task);
    $json = json_encode($resource->toArray($getRequest), JSON_PRETTY_PRINT);
    echo $json."\n";

    echo "\n--- 3. TaskResource RUNTIME ---\n";
    foreach ($task->assignments as $a) {
        $type = gettype($a->status);
        $val = $type === 'object' && $a->status instanceof BackedEnum ? $a->status->value : $a->status;
        $class = $type === 'object' ? get_class($a->status) : 'N/A';
        echo "ID: {$a->id}, Status Value: {$val}, PHP Type: ".($a->status instanceof BackedEnum ? 'BackedEnum ('.$class.')' : $type)."\n";
    }

    echo "\n--- 4. EXACT EVALUATION ---\n";
    $matched = $task->assignments->whereIn('status', [
        TaskAssignmentStatus::PHASE_2_COMPLETE->value,
        TaskAssignmentStatus::APPROVED->value,
    ]);
    echo 'Matched Rows: '.$matched->count()."\n";
    if ($matched->count() === 0) {
        echo "Why zero?\n";
        echo "Checking whereIn on Enum vs String:\n";

        // Let's test checking enum directly
        $matchedWithEnum = $task->assignments->whereIn('status', [
            TaskAssignmentStatus::PHASE_2_COMPLETE,
            TaskAssignmentStatus::APPROVED,
        ]);
        echo 'Matched Rows with Enum Objects: '.$matchedWithEnum->count()."\n";
    }

} catch (Exception $e) {
    echo 'Error: '.$e->getMessage()."\n".$e->getTraceAsString();
} finally {
    DB::rollBack();
}
