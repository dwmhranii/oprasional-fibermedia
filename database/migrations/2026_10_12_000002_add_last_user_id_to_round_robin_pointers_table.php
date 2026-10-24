<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('round_robin_pointers', function (Blueprint $table) {
            if (! Schema::hasColumn('round_robin_pointers', 'last_user_id')) {
                $table->foreignId('last_user_id')->nullable()->after('last_team_id')->constrained('users')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('round_robin_pointers', function (Blueprint $table) {
            $table->dropForeign(['last_user_id']);
            $table->dropColumn('last_user_id');
        });
    }
};
