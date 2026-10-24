<?php

namespace Database\Seeders;

use App\Models\Team;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class MenuAndRolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Master Permissions List (Menu & Actions)
        $permissions = [
            // Menu Permissions (Visibility & Access)
            'menu.dashboard' => 'Akses Menu Dashboard & Analitik',
            'menu.sales_submissions' => 'Akses Menu Pendaftaran Sales',
            'menu.submissions_validation' => 'Akses Menu Validasi Berkas Admin',
            'menu.provisionings' => 'Akses Menu Provisioning & OLT',
            'menu.tasks' => 'Akses Menu Tugas Teknisi',
            'menu.complaints' => 'Akses Menu Pengaduan & Troubleshooting',
            'menu.customers' => 'Akses Menu Data Pelanggan',
            'menu.packages' => 'Akses Menu Paket & Promo',
            'menu.reports' => 'Akses Menu Laporan & Audit Logs',
            'menu.sla' => 'Akses Menu SLA Breaches',
            'menu.settings' => 'Akses Menu Panel Superadmin',

            // Action Permissions - Dashboard & Analytics
            'view_analytics' => 'Melihat Analisis & KPI',

            // Action Permissions - Submissions
            'create_submissions' => 'Membuat Pengajuan Registrasi',
            'edit_submissions' => 'Mengedit Draft Pengajuan',
            'view_own_submissions' => 'Melihat Pengajuan Milik Sendiri',
            'view_any_submissions' => 'Melihat Semua Pengajuan Sales',
            'validate_submissions' => 'Memvalidasi Berkas Pengajuan',
            'approve_submissions' => 'Menyetujui Berkas Pengajuan',
            'reject_submissions' => 'Menolak Berkas Pengajuan',

            // Action Permissions - Provisioning
            'manage_provisioning' => 'Mengelola & Memproses Provisioning',
            'provisioning.retry' => 'Retry Gagal Provisioning',

            // Action Permissions - Tasks / Pemasangan
            'assign_tasks' => 'Menugaskan Tugas Pemasangan',
            'update_task_status' => 'Mengubah Status Pemasangan',
            'view_assigned_tasks' => 'Melihat Tugas Lapangan yang Ditugaskan',

            // Action Permissions - Complaints / Pengaduan
            'complaints.view' => 'Melihat Daftar Pengaduan',
            'complaints.create' => 'Membuat Tiket Pengaduan Baru',
            'complaints.assign' => 'Menugaskan Teknisi Pengaduan',
            'complaints.resolve_remote' => 'Selesai Remote Tanpa Teknisi',
            'complaints.verify_close' => 'Verifikasi Bukti & Tutup Tiket',
            'complaints.return' => 'Mengembalikan Tiket ke Teknisi',
            'complaints.cancel' => 'Membatalkan Tiket Pengaduan',
            'complaints.reopen' => 'Membuka Kembali Tiket Pengaduan',

            // Action Permissions - Pelanggan & Paket
            'customers.manage' => 'Mengelola Data Pelanggan',
            'packages.manage' => 'Mengelola Paket & Promo',

            // Action Permissions - Laporan & Audit
            'view_audit_logs' => 'Melihat Riwayat Audit Log',
            'reports.export' => 'Mengekspor Laporan Excel/PDF',

            // Action Permissions - Superadmin System Settings
            'manage_users' => 'Mengelola Pengguna & Akun',
            'manage_roles' => 'Mengelola Role & Hak Akses',
            'manage_teams' => 'Mengelola Struktur Team',
        ];

        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web']
            );
        }

        // 2. Roles Setup & Default Assignment
        $roleSuperAdmin = Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        $roleSuperAdmin->syncPermissions(Permission::all());

        $roleAdmin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $roleAdmin->syncPermissions([
            'menu.dashboard',
            'menu.submissions_validation',
            'menu.provisionings',
            'menu.tasks',
            'menu.complaints',
            'menu.customers',
            'menu.packages',
            'menu.reports',
            'menu.sla',
            'view_analytics',
            'view_any_submissions',
            'validate_submissions',
            'approve_submissions',
            'reject_submissions',
            'manage_provisioning',
            'provisioning.retry',
            'assign_tasks',
            'complaints.view',
            'complaints.create',
            'complaints.assign',
            'complaints.resolve_remote',
            'complaints.verify_close',
            'complaints.return',
            'complaints.cancel',
            'complaints.reopen',
            'customers.manage',
            'packages.manage',
            'view_audit_logs',
            'reports.export',
        ]);

        $roleTeknisi = Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);
        $roleTeknisi->syncPermissions([
            'menu.tasks',
            'menu.complaints',
            'view_assigned_tasks',
            'update_task_status',
            'complaints.view',
        ]);

        $roleSales = Role::firstOrCreate(['name' => 'Sales', 'guard_name' => 'web']);
        $roleSales->syncPermissions([
            'menu.sales_submissions',
            'create_submissions',
            'edit_submissions',
            'view_own_submissions',
        ]);

        // 3. Seed Default Teams (Team A, Team B, Team C, Team D) if table is empty
        if (Team::count() === 0) {
            $defaultTeams = [
                ['name' => 'Team A', 'order_index' => 1, 'is_active' => true],
                ['name' => 'Team B', 'order_index' => 2, 'is_active' => true],
                ['name' => 'Team C', 'order_index' => 3, 'is_active' => true],
                ['name' => 'Team D', 'order_index' => 4, 'is_active' => true],
            ];

            foreach ($defaultTeams as $team) {
                Team::create($team);
            }
        }
    }
}
