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
        Schema::table('provisionings', function (Blueprint $table) {
            $table->text('bfass_password')->nullable()->after('bfass_username');
            $table->timestamp('provisioned_at')->nullable()->after('completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('provisionings', function (Blueprint $table) {
            $table->dropColumn(['bfass_password', 'provisioned_at']);
        });
    }
};
