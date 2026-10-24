<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kpi_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('kpi_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('period', 7); // YYYY-MM
            $table->string('subject_type'); // team, user, sales
            $table->unsignedBigInteger('subject_id');
            $table->json('metrics');
            $table->json('weights');
            $table->decimal('score', 5, 2);
            $table->timestamp('computed_at')->useCurrent();
            $table->timestamps();

            $table->unique(['period', 'subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_snapshots');
        Schema::dropIfExists('kpi_settings');
    }
};
