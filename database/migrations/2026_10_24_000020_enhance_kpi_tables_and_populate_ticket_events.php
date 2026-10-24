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
        // 1. Perluas tabel kpi_settings
        Schema::table('kpi_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('kpi_settings', 'version')) {
                $table->unsignedInteger('version')->default(1)->after('id');
            }
            if (! Schema::hasColumn('kpi_settings', 'category')) {
                $table->string('category', 50)->default('team')->after('version'); // team, technician, sales
            }
            if (! Schema::hasColumn('kpi_settings', 'weights')) {
                $table->json('weights')->nullable()->after('value');
            }
            if (! Schema::hasColumn('kpi_settings', 'targets')) {
                $table->json('targets')->nullable()->after('weights');
            }
            if (! Schema::hasColumn('kpi_settings', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('targets');
            }
            if (! Schema::hasColumn('kpi_settings', 'read_only_until')) {
                $table->date('read_only_until')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('kpi_settings', 'notes')) {
                $table->string('notes')->nullable()->after('read_only_until');
            }
            if (! Schema::hasColumn('kpi_settings', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
            }
        });

        // 2. Perluas tabel kpi_snapshots
        Schema::table('kpi_snapshots', function (Blueprint $table) {
            if (! Schema::hasColumn('kpi_snapshots', 'settings_version')) {
                $table->unsignedInteger('settings_version')->default(1)->after('score');
            }
            if (! Schema::hasColumn('kpi_snapshots', 'is_read_only')) {
                $table->boolean('is_read_only')->default(false)->after('settings_version');
            }
        });

        // 3. Masukkan default KPI settings versi 1 jika belum ada
        $now = now();
        $defaultReadOnlyUntil = now()->addMonth()->toDateString(); // 1 bulan mode hanya-lihat

        // Setting Tim
        $teamSettingExists = DB::table('kpi_settings')->where('category', 'team')->where('is_active', true)->exists();
        if (! $teamSettingExists) {
            DB::table('kpi_settings')->insert([
                'key' => 'kpi_team_v1',
                'version' => 1,
                'category' => 'team',
                'value' => json_encode(['description' => 'Default Team KPI v1']),
                'weights' => json_encode([
                    'sla_compliance' => 0.25,     // 25% Waktu selesai vs SLA
                    'acceptance_speed' => 0.15,   // 15% Kecepatan terima
                    'productivity' => 0.15,       // 15% Tiket selesai
                    'evidence_quality' => 0.15,   // 15% Kelengkapan bukti
                    'customer_rating' => 0.15,    // 15% Rating kepuasan pelanggan
                    'attendance' => 0.15,         // 15% Kehadiran tim (hadir/tidak)
                ]),
                'targets' => json_encode([
                    'sla_target_percent' => 95.0,
                    'acceptance_target_minutes' => 15.0,
                    'monthly_tickets_target' => 30,
                    'rating_target' => 4.5,
                    'working_days_target' => 22,
                    'max_repeat_trouble_percent' => 5.0,
                ]),
                'is_active' => true,
                'read_only_until' => $defaultReadOnlyUntil,
                'notes' => 'Versi 1: Pengaturan KPI Tim Lapangan (Mode Uji Coba 1 Bulan)',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Setting Individu Teknisi
        $techSettingExists = DB::table('kpi_settings')->where('category', 'technician')->where('is_active', true)->exists();
        if (! $techSettingExists) {
            DB::table('kpi_settings')->insert([
                'key' => 'kpi_technician_v1',
                'version' => 1,
                'category' => 'technician',
                'value' => json_encode(['description' => 'Default Technician KPI v1']),
                'weights' => json_encode([
                    'sla_compliance' => 0.25,
                    'acceptance_speed' => 0.15,
                    'productivity' => 0.15,
                    'evidence_quality' => 0.15,
                    'customer_rating' => 0.15,
                    'attendance' => 0.15,
                ]),
                'targets' => json_encode([
                    'sla_target_percent' => 95.0,
                    'acceptance_target_minutes' => 15.0,
                    'monthly_tickets_target' => 15,
                    'rating_target' => 4.5,
                    'working_days_target' => 22,
                ]),
                'is_active' => true,
                'read_only_until' => $defaultReadOnlyUntil,
                'notes' => 'Versi 1: Pengaturan KPI Individu Teknisi (Mode Uji Coba 1 Bulan)',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Setting Sales (Tanpa Komisi, Kehadiran 10%)
        $salesSettingExists = DB::table('kpi_settings')->where('category', 'sales')->where('is_active', true)->exists();
        if (! $salesSettingExists) {
            DB::table('kpi_settings')->insert([
                'key' => 'kpi_sales_v1',
                'version' => 1,
                'category' => 'sales',
                'value' => json_encode(['description' => 'Default Sales KPI v1']),
                'weights' => json_encode([
                    'validation_rate' => 0.30,    // 30% Pengajuan Tervalidasi
                    'installation_rate' => 0.30,  // 30% Jadi Terpasang
                    'data_quality' => 0.30,       // 30% Kualitas Data (Tanpa Duplikat)
                    'attendance' => 0.10,         // 10% Kehadiran Sales (Tepat 10%)
                ]),
                'targets' => json_encode([
                    'monthly_submissions_target' => 10,
                    'validation_target_percent' => 80.0,
                    'installation_target_percent' => 70.0,
                    'clean_data_target_percent' => 95.0,
                    'working_days_target' => 22,
                ]),
                'is_active' => true,
                'read_only_until' => $defaultReadOnlyUntil,
                'notes' => 'Versi 1: Pengaturan KPI Sales (Kehadiran 10%, Tanpa Komisi, Mode Uji Coba 1 Bulan)',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 4. Salin data jejak dari assignment_logs ke ticket_events
        if (Schema::hasTable('assignment_logs') && Schema::hasTable('ticket_events')) {
            $assignmentLogs = DB::table('assignment_logs')->get();
            foreach ($assignmentLogs as $log) {
                $alreadyExists = DB::table('ticket_events')
                    ->where('eventable_type', $log->assignable_type)
                    ->where('eventable_id', $log->assignable_id)
                    ->where('event', $log->action)
                    ->where('occurred_at', $log->created_at)
                    ->exists();

                if (! $alreadyExists) {
                    DB::table('ticket_events')->insert([
                        'eventable_type' => $log->assignable_type,
                        'eventable_id' => $log->assignable_id,
                        'actor_id' => $log->actor_id,
                        'event' => $log->action,
                        'from_status' => null,
                        'to_status' => $log->action,
                        'payload' => json_encode([
                            'source' => 'assignment_logs',
                            'team_id' => $log->team_id,
                            'reason' => $log->reason,
                            'attempt_no' => $log->attempt_no,
                        ]),
                        'occurred_at' => $log->created_at,
                    ]);
                }
            }
        }

        // 5. Salin data jejak dari complaint_logs ke ticket_events
        if (Schema::hasTable('complaint_logs') && Schema::hasTable('ticket_events')) {
            $complaintLogs = DB::table('complaint_logs')->get();
            foreach ($complaintLogs as $cLog) {
                $alreadyExists = DB::table('ticket_events')
                    ->where('eventable_type', 'App\Models\Complaint')
                    ->where('eventable_id', $cLog->complaint_id)
                    ->where('event', $cLog->action)
                    ->where('occurred_at', $cLog->created_at)
                    ->exists();

                if (! $alreadyExists) {
                    DB::table('ticket_events')->insert([
                        'eventable_type' => 'App\Models\Complaint',
                        'eventable_id' => $cLog->complaint_id,
                        'actor_id' => $cLog->actor_id,
                        'event' => $cLog->action,
                        'from_status' => $cLog->from_status,
                        'to_status' => $cLog->to_status,
                        'payload' => json_encode([
                            'source' => 'complaint_logs',
                            'actor_role' => $cLog->actor_role,
                            'notes' => $cLog->notes,
                        ]),
                        'occurred_at' => $cLog->created_at,
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpi_snapshots', function (Blueprint $table) {
            if (Schema::hasColumn('kpi_snapshots', 'settings_version')) {
                $table->dropColumn('settings_version');
            }
            if (Schema::hasColumn('kpi_snapshots', 'is_read_only')) {
                $table->dropColumn('is_read_only');
            }
        });

        Schema::table('kpi_settings', function (Blueprint $table) {
            if (Schema::hasColumn('kpi_settings', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }
            if (Schema::hasColumn('kpi_settings', 'notes')) {
                $table->dropColumn('notes');
            }
            if (Schema::hasColumn('kpi_settings', 'read_only_until')) {
                $table->dropColumn('read_only_until');
            }
            if (Schema::hasColumn('kpi_settings', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('kpi_settings', 'targets')) {
                $table->dropColumn('targets');
            }
            if (Schema::hasColumn('kpi_settings', 'weights')) {
                $table->dropColumn('weights');
            }
            if (Schema::hasColumn('kpi_settings', 'category')) {
                $table->dropColumn('category');
            }
            if (Schema::hasColumn('kpi_settings', 'version')) {
                $table->dropColumn('version');
            }
        });
    }
};
