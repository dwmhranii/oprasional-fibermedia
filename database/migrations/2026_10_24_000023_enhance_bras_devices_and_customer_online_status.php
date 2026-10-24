<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambah kredensial API & status sync pada bras_devices
        Schema::table('bras_devices', function (Blueprint $table) {
            $table->unsignedSmallInteger('api_port')->default(8728)->after('ip_address');
            $table->string('username', 100)->nullable()->after('api_port');
            $table->text('password')->nullable()->after('username');
            $table->boolean('use_ssl')->default(false)->after('password');
            $table->unsignedSmallInteger('timeout')->default(5)->after('use_ssl');
            $table->timestamp('last_synced_at')->nullable()->after('timeout');
            $table->string('last_sync_status', 30)->nullable()->after('last_synced_at'); // success, failed
            $table->text('last_sync_error')->nullable()->after('last_sync_status');
            $table->unsignedInteger('active_sessions_count')->default(0)->after('last_sync_error');
        });

        // 2. Tambah kolom petunjuk sesi online/offline pada customers (TANPA mengubah status layanan)
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('is_online')->default(false)->index()->after('status');
            $table->timestamp('last_online_at')->nullable()->after('is_online');
            $table->timestamp('last_offline_at')->nullable()->after('last_online_at');
            $table->string('current_ip_address', 45)->nullable()->after('last_offline_at');
            $table->string('current_mac_address', 45)->nullable()->after('current_ip_address');
            $table->string('session_uptime', 50)->nullable()->after('current_mac_address');
            $table->string('session_id', 100)->nullable()->after('session_uptime');
        });

        // 3. Tabel log sesi BRAS dengan source = 'bras'
        Schema::create('bras_session_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bras_device_id')->constrained('bras_devices')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('username', 100)->index();
            $table->string('event', 30)->index(); // online, offline, heartbeat
            $table->string('ip_address', 45)->nullable();
            $table->string('mac_address', 45)->nullable();
            $table->string('uptime', 50)->nullable();
            $table->string('source', 30)->default('bras')->index();
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bras_session_logs');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'is_online',
                'last_online_at',
                'last_offline_at',
                'current_ip_address',
                'current_mac_address',
                'session_uptime',
                'session_id',
            ]);
        });

        Schema::table('bras_devices', function (Blueprint $table) {
            $table->dropColumn([
                'api_port',
                'username',
                'password',
                'use_ssl',
                'timeout',
                'last_synced_at',
                'last_sync_status',
                'last_sync_error',
                'active_sessions_count',
            ]);
        });
    }
};
