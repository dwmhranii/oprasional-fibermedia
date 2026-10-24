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
        // 1. Tabel ODC (Optical Distribution Cabinet)
        if (! Schema::hasTable('odcs')) {
            Schema::create('odcs', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('name', 150);
                $table->text('address')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->unsignedSmallInteger('capacity_odp')->default(24);
                $table->string('operational_status', 30)->default('normal')->index(); // normal, disrupted, cut
                $table->string('wilayah', 100)->nullable()->index();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Tambah kolom odc_id dan operational_status ke tabel odps
        Schema::table('odps', function (Blueprint $table) {
            if (! Schema::hasColumn('odps', 'odc_id')) {
                $table->foreignId('odc_id')->nullable()->after('id')->constrained('odcs')->nullOnDelete();
            }
            if (! Schema::hasColumn('odps', 'operational_status')) {
                $table->string('operational_status', 30)->default('normal')->after('is_approved')->index(); // normal, disrupted, cut
            }
        });

        // 3. Tambah kolom ke cable_tracks untuk relasi jaringan dan status gangguan
        Schema::table('cable_tracks', function (Blueprint $table) {
            if (! Schema::hasColumn('cable_tracks', 'operational_status')) {
                $table->string('operational_status', 30)->default('normal')->after('status')->index(); // normal, disrupted, cut
            }
            if (! Schema::hasColumn('cable_tracks', 'connected_odc_id')) {
                $table->foreignId('connected_odc_id')->nullable()->constrained('odcs')->nullOnDelete();
            }
            if (! Schema::hasColumn('cable_tracks', 'connected_odp_id')) {
                $table->foreignId('connected_odp_id')->nullable()->constrained('odps')->nullOnDelete();
            }
            if (! Schema::hasColumn('cable_tracks', 'downstream_odp_ids')) {
                $table->json('downstream_odp_ids')->nullable(); // Array ID ODP terdampak bila kabel putus
            }
        });

        // 4. Tambah penanda gangguan massal pada tabel complaints
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'is_mass_outage')) {
                $table->boolean('is_mass_outage')->default(false)->after('priority')->index();
            }
            if (! Schema::hasColumn('complaints', 'affected_element_type')) {
                $table->string('affected_element_type', 50)->nullable()->after('is_mass_outage'); // odc, odp, cable_track
            }
            if (! Schema::hasColumn('complaints', 'affected_element_id')) {
                $table->unsignedBigInteger('affected_element_id')->nullable()->after('affected_element_type');
            }
        });

        // 5. Tabel pivot pelanggan terdampak pada tiket gangguan massal (complaint_affected_customers)
        if (! Schema::hasTable('complaint_affected_customers')) {
            Schema::create('complaint_affected_customers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
                $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
                $table->foreignId('odp_id')->nullable()->constrained('odps')->nullOnDelete();
                $table->timestamps();

                $table->unique(['complaint_id', 'customer_id'], 'uniq_mass_complaint_customer');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaint_affected_customers');

        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'is_mass_outage')) {
                $table->dropColumn(['is_mass_outage', 'affected_element_type', 'affected_element_id']);
            }
        });

        Schema::table('cable_tracks', function (Blueprint $table) {
            if (Schema::hasColumn('cable_tracks', 'connected_odc_id')) {
                $table->dropForeign(['connected_odc_id']);
                $table->dropColumn('connected_odc_id');
            }
            if (Schema::hasColumn('cable_tracks', 'connected_odp_id')) {
                $table->dropForeign(['connected_odp_id']);
                $table->dropColumn('connected_odp_id');
            }
            if (Schema::hasColumn('cable_tracks', 'operational_status')) {
                $table->dropColumn(['operational_status', 'downstream_odp_ids']);
            }
        });

        Schema::table('odps', function (Blueprint $table) {
            if (Schema::hasColumn('odps', 'odc_id')) {
                $table->dropForeign(['odc_id']);
                $table->dropColumn('odc_id');
            }
            if (Schema::hasColumn('odps', 'operational_status')) {
                $table->dropColumn('operational_status');
            }
        });

        Schema::dropIfExists('odcs');
    }
};
