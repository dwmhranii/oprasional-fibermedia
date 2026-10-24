<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            OperationSeeder::class,
        ]);

        // Create Test Users
        $superadmin = User::firstOrCreate([
            'email' => 'superadmin@example.com',
        ], [
            'name' => 'Super Admin',
            'password' => bcrypt('password'),
            'phone' => '081200000001',
            'status' => 'active',
        ]);
        $superadmin->assignRole('Superadmin');

        $admin = User::firstOrCreate([
            'email' => 'admin@example.com',
        ], [
            'name' => 'Admin System',
            'password' => bcrypt('password'),
            'phone' => '081200000002',
            'status' => 'active',
        ]);
        $admin->assignRole('Admin');

        $sales = User::firstOrCreate([
            'email' => 'sales@example.com',
        ], [
            'name' => 'Sales Person',
            'password' => bcrypt('password'),
            'phone' => '081200000003',
            'status' => 'active',
        ]);
        $sales->assignRole('Sales');

        // Removed legacy Teknisi Field, replaced by the new array below.

        // New Technician Seed Expansion
        $newTechnicians = [
            ['name' => 'Teknisi 1 - Team A', 'email' => 'teknisi.a1@fibermedia.test', 'team' => 'Team A', 'phone' => '081200000101'],
            ['name' => 'Teknisi 2 - Team A', 'email' => 'teknisi.a2@fibermedia.test', 'team' => 'Team A', 'phone' => '081200000102'],
            ['name' => 'Teknisi 1 - Team B', 'email' => 'teknisi.b1@fibermedia.test', 'team' => 'Team B', 'phone' => '081200000103'],
            ['name' => 'Teknisi 2 - Team B', 'email' => 'teknisi.b2@fibermedia.test', 'team' => 'Team B', 'phone' => '081200000104'],
            ['name' => 'Teknisi 1 - Team C', 'email' => 'teknisi.c1@fibermedia.test', 'team' => 'Team C', 'phone' => '081200000105'],
            ['name' => 'Teknisi 2 - Team C', 'email' => 'teknisi.c2@fibermedia.test', 'team' => 'Team C', 'phone' => '081200000106'],
        ];

        foreach ($newTechnicians as $techData) {
            $techUser = User::firstOrCreate([
                'email' => $techData['email'],
            ], [
                'name' => $techData['name'],
                'password' => bcrypt('password'),
                'phone' => $techData['phone'],
                'status' => 'active',
                'team' => $techData['team'],
            ]);
            $techUser->assignRole('Teknisi');
        }
    }
}
