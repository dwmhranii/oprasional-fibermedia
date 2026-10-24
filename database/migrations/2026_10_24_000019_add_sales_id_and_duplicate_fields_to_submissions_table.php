<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (! Schema::hasColumn('submissions', 'sales_id')) {
                $table->foreignId('sales_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('submissions', 'nik_hash')) {
                $table->string('nik_hash', 64)->nullable()->after('nik')->index();
            }
            if (! Schema::hasColumn('submissions', 'phone_normalized')) {
                $table->string('phone_normalized', 20)->nullable()->after('phone')->index();
            }
            if (! Schema::hasColumn('submissions', 'duplicate_warnings')) {
                $table->json('duplicate_warnings')->nullable()->after('notes');
            }
        });

        // Pastikan role Sales ada di Spatie Permission
        if (class_exists(Role::class)) {
            Role::firstOrCreate(['name' => 'Sales', 'guard_name' => 'web']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (Schema::hasColumn('submissions', 'sales_id')) {
                $table->dropConstrainedForeignId('sales_id');
            }
            if (Schema::hasColumn('submissions', 'nik_hash')) {
                $table->dropColumn('nik_hash');
            }
            if (Schema::hasColumn('submissions', 'phone_normalized')) {
                $table->dropColumn('phone_normalized');
            }
            if (Schema::hasColumn('submissions', 'duplicate_warnings')) {
                $table->dropColumn('duplicate_warnings');
            }
        });
    }
};
