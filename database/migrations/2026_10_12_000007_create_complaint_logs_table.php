<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('complaint_logs')) {
            Schema::create('complaint_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('complaint_id')->constrained('complaints')->onDelete('cascade');
                $table->string('from_status', 35)->nullable();
                $table->string('to_status', 35);
                $table->string('action', 100);
                $table->foreignId('actor_id')->nullable()->constrained('users')->onDelete('set null');
                $table->string('actor_role', 50)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('complaint_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_logs');
    }
};
