<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Safe, idempotent data migration.
        DB::table('task_assignments')
            ->where('status', 'submitted')
            ->update(['status' => 'phase_2_complete']);

        DB::table('task_assignments')
            ->where('status', 'working')
            ->update(['status' => 'assigned']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This is a one-way data compatibility migration.
        // It is not possible to determine which 'phase_2_complete' assignments
        // were originally 'submitted' or which 'assigned' ones were originally 'working'.
        // Down migration is intentionally left blank.
    }
};
