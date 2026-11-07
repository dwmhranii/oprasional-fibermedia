<?php

return [
    [
        'group' => 'Produk & Penjualan',
        'group_order' => 7,
        'title' => 'Katalog & Promo',
        'icon' => 'Package',
        'route' => '/catalog',
        'permission' => 'catalog.view',
        'order' => 1,
        'badge_key' => null,
        'tabs' => [
            [
                'key' => 'packages',
                'title' => 'Paket Internet',
                'route' => '/catalog',
                'permission' => 'catalog.view',
            ],
            [
                'key' => 'promo',
                'title' => 'Kode Promo',
                'route' => '/catalog?tab=promo',
                'permission' => 'catalog.view',
            ],
        ],
        'actions' => [],
    ],
    [
        'group' => 'Produk & Penjualan',
        'group_order' => 7,
        'title' => 'Laporan Sales & Revenue',
        'icon' => 'BarChart3',
        'route' => '/reports',
        'permission' => 'reports.view',
        'order' => 2,
        'badge_key' => null,
        'tabs' => [],
        'actions' => [],
    ],
];
