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
            $table->string('vlan')->nullable()->after('bfass_password');
            $table->string('odp')->nullable()->after('vlan');
            $table->string('onu_serial_number')->nullable()->after('odp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('provisionings', function (Blueprint $table) {
            $table->dropColumn(['vlan', 'odp', 'onu_serial_number']);
        });
    }
};
