<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambah kolom phase completion pada tabel complaints
        if (Schema::hasTable('complaints')) {
            Schema::table('complaints', function (Blueprint $table) {
                if (! Schema::hasColumn('complaints', 'phase_1_completed_at')) {
                    $table->timestamp('phase_1_completed_at')->nullable()->after('whatsapp_message');
                }
                if (! Schema::hasColumn('complaints', 'phase_2_completed_at')) {
                    $table->timestamp('phase_2_completed_at')->nullable()->after('phase_1_completed_at');
                }
            });

            // Ubah tipe kolom status jadi string agar mendukung status phase_1_completed
            $driver = DB::getDriverName();
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE complaints MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open'");
            }
        }

        // 2. Tambah kolom opm_redaman pada complaint_evidences jika belum ada
        if (Schema::hasTable('complaint_evidences')) {
            Schema::table('complaint_evidences', function (Blueprint $table) {
                if (! Schema::hasColumn('complaint_evidences', 'opm_redaman')) {
                    $table->string('opm_redaman', 20)->nullable()->after('resolution_category');
                }
            });
        }

        // 3. Buat tabel complaint_attendances untuk absensi mandiri teknisi di lapangan
        if (! Schema::hasTable('complaint_attendances')) {
            Schema::create('complaint_attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('complaint_id')->constrained('complaints')->onDelete('cascade');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

                $table->string('selfie_photo_path');
                $table->decimal('latitude', 10, 8);
                $table->decimal('longitude', 11, 8);
                $table->decimal('accuracy', 8, 2)->nullable();
                $table->decimal('distance_meters', 8, 2)->nullable();
                $table->boolean('is_within_radius')->default(true);
                $table->timestamp('clocked_at')->useCurrent();
                $table->timestamps();

                $table->unique(['complaint_id', 'user_id'], 'uniq_complaint_tech_attendance');
                $table->index('complaint_id');
                $table->index('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_attendances');

        if (Schema::hasTable('complaint_evidences') && Schema::hasColumn('complaint_evidences', 'opm_redaman')) {
            Schema::table('complaint_evidences', function (Blueprint $table) {
                $table->dropColumn('opm_redaman');
            });
        }

        if (Schema::hasTable('complaints')) {
            Schema::table('complaints', function (Blueprint $table) {
                if (Schema::hasColumn('complaints', 'phase_1_completed_at')) {
                    $table->dropColumn('phase_1_completed_at');
                }
                if (Schema::hasColumn('complaints', 'phase_2_completed_at')) {
                    $table->dropColumn('phase_2_completed_at');
                }
            });
        }
    }
};
