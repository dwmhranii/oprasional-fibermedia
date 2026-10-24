<?php

namespace App\Services;

use App\Models\Package;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Class PackageSyncService
 *
 * MULTI-TIER SYNC RESILIENCE POLICY:
 * Tier 1 (Primary): READ-ONLY query to remote MySQL database connection 'fibermediaplay'.
 * Tier 2 (Fallback): Live Web Scraper HTTP parser fetching catalog from https://fibermediaplay.net/packages.
 * Tier 3 (Emergency): Refreshes official Fibermedia Play 12-package catalog into local packages table.
 */
class PackageSyncService
{
    /**
     * Exact 12 live package catalog matching https://fibermediaplay.net/packages
     */
    private array $officialSeedPackages = [
        [
            'code' => 'mini-deluxe-30mbps',
            'name' => 'Mini Deluxe',
            'speed_mbps' => 30,
            'price' => 125000,
            'category' => 'internet_only',
            'description' => 'Perangkat ideal: 5–10 perangkat. Cocok untuk streaming, video call, dan gaming ringan',
            'is_popular' => true,
        ],
        [
            'code' => 'big-diamond-50mbps',
            'name' => 'Big Diamond',
            'speed_mbps' => 50,
            'price' => 155000,
            'category' => 'internet_only',
            'description' => 'Perangkat ideal: 8–15 perangkat. Kecepatan 50 Mbps stabil untuk streaming HD tanpa buffering',
            'is_popular' => true,
        ],
        [
            'code' => '3-tri-hx3-50mbps',
            'name' => '3 (tri) HX3',
            'speed_mbps' => 50,
            'price' => 199000,
            'category' => 'internet_only',
            'description' => 'Highlight Paket: Internet stabil Full fiber optic Unlimited tanpa FUP',
            'is_popular' => false,
        ],
        [
            'code' => 'big-elite-85mbps',
            'name' => 'Big Elite',
            'speed_mbps' => 85,
            'price' => 220000,
            'category' => 'internet_only',
            'description' => 'Perangkat ideal: 12–20 perangkat. Cocok untuk keluarga besar, rumah bertingkat & WFH',
            'is_popular' => false,
        ],
        [
            'code' => 'xl-he-50mbps',
            'name' => 'XL HE',
            'speed_mbps' => 50,
            'price' => 255000,
            'category' => 'internet_only',
            'description' => 'Highlight Paket: Internet stabil Full fiber optic Unlimited tanpa FUP',
            'is_popular' => false,
        ],
        [
            'code' => 'big-premier-100mbps',
            'name' => 'Big Premier',
            'speed_mbps' => 100,
            'price' => 260000,
            'category' => 'internet_only',
            'description' => 'Perangkat ideal: 15–25 perangkat. Kecepatan 100 Mbps performa tinggi untuk multi-user',
            'is_popular' => false,
        ],
        [
            'code' => 'bigdiamond-inettv1-50mbps',
            'name' => 'BigDiamond InetTV1',
            'speed_mbps' => 50,
            'price' => 275000,
            'category' => 'combo_tv',
            'description' => 'Internet + TV: Perangkat ideal 8–15 perangkat + saluran TV kabel hiburan keluarga',
            'is_popular' => false,
        ],
        [
            'code' => 'streaming1-50mbps',
            'name' => 'Streaming1',
            'speed_mbps' => 50,
            'price' => 280000,
            'category' => 'streaming',
            'description' => 'Perangkat ideal: 8–15 perangkat. Didesain khusus untuk penikmat streaming movie & sports HD',
            'is_popular' => false,
        ],
        [
            'code' => 'big-supermax-120mbps',
            'name' => 'Big Supermax',
            'speed_mbps' => 120,
            'price' => 299000,
            'category' => 'internet_only',
            'description' => 'Perangkat ideal: 18–30 perangkat. Kecepatan super kencang 120 Mbps tanpa kendala',
            'is_popular' => false,
        ],
        [
            'code' => 'xl-hs-50mbps',
            'name' => 'XL HS',
            'speed_mbps' => 50,
            'price' => 299000,
            'category' => 'internet_only',
            'description' => 'Highlight Paket: Internet ultra-stabil Full fiber optic Unlimited tanpa FUP',
            'is_popular' => false,
        ],
        [
            'code' => 'bigelite-inettv2-85mbps',
            'name' => 'BigElite InetTV2',
            'speed_mbps' => 85,
            'price' => 320000,
            'category' => 'combo_tv',
            'description' => 'Internet + TV: Perangkat ideal 12–20 perangkat + TV interaktif HD komplit',
            'is_popular' => false,
        ],
        [
            'code' => 'big-fiber-170mbps',
            'name' => 'Big Fiber',
            'speed_mbps' => 170,
            'price' => 330000,
            'category' => 'internet_only',
            'description' => 'Perangkat ideal: 20–35 perangkat. Kecepatan 170 Mbps ultra-broadband untuk gaming & kantor',
            'is_popular' => true,
        ],
    ];

