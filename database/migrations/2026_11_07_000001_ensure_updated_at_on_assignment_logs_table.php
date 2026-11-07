<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('assignment_logs')) {
            Schema::table('assignment_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('assignment_logs', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('created_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('assignment_logs')) {
            Schema::table('assignment_logs', function (Blueprint $table) {
                if (Schema::hasColumn('assignment_logs', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
            });
        }
    }
};
