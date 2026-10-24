<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_attendances', function (Blueprint $table) {
            $table->id();
            $table->string('attendable_type');
            $table->unsignedBigInteger('attendable_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('selfie_media_id')->nullable();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->decimal('distance_meters', 8, 2)->nullable();
            $table->enum('geofence_status', ['inside', 'outside', 'low_accuracy', 'unverified'])->default('unverified');
            $table->timestamp('captured_at')->useCurrent();
            $table->timestamp('received_at')->useCurrent();
            $table->unsignedBigInteger('device_id')->nullable();
            $table->timestamps();

            $table->unique(['attendable_type', 'attendable_id', 'user_id'], 'ticket_att_attendable_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_attendances');
    }
};
