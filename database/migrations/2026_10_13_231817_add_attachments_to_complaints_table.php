<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('complaints') && ! Schema::hasColumn('complaints', 'attachments')) {
            Schema::table('complaints', function (Blueprint $table) {
                $table->json('attachments')->nullable()->after('whatsapp_message');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('complaints') && Schema::hasColumn('complaints', 'attachments')) {
            Schema::table('complaints', function (Blueprint $table) {
                $table->dropColumn('attachments');
            });
        }
    }
};
