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
        // 0. Cek ekstensi PostGIS (opsional bila PostgreSQL mendukung PostGIS)
        $hasPostGis = false;
        try {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
                $hasPostGis = true;
            }
        } catch (\Throwable) {
            $hasPostGis = false;
        }

        // 1. Tabel Server / OLT
        if (! Schema::hasTable('olts')) {
            Schema::create('olts', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('name', 150);
                $table->string('ip_address', 45)->nullable();
                $table->text('address')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('status', 30)->default('normal')->index(); // normal, disrupted, cut, maintenance
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->unsignedInteger('rev')->default(1);
                $table->string('client_uuid', 100)->nullable()->unique();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Perluas tabel ODC
        Schema::table('odcs', function (Blueprint $table) {
            if (! Schema::hasColumn('odcs', 'olt_id')) {
                $table->foreignId('olt_id')->nullable()->after('id')->constrained('olts')->nullOnDelete();
            }
            if (! Schema::hasColumn('odcs', 'status')) {
                $table->string('status', 30)->default('normal')->after('capacity_odp')->index();
            }
            if (! Schema::hasColumn('odcs', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('status');
            }
            if (! Schema::hasColumn('odcs', 'rev')) {
                $table->unsignedInteger('rev')->default(1)->after('notes');
            }
            if (! Schema::hasColumn('odcs', 'client_uuid')) {
                $table->string('client_uuid', 100)->nullable()->unique()->after('rev');
            }
        });

        // 3. Perluas tabel ODP
        Schema::table('odps', function (Blueprint $table) {
            if (! Schema::hasColumn('odps', 'status')) {
                $table->string('status', 30)->default('normal')->after('operational_status')->index();
            }
            if (! Schema::hasColumn('odps', 'needs_review')) {
                $table->boolean('needs_review')->default(false)->after('status')->index();
            }
            if (! Schema::hasColumn('odps', 'rev')) {
                $table->unsignedInteger('rev')->default(1)->after('notes');
            }
            if (! Schema::hasColumn('odps', 'client_uuid')) {
                $table->string('client_uuid', 100)->nullable()->unique()->after('rev');
            }
        });

        // 4. Tabel network_cables
        if (! Schema::hasTable('network_cables')) {
            Schema::create('network_cables', function (Blueprint $table) {
                $table->id();
                $table->string('code', 100)->nullable()->unique();
                $table->string('name', 255);
                $table->string('from_type', 50)->index(); // 'olt', 'odc', 'odp'
                $table->unsignedBigInteger('from_id')->nullable()->index();
                $table->string('from_name', 255)->nullable();
                $table->string('to_type', 50)->index(); // 'odc', 'odp', 'customer'
                $table->unsignedBigInteger('to_id')->nullable()->index();
                $table->string('to_name', 255)->nullable();
                $table->string('kind', 30)->index(); // 'olt_odc', 'odc_odp', 'odp_customer'
                $table->boolean('is_backbone')->default(false);
                $table->json('route')->nullable(); // Koordinat rute [[lon, lat], ...]
                $table->decimal('length_m', 10, 2)->default(0);
                $table->boolean('route_drawn')->default(false)->index();
                $table->string('status', 30)->default('normal')->index(); // 'normal', 'disrupted', 'cut', 'maintenance'
                $table->text('notes')->nullable();
                $table->unsignedInteger('rev')->default(1);
                $table->string('client_uuid', 100)->nullable()->unique();
                $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 5. Tabel network_status_logs
        if (! Schema::hasTable('network_status_logs')) {
            Schema::create('network_status_logs', function (Blueprint $table) {
                $table->id();
                $table->string('node_type', 30)->index(); // 'olt', 'odc', 'odp', 'cable'
                $table->unsignedBigInteger('node_id')->index();
                $table->string('from_status', 30)->nullable();
                $table->string('to_status', 30)->index();
                $table->text('reason')->nullable();
                $table->string('source', 30)->default('manual')->index(); // 'manual', 'kmz', 'bras'
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 6. Kolom customers.location_source
        Schema::table('customers', function (Blueprint $table) {
            if (! Schema::hasColumn('customers', 'location_source')) {
                $table->string('location_source', 30)->nullable()->default('manual')->after('longitude');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'location_source')) {
                $table->dropColumn('location_source');
            }
        });

        Schema::dropIfExists('network_status_logs');
        Schema::dropIfExists('network_cables');

        Schema::table('odps', function (Blueprint $table) {
            $cols = array_filter(['status', 'needs_review', 'rev', 'client_uuid'], fn ($c) => Schema::hasColumn('odps', $c));
            if (! empty($cols)) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('odcs', function (Blueprint $table) {
            if (Schema::hasColumn('odcs', 'olt_id')) {
                $table->dropForeign(['olt_id']);
            }
            $cols = array_filter(['olt_id', 'status', 'is_active', 'rev', 'client_uuid'], fn ($c) => Schema::hasColumn('odcs', $c));
            if (! empty($cols)) {
                $table->dropColumn($cols);
            }
        });

        Schema::dropIfExists('olts');
    }
};
