<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // ── Feature-based Permissions ─────────────────────────────────────
        $permissions = [
            // Dashboard
            'dashboard.view',

            // Pelanggan (Customers)
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',
            'customers.import',
            'customers.export',
            'customers.view_secret',

            // Pengajuan PSB (Submissions)
            'submissions.view',
            'submissions.create',
            'submissions.update_own',
            'submissions.view_own',
            'submissions.approve',

            // Tiket Pengaduan (Complaints)
            'complaints.create',
            'complaints.view',
            'complaints.view_own',
            'complaints.view_assigned',
            'complaints.assign',
            'complaints.review',

            // PSB & Work Orders
            'psb.view',
            'workorders.view',
            'tasks.view_assigned',
            'tasks.update_status',

            // Jaringan (Network)
            'network.view',
            'network.manage',
            'network.propose',
            'network.approve',

            // Absensi & Kehadiran (Attendance)
            'attendance.self',
            'attendance.view',
            'attendance.manage',

            // Tim & Perangkat (Teams & Devices)
            'teams.view',
            'teams.manage',
            'devices.view',
            'devices.manage',

            // KPI & Penilaian
            'kpi.view',
            'kpi.view_own',
            'kpi.manage',

            // Katalog & Laporan
            'catalog.view',
            'reports.view',

            // Pengaturan, Pengguna, & Audit
            'settings.manage',
            'users.view',
            'users.manage',
            'access.manage',
            'audit.view',

            // Aplikasi Lapangan (PWA)
            'pwa.access',

            // Gangguan & BRAS (Fase N1 & N2)
            'incidents.view',
            'incidents.manage',
            'bras.manage',
            'connection.view',

            // Backward Compatibility Aliases
            'view_dashboard',
            'view_sla',
            'view_any_submissions',
            'view_own_submissions',
            'create_submissions',
            'edit_submissions',
            'validate_submissions',
            'approve_submissions',
            'reject_submissions',
            'manage_provisioning',
            'assign_tasks',
            'view_assigned_tasks',
            'update_task_status',
            'manage_users',
            'manage_roles',
            'view_audit_logs',
            'view_sla',
            'view_analytics',
            'manage_customers',
            'view_customers',
            'manage_complaints',
            'view_work_orders',
            'manage_network',
            'view_attendances',
            'manage_attendances',
            'manage_teams',
            'manage_devices',
            'manage_office_locations',
            'manage_kpi_settings',
            'manage_ratings',
            'manage_packages',
            'view_sales_reports',
            'manage_dispatch_settings',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // ── Roles Setup ───────────────────────────────────────────────────

        // 1. Superadmin (Dilayani Gate::before di AppServiceProvider; juga disinkronkan semua permission)
        $roleSuperadmin = Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        $roleSuperadmin->givePermissionTo(Permission::all());

        $roleSuperadminLower = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $roleSuperadminLower->givePermissionTo(Permission::all());

        // 2. Admin / CS (Web Admin & PWA)
        $adminPermissions = [
            'dashboard.view',
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.import',
            'customers.export',
            'submissions.view',
            'submissions.approve',
            'complaints.create',
            'complaints.view',
            'complaints.view_own',
            'complaints.assign',
            'complaints.review',
            'psb.view',
            'workorders.view',
            'attendance.self',
            'attendance.view',
            'attendance.manage',
            'kpi.view',
            'pwa.access',
            // legacy
            'manage_customers',
            'view_customers',
            'manage_complaints',
            'view_work_orders',
            'view_dashboard',
            'view_sla',
        ];

        $roleAdminCs = Role::firstOrCreate(['name' => 'Admin/CS', 'guard_name' => 'web']);
        $roleAdminCs->syncPermissions($adminPermissions);

        $roleAdmin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $roleAdmin->syncPermissions($adminPermissions);

        // 3. NOC / Dispatcher (Web Admin & Network)
        $nocPermissions = [
            'dashboard.view',
            'customers.view',
            'complaints.view',
            'complaints.assign',
            'complaints.review',
            'workorders.view',
            'network.view',
            'network.manage',
            'network.approve',
            'incidents.view',
            'incidents.manage',
            'attendance.self',
            'kpi.view',
            'pwa.access',
            // legacy
            'manage_network',
            'manage_dispatch_settings',
        ];

        $roleNocDispatcher = Role::firstOrCreate(['name' => 'NOC/Dispatcher', 'guard_name' => 'web']);
        $roleNocDispatcher->syncPermissions($nocPermissions);

        $roleNoc = Role::firstOrCreate(['name' => 'NOC', 'guard_name' => 'web']);
        $roleNoc->syncPermissions($nocPermissions);

        // 4. Sales (PWA & Web)
        $roleSales = Role::firstOrCreate(['name' => 'Sales', 'guard_name' => 'web']);
        $roleSales->syncPermissions([
            'dashboard.view',
            'view_dashboard',
            'pwa.access',
            'attendance.self',
            'submissions.create',
            'submissions.view_own',
            'submissions.update_own',
            'kpi.view_own',
            // legacy
            'create_submissions',
            'edit_submissions',
            'view_own_submissions',
        ]);

        // 5. Teknisi (PWA & Web)
        $roleTeknisi = Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);
        $roleTeknisi->syncPermissions([
            'dashboard.view',
            'view_dashboard',
            'pwa.access',
            'attendance.self',
            'complaints.view_assigned',
            'tasks.view_assigned',
            'tasks.update_status',
            'network.propose',
            'kpi.view_own',
            // legacy
            'view_assigned_tasks',
            'update_task_status',
        ]);

        // 6. Collector (PWA & Web)
        $roleCollector = Role::firstOrCreate(['name' => 'Collector', 'guard_name' => 'web']);
        $roleCollector->syncPermissions([
            'dashboard.view',
            'view_dashboard',
            'pwa.access',
            'attendance.self',
            'customers.view',
            'kpi.view_own',
        ]);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
