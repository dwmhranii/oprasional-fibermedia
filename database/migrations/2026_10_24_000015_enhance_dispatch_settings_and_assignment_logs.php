<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enhance dispatch_settings with specific named columns if not present
        if (Schema::hasTable('dispatch_settings')) {
            Schema::table('dispatch_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('dispatch_settings', 'min_members_present')) {
                    $table->unsignedInteger('min_members_present')->default(1);
                }
                if (! Schema::hasColumn('dispatch_settings', 'accept_timeout_menit')) {
                    $table->unsignedInteger('accept_timeout_menit')->default(15);
                }
                if (! Schema::hasColumn('dispatch_settings', 'max_oper')) {
                    $table->unsignedInteger('max_oper')->default(3);
                }
            });

            // Ensure default row exists
            if (DB::table('dispatch_settings')->where('key', 'default')->doesntExist()) {
                DB::table('dispatch_settings')->insert([
                    'ticket_type' => null,
                    'key' => 'default',
                    'value' => json_encode(['default' => true]),
                    'min_members_present' => 1,
                    'accept_timeout_menit' => 15,
                    'max_oper' => 3,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 2. Enhance assignment_logs: ensure team_id is nullable (for action=pending) and columns exist
        if (Schema::hasTable('assignment_logs')) {
            Schema::table('assignment_logs', function (Blueprint $table) {
                // SQLite doesn't support changing column to nullable directly in older versions,
                // but Laravel's Schema builder handles it or we can add ticket_type/ticket_id
                if (! Schema::hasColumn('assignment_logs', 'ticket_type')) {
                    $table->string('ticket_type')->nullable()->after('assignable_id');
                }
                if (! Schema::hasColumn('assignment_logs', 'ticket_id')) {
                    $table->unsignedBigInteger('ticket_id')->nullable()->after('ticket_type');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('dispatch_settings')) {
            Schema::table('dispatch_settings', function (Blueprint $table) {
                if (Schema::hasColumn('dispatch_settings', 'min_members_present')) {
                    $table->dropColumn(['min_members_present', 'accept_timeout_menit', 'max_oper']);
                }
            });
        }

        if (Schema::hasTable('assignment_logs')) {
            Schema::table('assignment_logs', function (Blueprint $table) {
                if (Schema::hasColumn('assignment_logs', 'ticket_type')) {
                    $table->dropColumn(['ticket_type', 'ticket_id']);
                }
            });
        }
    }
};
