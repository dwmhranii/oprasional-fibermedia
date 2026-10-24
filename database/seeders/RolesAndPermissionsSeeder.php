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

        // Create permissions
        $permissions = [
            'view_dashboard',
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
            'view_kpi',
            'manage_kpi_settings',
            'manage_ratings',
            'manage_packages',
            'view_sales_reports',
            'manage_dispatch_settings',
            'customers.view_secret',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Create roles and assign created permissions

        // 1. Superadmin (gets all permissions)
        $roleSuperadmin = Role::firstOrCreate(['name' => 'Superadmin', 'guard_name' => 'web']);
        $roleSuperadmin->givePermissionTo(Permission::all());

        // 2. Admin
        $roleAdmin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $roleAdmin->syncPermissions([
            'view_dashboard',
            'view_any_submissions',
            'validate_submissions',
            'approve_submissions',
            'reject_submissions',
            'manage_provisioning',
            'assign_tasks',
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
            'view_kpi',
            'manage_kpi_settings',
            'manage_ratings',
            'manage_packages',
            'view_sales_reports',
            'manage_dispatch_settings',
            'customers.view_secret',
        ]);

        // 3. Sales
        $roleSales = Role::firstOrCreate(['name' => 'Sales', 'guard_name' => 'web']);
        $roleSales->syncPermissions([
            'view_own_submissions',
            'create_submissions',
            'edit_submissions',
        ]);

        // 4. Teknisi
        $roleTeknisi = Role::firstOrCreate(['name' => 'Teknisi', 'guard_name' => 'web']);
        $roleTeknisi->syncPermissions([
            'view_assigned_tasks',
            'update_task_status',
        ]);
    }
}
