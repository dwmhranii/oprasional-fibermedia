<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        $permissions = [
            // Submission
            'submission.create',
            'submission.view-own',
            'submission.view-all',
            'submission.edit-draft',
            'submission.validate',
            'submission.delete',
            // Provisioning
            'provisioning.create',
            'provisioning.retry',
            'provisioning.view',
            'provisioning.manage',
            // Tasks
            'task.assign',
            'task.view-all',
            'task.view-own',
            'task.update-status',
            'task.complete',
            // Users
            'user.manage',
            // Settings
            'settings.manage',
            // Reports
            'report.view',
            'report.export',
            // Audit
            'audit.view',
            'audit.export',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // create roles and assign created permissions

        // Superadmin
        $roleSuperAdmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $roleSuperAdmin->givePermissionTo(Permission::all());

        // Admin
        $roleAdmin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $roleAdmin->givePermissionTo([
            'submission.view-all', 'submission.validate',
            'provisioning.create', 'provisioning.retry', 'provisioning.view', 'provisioning.manage',
            'task.assign', 'task.view-all',
            'report.view', 'report.export',
            'audit.view',
        ]);

        // Sales
        $roleSales = Role::firstOrCreate(['name' => 'sales', 'guard_name' => 'web']);
        $roleSales->givePermissionTo([
            'submission.create', 'submission.view-own', 'submission.edit-draft',
            'task.view-own',
        ]);

        // Teknisi
        $roleTeknisi = Role::firstOrCreate(['name' => 'teknisi', 'guard_name' => 'web']);
        $roleTeknisi->givePermissionTo([
            'task.view-own', 'task.update-status', 'task.complete',
            'submission.view-all',
        ]);
    }
}
