<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SuperadminRestoreCommand extends Command
{
    /**
     * The name and signature of the console command.
     * Email parameter is explicit and strictly required with no code defaults.
     *
     * @var string
     */
    protected $signature = 'superadmin:restore {email : Alamat email eksplisit akun pengguna Superadmin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pulihkan status akun pengguna menjadi Superadmin secara idempoten dan bersihkan role non-superadmin';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));

        if (empty($email)) {
            $this->error('Parameter email wajib disertakan secara eksplisit.');
            return Command::FAILURE;
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("Gagal: Pengguna dengan email '{$email}' tidak ditemukan dalam basis data.");
            return Command::FAILURE;
        }

        $this->info("Menemukan pengguna ID #{$user->id} ({$user->name}) dengan email: {$user->email}");

        // 1. Tampilkan role sebelum
        $rolesBefore = $user->getRoleNames()->toArray();
        $this->line('Role sebelum: ' . (empty($rolesBefore) ? '(tidak memiliki role)' : implode(', ', $rolesBefore)));

        // 2. Pastikan role "superadmin" (dan alias "Superadmin") ada dengan guard 'web'
        $superadminRole = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $superadminTitleRole = Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);

        // Sinkronkan seluruh permissions ke role superadmin
        $allPermissions = Permission::all();
        $superadminRole->givePermissionTo($allPermissions);
        $superadminTitleRole->givePermissionTo($allPermissions);

        // 3. Tetapkan pengguna HANYA ke role superadmin (sinkronkan semua sumber, buang role sales / lainnya)
        $user->syncRoles([$superadminRole, $superadminTitleRole]);

        // Jika ada kolom fisik users.role di masa depan, sinkronkan juga
        if (Schema::hasColumn('users', 'role')) {
            $user->setAttribute('role', 'superadmin');
        }

        // 4. Pastikan status akun aktif
        if ($user->status !== 'active') {
            $user->status = 'active';
            $this->info('Status akun sebelumnya non-aktif, telah dipulihkan menjadi aktif.');
        }

        $user->save();

        // 5. Reset cache izin spatie
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 6. Tampilkan role sesudah
        $rolesAfter = $user->fresh()->getRoleNames()->toArray();
        $this->info('Role sesudah: ' . implode(', ', $rolesAfter));

        $this->info("✓ Berhasil memulihkan pengguna '{$user->email}' menjadi Superadmin aktif dengan seluruh hak akses.");

        return Command::SUCCESS;
    }
}
