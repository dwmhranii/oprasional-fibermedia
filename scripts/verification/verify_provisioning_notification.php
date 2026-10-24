<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Enums\BfassStatus;
use App\Enums\ProvisioningStatus;
use App\Models\Provisioning;
use App\Models\Submission;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

echo "--- VERIFY PROVISIONING NOTIFICATION ---\n";

DB::table('notifications')->truncate();
$initialCount = DB::table('notifications')->count();
echo "Initial notifications count: $initialCount\n";

// 1. Create a provisioning
$submission = Submission::first();
if (! $submission) {
    echo "No submission found.\n";
    exit;
}

$prov = Provisioning::create([
    'provisioning_number' => 'PRV-TEST-'.time(),
    'submission_id' => $submission->id,
    'admin_id' => 1,
    'status' => ProvisioningStatus::PENDING,
    'bfass_status' => BfassStatus::PENDING,
    'retry_count' => 0,
]);

echo "Created Provisioning ID {$prov->id} with status PENDING\n";

// Run queue to clear any pending notifications just in case
Artisan::call('queue:work', ['--stop-when-empty' => true]);
$countAfterCreate = DB::table('notifications')->count();
echo "Notifications after create: $countAfterCreate\n";

// 2. Update status PENDING -> SUCCESS
echo "\nUpdating status to SUCCESS...\n";
$prov->update(['status' => ProvisioningStatus::SUCCESS]);
Artisan::call('queue:work', ['--stop-when-empty' => true]);
$countAfterSuccess = DB::table('notifications')->count();
$newNotifications = $countAfterSuccess - $countAfterCreate;
echo "Notifications after SUCCESS update: $countAfterSuccess (+$newNotifications new)\n";

// 3. Update an unrelated field
echo "\nUpdating an unrelated field (notes)...\n";
$prov->update(['notes' => 'Test notes update']);
Artisan::call('queue:work', ['--stop-when-empty' => true]);
$countAfterNotes = DB::table('notifications')->count();
$newNotifications = $countAfterNotes - $countAfterSuccess;
echo "Notifications after NOTES update: $countAfterNotes (+$newNotifications new)\n";

// 4. Update the status again: SUCCESS -> SUCCESS
echo "\nUpdating status again to SUCCESS...\n";
$prov->update(['status' => ProvisioningStatus::SUCCESS]);
Artisan::call('queue:work', ['--stop-when-empty' => true]);
$countAfterDuplicate = DB::table('notifications')->count();
$newNotifications = $countAfterDuplicate - $countAfterNotes;
echo "Notifications after duplicate SUCCESS update: $countAfterDuplicate (+$newNotifications new)\n";

echo "\nVerification Complete.\n";
