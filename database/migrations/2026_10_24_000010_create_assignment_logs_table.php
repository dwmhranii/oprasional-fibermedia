<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_logs', function (Blueprint $table) {
            $table->id();
            $table->morphs('assignable'); // task atau complaint (otomatis membuat index)
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->string('ticket_type')->nullable();
            $table->unsignedBigInteger('ticket_id')->nullable();
            $table->string('action'); // assigned, accepted, declined, timeout, reassigned, pending
            $table->text('reason')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('attempt_no')->default(1);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_logs');
    }
};
