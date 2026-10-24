<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            if (! Schema::hasColumn('media', 'mime')) {
                $table->string('mime', 100)->nullable()->after('size');
            }
            if (! Schema::hasColumn('media', 'selisih_jam')) {
                $table->decimal('selisih_jam', 6, 2)->nullable()->after('received_at');
            }
            if (! Schema::hasColumn('media', 'is_anomaly')) {
                $table->boolean('is_anomaly')->default(false)->after('uploaded_by_id');
            }
            if (! Schema::hasColumn('media', 'anomaly_reasons')) {
                $table->json('anomaly_reasons')->nullable()->after('is_anomaly');
            }
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn(['mime', 'selisih_jam', 'is_anomaly', 'anomaly_reasons']);
        });
    }
};
