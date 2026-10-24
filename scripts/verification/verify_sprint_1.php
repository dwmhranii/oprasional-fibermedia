<?php

use App\Enums\SubmissionStatus;
use App\Models\Provisioning;
use App\Models\Submission;
use App\Models\Task;
use App\Models\User;
use App\Services\ManualBfassProvisioningService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Crypt;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

function log_msg($msg)
{
    echo $msg."\n";
}

try {
    DB::beginTransaction();

    // 1. Create Teams
    // Team X_TEST: 1 member (should be skipped)
    $techA = User::factory()->create(['team' => 'Team X_TEST']);
    $techA->assignRole('Teknisi');

    // Team Y_TEST: 2 members (eligible)
    $techB1 = User::factory()->create(['team' => 'Team Y_TEST']);
    $techB2 = User::factory()->create(['team' => 'Team Y_TEST']);
    $techB1->assignRole('Teknisi');
    $techB2->assignRole('Teknisi');

    log_msg('Created Team X_TEST (1 member) and Team Y_TEST (2 members).');

    // 2. Mock Admin Validation
    $submission = Submission::factory()->create(['status' => SubmissionStatus::PENDING]);
    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    // Simulate validation
    $submission->update(['status' => SubmissionStatus::APPROVED]);
    $provisioning = Provisioning::create([
        'provisioning_number' => 'PRV-TEST'.rand(100, 999),
        'submission_id' => $submission->id,
        'admin_id' => $admin->id,
        'status' => 'pending',
        'bfass_status' => 'pending',
        'retry_count' => 0,
    ]);

    log_msg('Validation completed. Provisioning created. Tasks count: '.Task::where('provisioning_id', $provisioning->id)->count());
    if (Task::where('provisioning_id', $provisioning->id)->count() > 0) {
        throw new Exception('Tasks were incorrectly created during validation.');
    }

    // 3. Mock Manual BFASS Entry
    $service = new ManualBfassProvisioningService;
    $credentials = [
        'bfass_username' => 'testuser'.rand(100, 999),
        'bfass_password' => 'secret123',
        'service_type' => 'FTTH',
    ];

    $provisioning = $service->saveCredentialsAndAssignTask($provisioning, $credentials, $admin->id);

    log_msg('Manual BFASS saved.');

    // 4. Verify Task Assignment
    $tasks = Task::where('provisioning_id', $provisioning->id)->get();
    if ($tasks->count() !== 1) {
        throw new Exception('Expected exactly 1 task, found '.$tasks->count());
    }

    $task = $tasks->first();
    if ($task->assigned_team !== 'Team Y_TEST') {
        throw new Exception('Task was incorrectly assigned to '.$task->assigned_team.' instead of Team Y_TEST.');
    }

    log_msg('Task correctly assigned to Team Y_TEST.');

    // 5. Verify Encrypted Password
    $rawPassword = DB::table('provisionings')->where('id', $provisioning->id)->value('bfass_password');
    if ($rawPassword === 'secret123') {
        throw new Exception('Password was stored in plain text!');
    }

    try {
        $decrypted = Crypt::decryptString($rawPassword);
        if ($decrypted !== 'secret123') {
            throw new Exception('Password was not encrypted properly.');
        }
        log_msg('Password encryption verified.');
    } catch (Exception $e) {
        throw new Exception('Password decryption failed: '.$e->getMessage());
    }

    log_msg('ALL SPRINT 1 VERIFICATIONS PASSED.');

    DB::rollBack();

} catch (Exception $e) {
    DB::rollBack();
    log_msg('VERIFICATION FAILED: '.$e->getMessage());
    exit(1);
}
