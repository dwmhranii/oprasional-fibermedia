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
        Schema::create('team_assignment_settings', function (Blueprint $table) {
            $table->id();
            $table->string('current_team')->nullable();
            $table->timestamps();
        });

        // Insert initial pointer
        DB::table('team_assignment_settings')->insert([
            'current_team' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_assignment_settings');
    }
};
