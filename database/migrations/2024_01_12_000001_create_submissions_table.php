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
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->string('submission_number', 25)->unique();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');

            // Customer Data
            $table->string('customer_name', 100);
            $table->string('nik', 16);
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();

            // Address
            $table->text('address');
            $table->string('district', 100)->nullable()->index();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->decimal('lat', 10, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();

            // Package
            $table->string('package_name', 100);
            $table->string('package_speed', 30)->nullable();
            $table->decimal('package_price', 12, 2);
            $table->decimal('installation_fee', 12, 2)->default(0);
            $table->string('promo_code', 30)->nullable();
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total_price', 12, 2);

            // Documents
            $table->jsonb('documents')->default('{}');

            // Status
            $table->string('status', 30)->default('pending')->index();

            // Validation
            $table->foreignId('validated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestampTz('validated_at')->nullable();
            $table->text('validation_notes')->nullable();
            $table->text('rejection_reason')->nullable();

            // Notes & Meta
            $table->jsonb('notes')->default('{}');
            $table->string('source', 20)->default('web');
            $table->string('ip_address', 45)->nullable();

            $table->timestampsTz();
            $table->softDeletesTz();
        });

        // Add Full-Text Search Index using raw SQL since Laravel Schema doesn't natively support pg_trgm indices cleanly yet.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("CREATE INDEX idx_sub_fts ON submissions USING gin ((customer_name || ' ' || nik || ' ' || phone) gin_trgm_ops);");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
