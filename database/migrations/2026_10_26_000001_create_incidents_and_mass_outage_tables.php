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
        // 1. Tabel incidents (Gangguan Massal Jaringan)
        if (! Schema::hasTable('incidents')) {
            Schema::create('incidents', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('node_type', 30)->index(); // 'olt', 'odc', 'odp', 'cable'
                $table->unsignedBigInteger('node_id')->index();
                $table->string('status', 30)->default('open')->index(); // 'open', 'resolved', 'merged'
                $table->string('severity', 30)->default('disrupted')->index(); // 'disrupted', 'cut'
                $table->timestamp('started_at')->nullable();
                $table->timestamp('detected_at')->useCurrent();
                $table->timestamp('resolved_at')->nullable();
                $table->foreignId('merged_into_id')->nullable()->constrained('incidents')->nullOnDelete();
                $table->string('source', 30)->default('manual')->index(); // 'manual', 'bras_suggestion'
                $table->text('summary')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['node_type', 'node_id']);
            });

            // Indeks unik parsial: satu incident berstatus open per (node_type, node_id)
            try {
                $driver = DB::getDriverName();
                if (in_array($driver, ['pgsql', 'sqlite'])) {
                    DB::statement("CREATE UNIQUE INDEX uniq_open_incident_node ON incidents (node_type, node_id) WHERE status = 'open'");
                }
            } catch (\Throwable) {
                // Fallback jika database tidak mendukung partial index
            }
        }

        // 2. Tabel pivot incident_customers
        if (! Schema::hasTable('incident_customers')) {
            Schema::create('incident_customers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
                $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
                $table->string('state', 30)->default('affected')->index(); // 'affected', 'restored', 'split'
                $table->timestamp('first_seen_at')->useCurrent();
                $table->timestamp('restored_at')->nullable();
                $table->foreignId('split_complaint_id')->nullable()->constrained('complaints')->nullOnDelete();
                $table->timestamps();

                $table->unique(['incident_id', 'customer_id'], 'uniq_incident_customer');
            });
        }

        // 3. Perluas tabel complaints
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'incident_id')) {
                $table->foreignId('incident_id')->nullable()->after('id')->constrained('incidents')->nullOnDelete();
                $table->unique('incident_id', 'uniq_complaint_incident');
            }
            if (! Schema::hasColumn('complaints', 'is_mass')) {
                $table->boolean('is_mass')->default(false)->after('priority')->index();
            }
        });

        // 4. Perluas tabel dispatch_settings
        if (Schema::hasTable('dispatch_settings')) {
            Schema::table('dispatch_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('dispatch_settings', 'incident_auto_create')) {
                    $table->boolean('incident_auto_create')->default(false);
                }
                if (! Schema::hasColumn('dispatch_settings', 'incident_priority')) {
                    $table->string('incident_priority', 30)->default('high');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('dispatch_settings')) {
            Schema::table('dispatch_settings', function (Blueprint $table) {
                if (Schema::hasColumn('dispatch_settings', 'incident_auto_create')) {
                    $table->dropColumn(['incident_auto_create', 'incident_priority']);
                }
            });
        }

        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'incident_id')) {
                $table->dropForeign(['incident_id']);
                $table->dropUnique('uniq_complaint_incident');
                $table->dropColumn('incident_id');
            }
            if (Schema::hasColumn('complaints', 'is_mass')) {
                $table->dropColumn('is_mass');
            }
        });

        Schema::dropIfExists('incident_customers');

        try {
            $driver = DB::getDriverName();
            if (in_array($driver, ['pgsql', 'sqlite'])) {
                DB::statement('DROP INDEX IF EXISTS uniq_open_incident_node');
            }
        } catch (\Throwable) {
        }

        Schema::dropIfExists('incidents');
    }
};
