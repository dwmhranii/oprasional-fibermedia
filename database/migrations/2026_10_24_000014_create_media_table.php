<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->nullableMorphs('mediable');
            $table->string('kind'); // before, after, ont, selfie, signature, document
            $table->string('disk')->default('private');
            $table->string('path');
            $table->string('sha256', 64)->nullable()->index();
            $table->unsignedBigInteger('size');
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('received_at')->useCurrent();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->unsignedBigInteger('device_id')->nullable();
            $table->foreignId('uploaded_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
