<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Foundation Tahap 1 (PRD Final v1.2).
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        // 1. Tabel sla_settings (Pengaturan SLA Operasional per Prioritas)
        if (! Schema::hasTable('sla_settings')) {
            Schema::create('sla_settings', function (Blueprint $table) {
                $table->id();
                $table->string('priority', 30)->unique(); // 'critical', 'high', 'medium'
                $table->unsignedInteger('resolution_hours'); // 3, 6, 24
                $table->unsignedInteger('resolution_minutes'); // 180, 360, 1440
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 2. Tabel holidays (Hari Libur Nasional untuk Perhitungan Jendela SLA)
        if (! Schema::hasTable('holidays')) {
            Schema::create('holidays', function (Blueprint $table) {
                $table->id();
                $table->string('name', 150);
                $table->date('holiday_date')->unique();
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        // 3. Tabel pause_reasons (5 Alasan Baku Pause SLA oleh Admin/NOC)
        if (! Schema::hasTable('pause_reasons')) {
            Schema::create('pause_reasons', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('reason', 255);
                $table->boolean('requires_photo')->default(true);
                $table->boolean('is_active')->default(true);
                $table->integer('order_index')->default(0);
                $table->timestamps();
            });
        }

        // 4. Tabel complaint_types (Master Jenis Gangguan Tiket)
        if (! Schema::hasTable('complaint_types')) {
            Schema::create('complaint_types', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100)->unique();
                $table->text('description')->nullable();
                $table->string('default_priority', 30)->default('medium'); // 'critical', 'high', 'medium'
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 5. Tabel odp_port_history (Audit Trail Pemakaian & Status Held 30 Hari Port ODP)
        if (! Schema::hasTable('odp_port_history')) {
            Schema::create('odp_port_history', function (Blueprint $table) {
                $table->id();
                $table->foreignId('odp_id')->constrained('odps')->cascadeOnDelete();
                $table->unsignedSmallInteger('port_number');
                $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
                $table->string('action', 30); // 'allocated', 'held', 'released', 'swapped'
                $table->timestamp('held_until')->nullable();
                $table->timestamp('released_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['odp_id', 'port_number']);
                $table->index('customer_id');
            });
        }

        // 6. Perluasan office_locations (IP Wi-Fi Sah & Penanda Gangguan Sementara)
        if (Schema::hasTable('office_locations')) {
            Schema::table('office_locations', function (Blueprint $table) {
                if (! Schema::hasColumn('office_locations', 'valid_wifi_ips')) {
                    $table->text('valid_wifi_ips')->nullable()->after('radius_meters');
                }
                if (! Schema::hasColumn('office_locations', 'wifi_incident_active')) {
                    $table->boolean('wifi_incident_active')->default(false)->after('valid_wifi_ips');
                }
                if (! Schema::hasColumn('office_locations', 'wifi_incident_at')) {
                    $table->timestamp('wifi_incident_at')->nullable()->after('wifi_incident_active');
                }
                if (! Schema::hasColumn('office_locations', 'wifi_incident_note')) {
                    $table->text('wifi_incident_note')->nullable()->after('wifi_incident_at');
                }
            });
        }

        // 7. Perluasan users (2FA TOTP Settings)
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'two_factor_secret')) {
                    $table->text('two_factor_secret')->nullable()->after('password');
                }
                if (! Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                    $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
                }
                if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                    $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
                }
            });
        }

        // 8. Perluasan customers (debt_amount, billing_cycle_day, dan active_port_key Generated Column)
        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                if (! Schema::hasColumn('customers', 'debt_amount')) {
                    $table->decimal('debt_amount', 12, 2)->default(0)->after('debt');
                }
                if (! Schema::hasColumn('customers', 'billing_cycle_day')) {
                    $table->unsignedTinyInteger('billing_cycle_day')->default(1)->after('debt_amount');
                }
            });

            // Sinkronkan data debt lama ke debt_amount
            DB::statement("UPDATE customers SET debt_amount = debt WHERE debt_amount = 0 AND debt > 0");

            // Database-agnostic Generated Column untuk port ODP unik (hanya baris active, suspended, held yang bernilai non-null)
            if (! Schema::hasColumn('customers', 'active_port_key')) {
                if ($driver === 'mysql') {
                    DB::statement("ALTER TABLE customers ADD COLUMN active_port_key VARCHAR(64) GENERATED ALWAYS AS (
                        IF(deleted_at IS NULL AND status IN ('active','suspended','held') AND odp_id IS NOT NULL AND odp_port IS NOT NULL,
                           CONCAT(odp_id, ':', odp_port),
                           NULL)
                    ) STORED");
                } elseif ($driver === 'pgsql') {
                    DB::statement("ALTER TABLE customers ADD COLUMN active_port_key VARCHAR(64) GENERATED ALWAYS AS (
                        CASE WHEN deleted_at IS NULL AND status IN ('active','suspended','held') AND odp_id IS NOT NULL AND odp_port IS NOT NULL
                             THEN (odp_id::text || ':' || odp_port::text)
                             ELSE NULL
                        END
                    ) STORED");
                } else {
                    // SQLite fallback
                    DB::statement("ALTER TABLE customers ADD COLUMN active_port_key VARCHAR(64) GENERATED ALWAYS AS (
                        CASE WHEN deleted_at IS NULL AND status IN ('active','suspended','held') AND odp_id IS NOT NULL AND odp_port IS NOT NULL
                             THEN (odp_id || ':' || odp_port)
                             ELSE NULL
                        END
                    ) STORED");
                }

                // Tambahkan indeks unik database-agnostic pada active_port_key
                try {
                    DB::statement("CREATE UNIQUE INDEX customers_odp_port_active_unique ON customers (active_port_key)");
                } catch (\Throwable $e) {
                    // Hindari duplikasi jika sudah dibuat
                }
            }
        }

        // 9. Perluasan tasks (softDeletes, sla_target_minutes, pause_reason_id, total_paused_minutes)
        if (Schema::hasTable('tasks')) {
            Schema::table('tasks', function (Blueprint $table) {
                if (! Schema::hasColumn('tasks', 'deleted_at')) {
                    $table->softDeletes();
                }
                if (! Schema::hasColumn('tasks', 'sla_target_minutes')) {
                    $table->unsignedInteger('sla_target_minutes')->default(1440)->after('response_deadline_at'); // 24 jam operasional
                }
                if (! Schema::hasColumn('tasks', 'pause_reason_id')) {
                    $table->foreignId('pause_reason_id')->nullable()->after('sla_target_minutes')->constrained('pause_reasons')->nullOnDelete();
                }
                if (! Schema::hasColumn('tasks', 'paused_at')) {
                    $table->timestamp('paused_at')->nullable()->after('pause_reason_id');
                }
                if (! Schema::hasColumn('tasks', 'total_paused_minutes')) {
                    $table->unsignedInteger('total_paused_minutes')->default(0)->after('paused_at');
                }
            });
        }

        // 10. Perluasan complaints (softDeletes, complaint_type_id, sla_target_minutes, pause & reopen columns)
        if (Schema::hasTable('complaints')) {
            Schema::table('complaints', function (Blueprint $table) {
                if (! Schema::hasColumn('complaints', 'deleted_at')) {
                    $table->softDeletes();
                }
                if (! Schema::hasColumn('complaints', 'complaint_type_id')) {
                    $table->foreignId('complaint_type_id')->nullable()->after('category')->constrained('complaint_types')->nullOnDelete();
                }
                if (! Schema::hasColumn('complaints', 'sla_target_minutes')) {
                    $table->unsignedInteger('sla_target_minutes')->nullable()->after('priority');
                }
                if (! Schema::hasColumn('complaints', 'pause_reason_id')) {
                    $table->foreignId('pause_reason_id')->nullable()->after('sla_paused_seconds')->constrained('pause_reasons')->nullOnDelete();
                }
                if (! Schema::hasColumn('complaints', 'pause_photo_path')) {
                    $table->string('pause_photo_path', 255)->nullable()->after('pause_reason_id');
                }
                if (! Schema::hasColumn('complaints', 'pause_lat')) {
                    $table->decimal('pause_lat', 10, 7)->nullable()->after('pause_photo_path');
                }
                if (! Schema::hasColumn('complaints', 'pause_lng')) {
                    $table->decimal('pause_lng', 10, 7)->nullable()->after('pause_lat');
                }
                if (! Schema::hasColumn('complaints', 'reopened_at')) {
                    $table->timestamp('reopened_at')->nullable()->after('closed_at');
                }
                if (! Schema::hasColumn('complaints', 'reopened_by_id')) {
                    $table->foreignId('reopened_by_id')->nullable()->after('reopened_at')->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('complaints', 'reopen_count')) {
                    $table->unsignedInteger('reopen_count')->default(0)->after('reopened_by_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if (Schema::hasTable('complaints')) {
            Schema::table('complaints', function (Blueprint $table) {
                if (Schema::hasColumn('complaints', 'complaint_type_id')) {
                    $table->dropForeign(['complaint_type_id']);
                }
                if (Schema::hasColumn('complaints', 'pause_reason_id')) {
                    $table->dropForeign(['pause_reason_id']);
                }
                if (Schema::hasColumn('complaints', 'reopened_by_id')) {
                    $table->dropForeign(['reopened_by_id']);
                }
                $table->dropColumn([
                    'deleted_at',
                    'complaint_type_id',
                    'sla_target_minutes',
                    'pause_reason_id',
                    'pause_photo_path',
                    'pause_lat',
                    'pause_lng',
                    'reopened_at',
                    'reopened_by_id',
                    'reopen_count',
                ]);
            });
        }

        if (Schema::hasTable('tasks')) {
            Schema::table('tasks', function (Blueprint $table) {
                if (Schema::hasColumn('tasks', 'pause_reason_id')) {
                    $table->dropForeign(['pause_reason_id']);
                }
                $table->dropColumn([
                    'deleted_at',
                    'sla_target_minutes',
                    'pause_reason_id',
                    'paused_at',
                    'total_paused_minutes',
                ]);
            });
        }

        if (Schema::hasTable('customers')) {
            try {
                DB::statement("DROP INDEX customers_odp_port_active_unique ON customers");
            } catch (\Throwable) {}

            Schema::table('customers', function (Blueprint $table) {
                if (Schema::hasColumn('customers', 'active_port_key')) {
                    $table->dropColumn('active_port_key');
                }
                if (Schema::hasColumn('customers', 'debt_amount')) {
                    $table->dropColumn('debt_amount');
                }
                if (Schema::hasColumn('customers', 'billing_cycle_day')) {
                    $table->dropColumn('billing_cycle_day');
                }
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn([
                    'two_factor_secret',
                    'two_factor_recovery_codes',
                    'two_factor_confirmed_at',
                ]);
            });
        }

        if (Schema::hasTable('office_locations')) {
            Schema::table('office_locations', function (Blueprint $table) {
                $table->dropColumn([
                    'valid_wifi_ips',
                    'wifi_incident_active',
                    'wifi_incident_at',
                    'wifi_incident_note',
                ]);
            });
        }

        Schema::dropIfExists('odp_port_history');
        Schema::dropIfExists('complaint_types');
        Schema::dropIfExists('pause_reasons');
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('sla_settings');
    }
};

