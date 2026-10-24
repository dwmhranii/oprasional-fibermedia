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
        Schema::create('provisionings', function (Blueprint $table) {
            $table->id();
            $table->string('provisioning_number', 25)->unique();
            $table->foreignId('submission_id')->unique()->constrained('submissions')->onDelete('cascade');
            $table->foreignId('admin_id')->constrained('users')->onDelete('restrict');

            // BFASS Account
            $table->string('bfass_username', 100)->unique();
            $table->string('bfass_account_id', 100)->nullable();
            $table->string('bfass_status', 20)->default('pending');

            // Network Configuration
            $table->string('service_type', 20)->default('PPPOE');
            $table->string('nas_server', 100)->nullable();
            $table->string('nas_ip', 45)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('ip_pool', 50)->nullable();
            $table->string('bandwidth_profile', 50)->nullable();
            $table->integer('bandwidth_up')->nullable(); // Kbps
            $table->integer('bandwidth_down')->nullable(); // Kbps

            // Provisioning Status
            $table->string('status', 30)->default('pending')->index();

            // Tracking retry & response
            $table->integer('retry_count')->default(0);
            $table->jsonb('bfass_response')->nullable();
            $table->jsonb('error_log')->nullable();

            $table->text('notes')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provisionings');
    }
};
