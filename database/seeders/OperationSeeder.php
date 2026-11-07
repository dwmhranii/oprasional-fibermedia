<?php

namespace Database\Seeders;

use App\Models\BrasDevice;
use App\Models\CableTrack;
use App\Models\ComplaintType;
use App\Models\Customer;
use App\Models\Holiday;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\OfficeLocation;
use App\Models\Package;
use App\Models\PauseReason;
use App\Models\SlaSetting;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OperationSeeder extends Seeder
{
    public function run(): void
    {
        // 0a. SLA Settings (PRD Final v1.2: Kritis 3 jam, Tinggi 6 jam, Sedang 24 jam)
        $slaSettings = [
            ['priority' => 'critical', 'resolution_hours' => 3, 'resolution_minutes' => 180],
            ['priority' => 'high', 'resolution_hours' => 6, 'resolution_minutes' => 360],
            ['priority' => 'medium', 'resolution_hours' => 24, 'resolution_minutes' => 1440],
        ];
        foreach ($slaSettings as $sla) {
            SlaSetting::updateOrCreate(
                ['priority' => $sla['priority']],
                [
                    'resolution_hours' => $sla['resolution_hours'],
                    'resolution_minutes' => $sla['resolution_minutes'],
                    'is_active' => true,
                ]
            );
        }

        // 0b. 5 Alasan Baku Pause SLA (PRD Final v1.2)
        $pauseReasons = [
            ['code' => 'hujan_lebat', 'reason' => 'Hujan Lebat / Cuaca Ekstrem', 'requires_photo' => true, 'order_index' => 1],
            ['code' => 'akses_ditolak', 'reason' => 'Akses Lokasi Ditolak / Rumah Kosong', 'requires_photo' => true, 'order_index' => 2],
            ['code' => 'material_habis', 'reason' => 'Menunggu Pasokan Material / Drop Core', 'requires_photo' => false, 'order_index' => 3],
            ['code' => 'izin_lingkungan', 'reason' => 'Menunggu Koordinasi / Izin Lingkungan', 'requires_photo' => false, 'order_index' => 4],
            ['code' => 'kabel_pihak_ketiga', 'reason' => 'Kabel Putus Akibat Pihak Ketiga (PLN/Proyek Jalan)', 'requires_photo' => true, 'order_index' => 5],
        ];
        foreach ($pauseReasons as $reason) {
            PauseReason::updateOrCreate(
                ['code' => $reason['code']],
                [
                    'reason' => $reason['reason'],
                    'requires_photo' => $reason['requires_photo'],
                    'is_active' => true,
                    'order_index' => $reason['order_index'],
                ]
            );
        }

        // 0c. Jenis Gangguan (PRD Final v1.2)
        $complaintTypes = [
            ['name' => 'LOS Merah / Kabel Fiber Putus', 'description' => 'Redaman putus total atau kabel drop core terputus', 'default_priority' => 'critical'],
            ['name' => 'Modem / ONT Rusak atau Mati Total', 'description' => 'Perangkat ONU tidak hidup atau indikator power mati', 'default_priority' => 'high'],
            ['name' => 'Koneksi Lambat / Redaman Tinggi', 'description' => 'Kecepatan tidak sesuai paket atau sinyal optik di luar standar', 'default_priority' => 'medium'],
            ['name' => 'Wi-Fi Tidak Terdeteksi / Error Konfigurasi', 'description' => 'SSID hilang atau salah pengaturan sandi', 'default_priority' => 'medium'],
            ['name' => 'Gangguan Administrasi / Penyesuaian Port', 'description' => 'Masalah autentikasi PPPoE atau migrasi port ODP', 'default_priority' => 'medium'],
        ];
        foreach ($complaintTypes as $ct) {
            ComplaintType::updateOrCreate(
                ['name' => $ct['name']],
                [
                    'description' => $ct['description'],
                    'default_priority' => $ct['default_priority'],
                    'is_active' => true,
                ]
            );
        }

        // 0d. Hari Libur Nasional 2026 (PRD Final v1.2)
        $holidays = [
            ['name' => 'Tahun Baru 2026 Masehi', 'holiday_date' => '2026-01-01', 'description' => 'Hari Libur Nasional'],
            ['name' => 'Isra Mikraj Nabi Muhammad SAW', 'holiday_date' => '2026-01-16', 'description' => 'Hari Libur Nasional'],
            ['name' => 'Tahun Baru Imlek 2577 Kongzili', 'holiday_date' => '2026-02-17', 'description' => 'Hari Libur Nasional'],
            ['name' => 'Hari Suci Nyepi Tahun Baru Saka 1948', 'holiday_date' => '2026-03-19', 'description' => 'Hari Libur Nasional'],
            ['name' => 'Hari Raya Idul Fitri 1447 Hijriah', 'holiday_date' => '2026-03-20', 'description' => 'Hari Libur Nasional'],
            ['name' => 'Hari Kemerdekaan Republik Indonesia', 'holiday_date' => '2026-08-17', 'description' => 'HUT RI ke-81'],
            ['name' => 'Hari Raya Natal', 'holiday_date' => '2026-12-25', 'description' => 'Hari Libur Nasional'],
        ];
        foreach ($holidays as $h) {
            Holiday::updateOrCreate(
                ['holiday_date' => $h['holiday_date']],
                [
                    'name' => $h['name'],
                    'description' => $h['description'],
                ]
            );
        }

        // 1. Kantor Pusat / Titik Absensi Harian (minimal 50m)
        $office = OfficeLocation::firstOrCreate([
            'name' => 'Kantor Pusat Fibermedia Bululawang',
        ], [
            'latitude' => -8.1132000,
            'longitude' => 112.6415000,
            'radius_meters' => 50,
            'valid_wifi_ips' => ['192.168.1.1', '127.0.0.1', '10.10.0.1', '::1', '103.144.82.10'],
            'wifi_incident_active' => false,
            'is_active' => true,
        ]);

        OfficeLocation::firstOrCreate([
            'name' => 'Kantor Operasional Fibermedia',
        ], [
            'latitude' => -6.2087634,
            'longitude' => 106.8455990,
            'radius_meters' => 50,
            'valid_wifi_ips' => ['127.0.0.1', '::1', '103.144.82.10', '192.168.1.1'],
            'wifi_incident_active' => false,
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

        // 4. Sample Master ODC
        $odc = Odc::firstOrCreate([
            'code' => 'ODC-BLW-01',
        ], [
            'name' => 'ODC Bululawang Sentral',
            'address' => 'Jl. Raya Bululawang No. 100',
            'latitude' => -8.1130000,
            'longitude' => 112.6410000,
            'capacity_odp' => 16,
            'operational_status' => 'normal',
            'wilayah' => 'Bululawang',
            'notes' => 'ODC Feeder Utama Area Bululawang',
        ]);

        // 5. Sample Master ODP
        $odpModels = [];
        for ($i = 1; $i <= 5; $i++) {
            $code = sprintf('ODP-BLW-%02d', $i);
            $odpModels[] = Odp::firstOrCreate([
                'code' => $code,
            ], [
                'name' => "ODP Bululawang {$i}",
                'odc_id' => $odc->id,
                'address' => "Jl. Raya Bululawang No. {$i}",
                'latitude' => -8.1132000 + ($i * 0.001),
                'longitude' => 112.6415000 + ($i * 0.001),
                'port_capacity' => 8,
                'wilayah' => 'Bululawang',
                'notes' => "ODP kapasitas 8 port area {$i}",
                'is_active' => true,
            ]);
        }

        // 6. Sample Cable Tracks (Drawn & Undrawn)
        CableTrack::firstOrCreate([
            'client_uuid' => 'CABLE-BLW-FEEDER-01',
        ], [
            'name' => 'Kabel Feeder ODC Sentral ke ODP-01',
            'status' => 'approved',
            'operational_status' => 'normal',
            'connected_odc_id' => $odc->id,
            'connected_odp_id' => $odpModels[0]->id,
            'downstream_odp_ids' => [$odpModels[0]->id, $odpModels[1]->id],
            'raw_points_count' => 3,
            'simplified_points_count' => 3,
            'total_length_meters' => 450.50,
            'coordinates' => [
                ['lat' => -8.1130000, 'lng' => 112.6410000],
                ['lat' => -8.1131000, 'lng' => 112.6412000],
                ['lat' => -8.1132000 + 0.001, 'lng' => 112.6415000 + 0.001],
            ],
            'notes' => 'Feeder 24 core normal',
        ]);

        CableTrack::firstOrCreate([
            'client_uuid' => 'CABLE-BLW-DRAFT-01',
        ], [
            'name' => 'Distribusi Jalur Barat (Belum Digambar)',
            'status' => 'draft',
            'operational_status' => 'normal',
            'connected_odc_id' => $odc->id,
            'raw_points_count' => 0,
            'simplified_points_count' => 0,
            'total_length_meters' => 0,
            'coordinates' => [],
            'notes' => 'Survey pending',
        ]);

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
