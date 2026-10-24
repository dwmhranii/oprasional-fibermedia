<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phase2_requirements', function (Blueprint $table) {
            $table->id();
            $table->string('assignable_type');
            $table->unsignedBigInteger('assignable_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('required_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('waived_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('waive_reason')->nullable();
            $table->timestamps();

            $table->unique(['assignable_type', 'assignable_id', 'user_id'], 'phase2_req_assignable_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phase2_requirements');
    }
};
