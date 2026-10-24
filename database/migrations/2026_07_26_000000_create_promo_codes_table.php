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
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['fixed', 'percentage', 'free_installation'])->default('fixed');
            $table->decimal('value', 12, 2)->default(0);
            $table->decimal('min_package_price', 12, 2)->default(0);
            $table->integer('max_uses')->nullable();
            $table->integer('used_count')->default(0);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Also add promo_code and discount fields to submissions table if not present
        if (Schema::hasTable('submissions')) {
            Schema::table('submissions', function (Blueprint $table) {
                if (! Schema::hasColumn('submissions', 'promo_code')) {
                    $table->string('promo_code')->nullable()->after('package_price');
                }
                if (! Schema::hasColumn('submissions', 'discount_amount')) {
                    $table->decimal('discount_amount', 12, 2)->default(0)->after('promo_code');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('submissions')) {
            Schema::table('submissions', function (Blueprint $table) {
                if (Schema::hasColumn('submissions', 'promo_code')) {
                    $table->dropColumn('promo_code');
                }
                if (Schema::hasColumn('submissions', 'discount_amount')) {
                    $table->dropColumn('discount_amount');
                }
            });
        }
        Schema::dropIfExists('promo_codes');
    }
};
