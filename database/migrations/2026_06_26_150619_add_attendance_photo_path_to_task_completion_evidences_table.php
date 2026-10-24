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
        Schema::table('task_completion_evidences', function (Blueprint $table) {
            $table->string('attendance_photo_path')->nullable()->after('photo_after');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_completion_evidences', function (Blueprint $table) {
            $table->dropColumn('attendance_photo_path');
        });
    }
};
