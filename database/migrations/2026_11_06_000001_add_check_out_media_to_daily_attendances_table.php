<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('daily_attendances')) {
            Schema::table('daily_attendances', function (Blueprint $table) {
                if (! Schema::hasColumn('daily_attendances', 'check_out_media_id')) {
                    $table->unsignedBigInteger('check_out_media_id')->nullable()->after('check_out_at');
                    $table->foreign('check_out_media_id')->references('id')->on('media')->nullOnDelete();
                }
                if (! Schema::hasColumn('daily_attendances', 'check_out_lat')) {
                    $table->decimal('check_out_lat', 10, 7)->nullable()->after('check_out_media_id');
                }
                if (! Schema::hasColumn('daily_attendances', 'check_out_lng')) {
                    $table->decimal('check_out_lng', 10, 7)->nullable()->after('check_out_lat');
                }
                if (! Schema::hasColumn('daily_attendances', 'check_out_accuracy')) {
                    $table->decimal('check_out_accuracy', 8, 2)->nullable()->after('check_out_lng');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('daily_attendances')) {
            Schema::table('daily_attendances', function (Blueprint $table) {
                if (Schema::hasColumn('daily_attendances', 'check_out_media_id')) {
                    $table->dropForeign(['check_out_media_id']);
                    $table->dropColumn('check_out_media_id');
                }
                if (Schema::hasColumn('daily_attendances', 'check_out_lat')) {
                    $table->dropColumn('check_out_lat');
                }
                if (Schema::hasColumn('daily_attendances', 'check_out_lng')) {
                    $table->dropColumn('check_out_lng');
                }
                if (Schema::hasColumn('daily_attendances', 'check_out_accuracy')) {
                    $table->dropColumn('check_out_accuracy');
                }
            });
        }
    }
};

