<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('complaint_assignments')) {
            Schema::create('complaint_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('complaint_id')->constrained('complaints')->onDelete('cascade');
                $table->foreignId('technician_id')->nullable()->constrained('users');
                $table->foreignId('assigned_by_id')->nullable()->constrained('users');
                $table->enum('assigned_by_role', ['admin', 'superadmin', 'system'])->default('system');
                $table->boolean('is_manual_assignment')->default(false);

                $table->enum('status', ['assigned', 'in_progress', 'resolved', 'returned'])->default('assigned');
                $table->timestamp('scheduled_visit_at')->nullable();
                $table->text('notes')->nullable();

                // Lifecycle timestamps
                $table->timestamp('assigned_at')->useCurrent();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamp('returned_at')->nullable();
                $table->text('return_reason')->nullable();

                $table->timestamps();

                $table->index('complaint_id');
                $table->index('technician_id');
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_assignments');
    }
};
