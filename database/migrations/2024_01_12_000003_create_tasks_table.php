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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('task_number', 25)->unique();
            $table->foreignId('provisioning_id')->constrained('provisionings')->onDelete('cascade');
            $table->foreignId('teknisi_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();

            // Schedule
            $table->date('scheduled_date')->nullable()->index();
            $table->time('scheduled_start')->nullable();
            $table->time('scheduled_end')->nullable();

            // Status
            $table->string('status', 20)->default('assigned')->index();

            // Result
            $table->string('result', 20)->nullable();
            $table->text('completion_notes')->nullable();
            $table->smallInteger('customer_rating')->nullable();

            // Photos
            $table->jsonb('photos')->default('{}');

            // Timeline tracking
            $table->timestampTz('assigned_at')->useCurrent();
            $table->timestampTz('departed_at')->nullable();
            $table->timestampTz('arrived_at')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();

            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
