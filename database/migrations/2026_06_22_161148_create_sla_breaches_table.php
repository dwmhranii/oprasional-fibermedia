<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sla_breaches', function (Blueprint $table) {
            $table->id();
            $table->string('breach_type');
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->text('description');
            $table->timestamp('detected_at');
            $table->timestamp('resolved_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['breach_type', 'entity_type', 'entity_id'], 'idx_sla_breach_entity');
            $table->index('resolved_at');
        });

        // Unique constraint to prevent duplicate active breaches (Partial Index for PostgreSQL)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('
                CREATE UNIQUE INDEX idx_unique_active_breach 
                ON sla_breaches (breach_type, entity_type, entity_id) 
                WHERE resolved_at IS NULL
            ');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sla_breaches');
    }
};
