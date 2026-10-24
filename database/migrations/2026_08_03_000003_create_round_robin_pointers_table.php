<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('round_robin_pointers')) {
            Schema::create('round_robin_pointers', function (Blueprint $table) {
                $table->id();
                $table->string('queue_type')->unique();
                $table->foreignId('last_team_id')->nullable()->constrained('teams')->onDelete('set null');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('round_robin_pointers');
    }
};
