<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'coverage_areas')) {
                $table->json('coverage_areas')->nullable()->after('team');
            }
            if (! Schema::hasColumn('users', 'max_active_complaints')) {
                $table->unsignedInteger('max_active_complaints')->default(5)->after('coverage_areas');
            }
            if (! Schema::hasColumn('users', 'availability')) {
                $table->enum('availability', ['active', 'off_duty', 'on_leave'])->default('active')->after('max_active_complaints');
            }
            if (! Schema::hasColumn('users', 'last_complaint_assigned_at')) {
                $table->timestamp('last_complaint_assigned_at')->nullable()->after('availability');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'coverage_areas',
                'max_active_complaints',
                'availability',
                'last_complaint_assigned_at',
            ]);
        });
    }
};
