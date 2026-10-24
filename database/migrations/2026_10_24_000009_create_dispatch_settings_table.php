<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispatch_settings', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_type')->nullable(); // psb, complaint, null = global
            $table->string('key')->nullable();
            $table->json('value')->nullable();
            $table->unsignedInteger('min_members_present')->default(1);
            $table->unsignedInteger('accept_timeout_menit')->default(15);
            $table->unsignedInteger('max_oper')->default(3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatch_settings');
    }
};
