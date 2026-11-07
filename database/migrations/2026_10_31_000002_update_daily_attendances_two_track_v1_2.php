<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('daily_attendances')) {
            $driver = DB::getDriverName();

            // Ubah tipe kolom status menjadi VARCHAR(30) agar mendukung 'field_checkin' tanpa batasan enum database
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE daily_attendances MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'alpa'");
            } elseif ($driver === 'pgsql') {
                DB::statement("ALTER TABLE daily_attendances ALTER COLUMN status TYPE VARCHAR(30)");
            }

            Schema::table('daily_attendances', function (Blueprint $table) {
                if (! Schema::hasColumn('daily_attendances', 'track')) {
                    $table->string('track', 20)->default('office')->after('work_date'); // office, field
                }
                if (! Schema::hasColumn('daily_attendances', 'client_ip')) {
                    $table->string('client_ip', 45)->nullable()->after('device_id');
                }
                if (! Schema::hasColumn('daily_attendances', 'is_suspicious')) {
                    $table->boolean('is_suspicious')->default(false)->after('is_manual');
                }
                if (! Schema::hasColumn('daily_attendances', 'suspicious_reason')) {
                    $table->string('suspicious_reason')->nullable()->after('is_suspicious');
                }
                if (! Schema::hasColumn('daily_attendances', 'review_status')) {
                    $table->string('review_status', 30)->nullable()->after('suspicious_reason'); // pending_review, approved, rejected
                }
                if (! Schema::hasColumn('daily_attendances', 'reviewed_by_id')) {
                    $table->foreignId('reviewed_by_id')->nullable()->after('review_status')->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('daily_attendances', 'reviewed_at')) {
                    $table->timestamp('reviewed_at')->nullable()->after('reviewed_by_id');
                }
                if (! Schema::hasColumn('daily_attendances', 'review_notes')) {
                    $table->text('review_notes')->nullable()->after('reviewed_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('daily_attendances')) {
            Schema::table('daily_attendances', function (Blueprint $table) {
                if (Schema::hasColumn('daily_attendances', 'reviewed_by_id')) {
                    $table->dropConstrainedForeignId('reviewed_by_id');
                }
                $table->dropColumn(array_filter([
                    Schema::hasColumn('daily_attendances', 'track') ? 'track' : null,
                    Schema::hasColumn('daily_attendances', 'client_ip') ? 'client_ip' : null,
                    Schema::hasColumn('daily_attendances', 'is_suspicious') ? 'is_suspicious' : null,
                    Schema::hasColumn('daily_attendances', 'suspicious_reason') ? 'suspicious_reason' : null,
                    Schema::hasColumn('daily_attendances', 'review_status') ? 'review_status' : null,
                    Schema::hasColumn('daily_attendances', 'reviewed_at') ? 'reviewed_at' : null,
                    Schema::hasColumn('daily_attendances', 'review_notes') ? 'review_notes' : null,
                ]));
            });
        }
    }
};

