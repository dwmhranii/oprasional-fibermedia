<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->decimal('completion_latitude', 10, 8)->nullable();
            $table->decimal('completion_longitude', 11, 8)->nullable();
            $table->decimal('completion_accuracy', 8, 2)->nullable();
            $table->timestamp('location_captured_at')->nullable();

            $table->string('customer_signature_path')->nullable();
            $table->timestamp('signature_uploaded_at')->nullable();
            $table->foreignId('signature_uploaded_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['signature_uploaded_by']);
            $table->dropColumn([
                'completion_latitude',
                'completion_longitude',
                'completion_accuracy',
                'location_captured_at',
                'customer_signature_path',
                'signature_uploaded_at',
                'signature_uploaded_by',
            ]);
        });
    }
};