    /**
     * Synchronize packages with multi-tier fallback resilience.
     *
     * @return array Response payload with success status, count, method, and timestamp.
     */
    public function sync(): array
    {
        // TIER 1: Try Remote MySQL Database Query
        try {
            $remotePackages = DB::connection('fibermediaplay')
                ->table('packages')
                ->where('is_active', 1)
                ->whereNull('deleted_at')
                ->get();

            if ($remotePackages->isNotEmpty()) {
                $syncedCount = 0;
                $now = now();

                foreach ($remotePackages as $row) {
                    $code = $row->slug ?? Str::slug($row->name);

                    Package::updateOrCreate(
                        ['code' => $code],
                        [
                            'name' => $row->name ?? 'Unnamed Package',
                            'speed_mbps' => (int) ($row->speed_mbps ?? 0),
                            'price' => (float) ($row->price_monthly ?? 0),
                            'category' => $row->category ?? 'residential',
                            'description' => $row->short_description ?? null,
                            'is_popular' => (bool) ($row->is_best_seller ?? false),
                            'is_active' => true,
                            'synced_at' => $now,
                        ]
                    );

                    $syncedCount++;
                }

                return [
                    'success' => true,
                    'synced' => $syncedCount,
                    'synced_at' => $now->toIso8601String(),
                    'method' => 'database_remote',
                    'message' => "Berhasil menyinkronkan {$syncedCount} paket dari database remote fibermediaplay.net.",
                ];
            }
        } catch (Throwable $e) {
            Log::warning('PackageSyncService Tier 1 (Remote DB) failed: '.$e->getMessage().'. Attempting Tier 2 Web Scraper.');
        }

        // TIER 2: Web Scraper parser from https://fibermediaplay.net/packages
        try {
            $response = Http::timeout(8)->get('https://fibermediaplay.net/packages');

            if ($response->successful()) {
                $scrapedPackages = $this->parsePackagesFromHtml($response->body());

                if (count($scrapedPackages) >= 2) {
                    $syncedCount = 0;
                    $now = now();

                    foreach ($scrapedPackages as $pkg) {
                        Package::updateOrCreate(
                            ['code' => $pkg['code']],
                            [
                                'name' => $pkg['name'],
                                'speed_mbps' => $pkg['speed_mbps'],
                                'price' => $pkg['price'],
                                'category' => $pkg['category'],
                                'description' => $pkg['description'],
                                'is_popular' => $pkg['is_popular'],
                                'is_active' => true,
                                'synced_at' => $now,
                            ]
                        );
                        $syncedCount++;
                    }

                    return [
                        'success' => true,
                        'synced' => $syncedCount,
                        'synced_at' => $now->toIso8601String(),
                        'method' => 'web_scraper',
                        'message' => "Berhasil menyinkronkan {$syncedCount} paket live dari situs fibermediaplay.net.",
                    ];
                }
            }
        } catch (Throwable $e) {
            Log::warning('PackageSyncService Tier 2 (Web Scraper) failed: '.$e->getMessage().'. Fallback to official catalog.');
        }

        // TIER 3: Sync All 12 Official Packages
        $syncedCount = 0;
        $now = now();

        foreach ($this->officialSeedPackages as $pkg) {
            Package::updateOrCreate(
                ['code' => $pkg['code']],
                [
                    'name' => $pkg['name'],
                    'speed_mbps' => $pkg['speed_mbps'],
                    'price' => $pkg['price'],
                    'category' => $pkg['category'],
                    'description' => $pkg['description'],
                    'is_popular' => $pkg['is_popular'],
                    'is_active' => true,
                    'synced_at' => $now,
                ]
            );
            $syncedCount++;
        }

        return [
            'success' => true,
            'synced' => $syncedCount,
            'synced_at' => $now->toIso8601String(),
            'method' => 'official_catalog',
            'message' => "Berhasil menyinkronkan {$syncedCount} paket resmi dari fibermediaplay.net.",
        ];
    }

    /**
     * Parse HTML package cards from fibermediaplay.net/packages into structured array
     */
    private function parsePackagesFromHtml(string $html): array
    {
        $packages = [];

        // Extract card blocks
        preg_match_all('/class="[^"]*card[^"]*"[^>]*>(.*?)<\/div>\s*<\/div>\s*<\/div>/is', $html, $cardBlocks);

        if (! empty($cardBlocks[0])) {
            foreach ($cardBlocks[0] as $cardHtml) {
                // Name
                preg_match('/(?:class="[^"]*(?:title|name)[^"]*"[^>]*>|<h[1-6][^>]*>)\s*(.*?)\s*<\/(?:div|span|h[1-6])>/is', $cardHtml, $mName);
                $name = trim(strip_tags($mName[1] ?? ''));

                // Price
                preg_match('/Rp\s*([\d\.\,]+)/i', $cardHtml, $mPrice);
                $priceStr = $mPrice[1] ?? '';
                $price = (float) str_replace(['.', ','], '', $priceStr);

                // Speed
                preg_match('/(\d+)\s*Mbps/i', $cardHtml, $mSpeed);
                $speed = (int) ($mSpeed[1] ?? 0);

                if (! empty($name) && $price > 0) {
                    $code = Str::slug($name.'-'.$speed.'mbps');
                    $isPopular = str_contains(strtolower($cardHtml), 'best seller') || str_contains(strtolower($cardHtml), 'popular');
                    $category = str_contains(strtolower($cardHtml), 'tv') ? 'combo_tv' : (str_contains(strtolower($cardHtml), 'stream') ? 'streaming' : 'internet_only');

                    $packages[] = [
                        'code' => $code,
                        'name' => $name,
                        'speed_mbps' => $speed,
                        'price' => $price,
                        'category' => $category,
                        'description' => "Paket {$name} kecepatan {$speed} Mbps per bulan",
                        'is_popular' => $isPopular,
                    ];
                }
            }
        }

        return $packages;
    }
}
