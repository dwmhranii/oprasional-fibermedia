<?php

namespace Database\Seeders;

use App\Models\BrasDevice;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\OfficeLocation;
use App\Models\Package;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OperationSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Kantor Pusat / Titik Absensi Harian (minimal 50m)
        $office = OfficeLocation::firstOrCreate([
            'name' => 'Kantor Pusat Fibermedia Bululawang',
        ], [
            'latitude' => -8.1132000,
            'longitude' => 112.6415000,
            'radius_meters' => 50,
            'is_active' => true,
        ]);

        // 2. Sample Master BRAS / Server
        $bras = BrasDevice::firstOrCreate([
            'name' => 'BRAS-BULULAWANG-01',
        ], [
            'ip_address' => '10.10.0.1',
            'location' => 'Server Room Bululawang',
            'notes' => 'Router Utama FTTH Bululawang',
            'is_active' => true,
        ]);

        // 3. Sample Packages
        $packages = [
            ['code' => 'PKG-20M', 'name' => 'Fiber Home 20 Mbps', 'speed_mbps' => 20, 'price' => 175000, 'category' => 'Home'],
            ['code' => 'PKG-50M', 'name' => 'Fiber Pro 50 Mbps', 'speed_mbps' => 50, 'price' => 250000, 'category' => 'Pro'],
            ['code' => 'PKG-100M', 'name' => 'Fiber Ultimate 100 Mbps', 'speed_mbps' => 100, 'price' => 375000, 'category' => 'Business'],
        ];

        $packageModels = [];
        foreach ($packages as $pkg) {
            $packageModels[] = Package::firstOrCreate([
                'code' => $pkg['code'],
            ], [
                'name' => $pkg['name'],
                'speed_mbps' => $pkg['speed_mbps'],
                'price' => $pkg['price'],
                'category' => $pkg['category'],
                'description' => "Paket internet cepat {$pkg['name']}",
                'is_active' => true,
            ]);
        }

        // 4. Sample Master ODP
        $odpModels = [];
        for ($i = 1; $i <= 5; $i++) {
            $code = sprintf('ODP-BLW-%02d', $i);
            $odpModels[] = Odp::firstOrCreate([
                'code' => $code,
            ], [
                'name' => "ODP Bululawang {$i}",
                'address' => "Jl. Raya Bululawang No. {$i}",
                'latitude' => -8.1132000 + ($i * 0.001),
                'longitude' => 112.6415000 + ($i * 0.001),
                'port_capacity' => 8,
                'wilayah' => 'Bululawang',
                'notes' => "ODP kapasitas 8 port area {$i}",
                'is_active' => true,
            ]);
        }

        // 5. 4 Tim Teknisi Lapangan (2 Anggota Tiap Tim, Tanpa Ketua) per PRD
        $teamsData = [
            'Team A' => [
                ['name' => 'Teknisi 1 - Team A', 'email' => 'teknisi.a1@fibermedia.test', 'phone' => '081200000101'],
                ['name' => 'Teknisi 2 - Team A', 'email' => 'teknisi.a2@fibermedia.test', 'phone' => '081200000102'],
            ],
            'Team B' => [
                ['name' => 'Teknisi 1 - Team B', 'email' => 'teknisi.b1@fibermedia.test', 'phone' => '081200000103'],
                ['name' => 'Teknisi 2 - Team B', 'email' => 'teknisi.b2@fibermedia.test', 'phone' => '081200000104'],
            ],
            'Team C' => [
                ['name' => 'Teknisi 1 - Team C', 'email' => 'teknisi.c1@fibermedia.test', 'phone' => '081200000105'],
                ['name' => 'Teknisi 2 - Team C', 'email' => 'teknisi.c2@fibermedia.test', 'phone' => '081200000106'],
            ],
            'Team D' => [
                ['name' => 'Teknisi 1 - Team D', 'email' => 'teknisi.d1@fibermedia.test', 'phone' => '081200000107'],
                ['name' => 'Teknisi 2 - Team D', 'email' => 'teknisi.d2@fibermedia.test', 'phone' => '081200000108'],
            ],
        ];

        $teamModels = [];
        $orderIndex = 1;
        foreach ($teamsData as $teamName => $members) {
            $team = Team::firstOrCreate([
                'name' => $teamName,
            ], [
                'description' => "Tim Lapangan {$teamName} (2 Anggota)",
                'order_index' => $orderIndex++,
                'is_active' => true,
            ]);
            $teamModels[] = $team;

            foreach ($members as $mem) {
                $user = User::firstOrCreate([
                    'email' => $mem['email'],
                ], [
                    'name' => $mem['name'],
                    'password' => bcrypt('password'),
                    'phone' => $mem['phone'],
                    'status' => 'active',
                    'team' => $teamName,
                ]);

                if (! $user->hasRole('Teknisi')) {
                    $user->assignRole('Teknisi');
                }

                TeamMember::firstOrCreate([
                    'team_id' => $team->id,
                    'user_id' => $user->id,
                    'left_at' => null,
                ], [
                    'joined_at' => now(),
                ]);
            }
        }

        // 6. 20 Pelanggan Contoh Lengkap dengan 35 Kolom per PRD
        $salesUser = User::role('Sales')->first();
        $sampleNames = [
            'Budi Santoso', 'Siti Rahmawati', 'Ahmad Hidayat', 'Dewi Lestari', 'Eko Prasetyo',
            'Fitri Handayani', 'Guntur Wibowo', 'Hani Anggraini', 'Indra Kusuma', 'Joko Susilo',
            'Kartika Sari', 'Lukman Hakim', 'Mega Utami', 'Nanda Pratama', 'Oki Setiawan',
            'Putri Permata', 'Rian Kurniawan', 'Sri Wahyuni', 'Teguh Saputra', 'Umar Faruk',
        ];

        $statuses = ['active', 'active', 'active', 'suspended', 'terminated'];

        foreach ($sampleNames as $idx => $name) {
            $num = $idx + 1;
            $code = sprintf('FMP-%04d', $num);
            $pkg = $packageModels[$idx % count($packageModels)];
            $odp = $odpModels[$idx % count($odpModels)];
            $team = $teamModels[$idx % count($teamModels)];
            $status = $statuses[$idx % count($statuses)];
            $port = ($idx % 8) + 1;

            Customer::firstOrCreate([
                'customer_code' => $code,
            ], [
                'external_ref' => 'BILL-'.(1000 + $num),
                'name' => $name,
                'nik' => '3507'.sprintf('%012d', 100000000000 + $num),
                'email' => strtolower(str_replace(' ', '.', $name)).'@gmail.com',
                'address' => "Jl. Mawar No. {$num}, RT 0{$port}/RW 02, Bululawang",
                'latitude' => -8.1132000 + ($idx * 0.0008),
                'longitude' => 112.6415000 + ($idx * 0.0006),
                'phone' => '0812'.sprintf('%08d', 34560000 + $num),
                'service_type' => 'pppoe',
                'bras_id' => $bras->id,
                'collector' => 'Admin Bululawang',
                'username' => 'cust_'.strtolower(str_replace('-', '', $code)),
                'password' => 'pass'.(1000 + $num),
                'package_id' => $pkg->id,
                'package' => $pkg->name,
                'monthly_price' => $pkg->price,
                'local_address' => '10.10.0.1',
                'remote_address' => "10.10.1.{$num}",
                'parent_queue' => 'PARENT_FTTH_BULULAWANG',
                'rate_limit' => "{$pkg->speed_mbps}M/{$pkg->speed_mbps}M",
                'subscribed_at' => Carbon::now()->subMonths(3)->addDays($num)->toDateString(),
                'expires_at' => Carbon::now()->addDays($num + 5)->toDateString(),
                'status' => $status,
                'onu_index' => "1/1/1:{$num}",
                'odp_id' => $odp->id,
                'odp_code' => $odp->code,
                'odp_port' => $port,
                'debt' => $status === 'suspended' ? $pkg->price : 0,
                'wilayah' => 'Bululawang',
                'installed_by_team_id' => $team->id,
                'sales_id' => $salesUser?->id,
                'notes' => "Pelanggan pemasangan area Bululawang (Port {$port})",
            ]);
        }
    }
}
