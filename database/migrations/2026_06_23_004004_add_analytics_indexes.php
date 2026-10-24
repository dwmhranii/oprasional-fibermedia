<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add performance indexes
        Schema::table('submissions', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('provisionings', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('sla_breaches', function (Blueprint $table) {
            $table->index('detected_at');
        });

        // Add view_analytics permission
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permission = Permission::firstOrCreate(['name' => 'view_analytics']);

        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $admin->givePermissionTo($permission);
        }

        $superadmin = Role::where('name', 'Superadmin')->first();
        if ($superadmin) {
            $superadmin->givePermissionTo($permission);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('provisionings', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('sla_breaches', function (Blueprint $table) {
            $table->dropIndex(['detected_at']);
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::where('name', 'view_analytics')->delete();
    }
};
