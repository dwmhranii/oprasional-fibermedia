<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\User;
use App\Notifications\ProvisioningCompletedNotification;
use App\Notifications\SubmissionCreatedNotification;
use App\Notifications\SubmissionValidatedNotification;
use App\Notifications\TaskAssignedNotification;
use App\Notifications\TechnicianApprovedNotification;
use App\Notifications\TechnicianReturnedNotification;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

echo "--- VERIFY NOTIFICATIONS ---\n";

$initialCount = DB::table('notifications')->count();

$admin = User::role('Admin')->first();
$sales = User::role('Sales')->first();
$tek = User::role('Teknisi')->first();

// We will skip factory creation and just use existing objects if any, to avoid DB constraints.
$submission = Submission::first();
$prov = Provisioning::first();
$task = Task::first();
$assignment = TaskAssignment::first();

if (! $submission || ! $prov || ! $task || ! $assignment) {
    echo "Missing data to verify.\n";
    exit;
}

// 1. Submission Created
Notification::send($admin, new SubmissionCreatedNotification($submission));
echo 'SubmissionCreated: '.(DB::table('notifications')->count() - $initialCount)." new notification\n";
$initialCount = DB::table('notifications')->count();

// 2. Submission Validated
$sales->notify(new SubmissionValidatedNotification($submission));
echo 'SubmissionValidated: '.(DB::table('notifications')->count() - $initialCount)." new notification\n";
$initialCount = DB::table('notifications')->count();

// 3. Provisioning Completed
Notification::send([$admin, $sales], new ProvisioningCompletedNotification($prov));
echo 'ProvisioningCompleted: '.(DB::table('notifications')->count() - $initialCount)." new notifications\n";
$initialCount = DB::table('notifications')->count();

// 4. Task Assigned
Notification::send([$tek], new TaskAssignedNotification($task));
echo 'TaskAssigned: '.(DB::table('notifications')->count() - $initialCount)." new notification\n";
$initialCount = DB::table('notifications')->count();

// 5. Technician Returned
$tek->notify(new TechnicianReturnedNotification($assignment));
echo 'TechnicianReturned: '.(DB::table('notifications')->count() - $initialCount)." new notification\n";
$initialCount = DB::table('notifications')->count();

// 6. Technician Approved
$tek->notify(new TechnicianApprovedNotification($assignment));
echo 'TechnicianApproved: '.(DB::table('notifications')->count() - $initialCount)." new notification\n";

$latest = DB::table('notifications')->orderBy('created_at', 'desc')->take(7)->get();

foreach ($latest as $n) {
    echo "\nPayload for ".$n->type.":\n";
    echo $n->data."\n";
}

echo "\nVerification successful.\n";
