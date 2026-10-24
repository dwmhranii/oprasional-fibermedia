<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('provisionings', function (Blueprint $table) {
            $table->timestamp('credentials_saved_at')->nullable()->after('provisioned_at');
            $table->timestamp('assigned_at')->nullable()->after('credentials_saved_at');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->timestamp('phase_1_submitted_at')->nullable()->after('completed_at');
            $table->integer('return_count')->default(0)->after('status');
        });

        Schema::table('task_assignments', function (Blueprint $table) {
            $table->timestamp('phase_2_submitted_at')->nullable()->after('approved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('provisionings', function (Blueprint $table) {
            $table->dropColumn(['credentials_saved_at', 'assigned_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['phase_1_submitted_at', 'return_count']);
        });

        Schema::table('task_assignments', function (Blueprint $table) {
            $table->dropColumn(['phase_2_submitted_at']);
        });
    }
};
