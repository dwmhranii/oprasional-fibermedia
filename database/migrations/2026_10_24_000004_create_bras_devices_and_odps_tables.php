<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Register BRAS dicatat manual dulu; kolom "Server" pada data pelanggan menunjuk ke sini.
        Schema::create('bras_devices', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('ip_address', 45)->nullable();
            $table->string('location', 150)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Master ODP/tiang minimal. Peta dan manajemen port menyusul di fase berikutnya.
        Schema::create('odps', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('port_capacity')->default(8);
            $table->string('wilayah', 100)->nullable()->index();
            $table->text('notes')->nullable(); // "Keterangan ODP"
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odps');
        Schema::dropIfExists('bras_devices');
    }
};
