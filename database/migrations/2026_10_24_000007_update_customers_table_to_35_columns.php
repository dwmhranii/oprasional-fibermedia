<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('external_ref', 100)->nullable();          // ID di sistem billing lama (jika ada)
            $table->text('nik')->nullable();                          // terenkripsi lewat cast 'encrypted'
            $table->string('nik_hash', 64)->nullable()->index();      // HMAC untuk cek duplikat tanpa membuka NIK
            $table->string('email')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone_normalized', 20)->nullable()->index();

            $table->string('service_type', 20)->default('pppoe');    // pppoe, hotspot, static
            $table->foreignId('bras_id')->nullable()->constrained('bras_devices')->nullOnDelete();
            $table->string('collector', 100)->nullable();
            $table->string('username', 100)->nullable();
            $table->text('password')->nullable();                     // terenkripsi lewat cast 'encrypted'

            $table->foreignId('package_id')->nullable()->constrained('packages')->nullOnDelete();
            $table->decimal('monthly_price', 12, 2)->default(0);
            $table->string('local_address', 45)->nullable();
            $table->string('remote_address', 45)->nullable();
            $table->string('parent_queue', 100)->nullable();
            $table->string('rate_limit', 50)->nullable();

            $table->date('subscribed_at')->nullable();
            $table->date('expires_at')->nullable();

            $table->string('onu_index', 50)->nullable();
            $table->foreignId('odp_id')->nullable()->constrained('odps')->nullOnDelete();
            $table->unsignedSmallInteger('odp_port')->nullable();

            $table->decimal('debt', 14, 2)->default(0);               // diisi manual sampai modul tagihan ada
            $table->string('wilayah', 100)->nullable()->index();

            $table->foreignId('installed_by_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('installed_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('sales_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('notes')->nullable();
            $table->softDeletes();

            $table->index(['status', 'expires_at']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->text('address')->change();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE customers ADD CONSTRAINT customers_service_type_check CHECK (service_type IN ('pppoe','hotspot','static'))");
            DB::statement('CREATE UNIQUE INDEX customers_username_unique ON customers (username) WHERE username IS NOT NULL AND deleted_at IS NULL');
            // Satu port ODP hanya boleh dipakai satu pelanggan yang belum berhenti.
            DB::statement("CREATE UNIQUE INDEX customers_odp_port_unique ON customers (odp_id, odp_port) WHERE odp_id IS NOT NULL AND odp_port IS NOT NULL AND deleted_at IS NULL AND status <> 'terminated'");
            // Pencarian nama dan nomor telepon (pg_trgm sudah diaktifkan di migrasi extensions).
            DB::statement('CREATE INDEX customers_name_trgm ON customers USING gin (name gin_trgm_ops)');
            DB::statement('CREATE INDEX customers_phone_trgm ON customers USING gin (phone gin_trgm_ops)');
        } else {
            Schema::table('customers', function (Blueprint $table) {
                $table->unique('username');
            });
        }

        $this->backfill();
    }

    /**
     * Mengisi kolom baru dari kolom lama (package, odp_code, phone).
     * Kolom lama dibiarkan sampai kode yang memakainya selesai dipindah.
     */
    private function backfill(): void
    {
        // ODP: satu baris odps per odp_code yang sudah ada.
        $codes = DB::table('customers')->whereNotNull('odp_code')->distinct()->pluck('odp_code');
        foreach ($codes as $code) {
            $odpId = DB::table('odps')->where('code', $code)->value('id')
                ?? DB::table('odps')->insertGetId([
                    'code' => $code,
                    'name' => $code,
                    'port_capacity' => 8,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            DB::table('customers')->where('odp_code', $code)->update(['odp_id' => $odpId]);
        }

        // Paket: cocokkan lewat nama paket.
        foreach (DB::table('packages')->get(['id', 'name', 'price']) as $package) {
            DB::table('customers')
                ->whereRaw('LOWER(package) = ?', [mb_strtolower($package->name)])
                ->update(['package_id' => $package->id, 'monthly_price' => $package->price]);
        }

        // Nomor telepon ternormalisasi (62xxxxxxxxxx) untuk cek duplikat.
        DB::table('customers')->select(['id', 'phone'])->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $row) {
                $digits = preg_replace('/\D+/', '', (string) $row->phone);
                if ($digits === '') {
                    continue;
                }
                if (str_starts_with($digits, '0')) {
                    $digits = '62'.substr($digits, 1);
                }
                DB::table('customers')->where('id', $row->id)->update(['phone_normalized' => $digits]);
            }
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS customers_phone_trgm');
            DB::statement('DROP INDEX IF EXISTS customers_name_trgm');
            DB::statement('DROP INDEX IF EXISTS customers_odp_port_unique');
            DB::statement('DROP INDEX IF EXISTS customers_username_unique');
            DB::statement('ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_service_type_check');
        }

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['status', 'expires_at']);
            $table->dropConstrainedForeignId('sales_id');
            $table->dropConstrainedForeignId('installed_task_id');
            $table->dropConstrainedForeignId('installed_by_team_id');
            $table->dropConstrainedForeignId('odp_id');
            $table->dropConstrainedForeignId('package_id');
            $table->dropConstrainedForeignId('bras_id');
            $table->dropSoftDeletes();
            $table->dropColumn([
                'external_ref', 'nik', 'nik_hash', 'email', 'latitude', 'longitude', 'phone_normalized',
                'service_type', 'collector', 'username', 'password', 'monthly_price', 'local_address',
                'remote_address', 'parent_queue', 'rate_limit', 'subscribed_at', 'expires_at', 'onu_index',
                'odp_port', 'debt', 'wilayah', 'notes',
            ]);
        });
    }
};
