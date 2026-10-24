<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'assigned_team')) {
                $table->string('assigned_team', 50)->nullable()->index()->after('area');
            }
        });

        Schema::table('complaint_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_assignments', 'assigned_team')) {
                $table->string('assigned_team', 50)->nullable()->index()->after('technician_id');
            }
        });

        // Sync existing assignments with technician team if available
        try {
            DB::statement('
                UPDATE complaint_assignments ca
                JOIN users u ON ca.technician_id = u.id
                SET ca.assigned_team = u.team
                WHERE ca.assigned_team IS NULL AND u.team IS NOT NULL
            ');

            DB::statement('
                UPDATE complaints c
                JOIN complaint_assignments ca ON c.id = ca.complaint_id
                SET c.assigned_team = ca.assigned_team
                WHERE c.assigned_team IS NULL AND ca.assigned_team IS NOT NULL
            ');
        } catch (Throwable $e) {
            // Ignore in testing or SQLite environments if any
        }
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'assigned_team')) {
                $table->dropColumn('assigned_team');
            }
        });

        Schema::table('complaint_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('complaint_assignments', 'assigned_team')) {
                $table->dropColumn('assigned_team');
            }
        });
    }
};
