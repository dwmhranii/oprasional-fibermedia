<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update tasks (jika kolom belum ada)
        Schema::table('tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('tasks', 'assigned_team_id')) {
                $table->foreignId('assigned_team_id')->nullable()->constrained('teams')->nullOnDelete();
            }
            if (! Schema::hasColumn('tasks', 'accepted_at')) {
                $table->timestamp('accepted_at')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'accepted_by_id')) {
                $table->foreignId('accepted_by_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('tasks', 'response_deadline_at')) {
                $table->timestamp('response_deadline_at')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'reassign_count')) {
                $table->unsignedInteger('reassign_count')->default(0);
            }
            if (! Schema::hasColumn('tasks', 'unassigned_since')) {
                $table->timestamp('unassigned_since')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'rating_note')) {
                $table->string('rating_note')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'rated_at')) {
                $table->timestamp('rated_at')->nullable();
            }
            if (! Schema::hasColumn('tasks', 'rated_by_id')) {
                $table->foreignId('rated_by_id')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        // 2. Update complaints (jika kolom belum ada)
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'assigned_team_id')) {
                $table->foreignId('assigned_team_id')->nullable()->constrained('teams')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'assigned_at')) {
                $table->timestamp('assigned_at')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'accepted_at')) {
                $table->timestamp('accepted_at')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'accepted_by_id')) {
                $table->foreignId('accepted_by_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'response_deadline_at')) {
                $table->timestamp('response_deadline_at')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'reassign_count')) {
                $table->unsignedInteger('reassign_count')->default(0);
            }
            if (! Schema::hasColumn('complaints', 'unassigned_since')) {
                $table->timestamp('unassigned_since')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'customer_rating')) {
                $table->unsignedTinyInteger('customer_rating')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'rating_note')) {
                $table->string('rating_note')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'rated_at')) {
                $table->timestamp('rated_at')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'rated_by_id')) {
                $table->foreignId('rated_by_id')->nullable()->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'assigned_team_id', 'accepted_at', 'accepted_by_id', 'response_deadline_at',
                'reassign_count', 'unassigned_since', 'rating_note', 'rated_at', 'rated_by_id',
            ]);
        });

        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn([
                'assigned_team_id', 'assigned_at', 'accepted_at', 'accepted_by_id', 'response_deadline_at',
                'reassign_count', 'unassigned_since', 'customer_rating', 'rating_note', 'rated_at', 'rated_by_id',
            ]);
        });
    }
};
