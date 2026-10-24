<?php

return [
    [
        'group' => 'Operasional',
        'group_order' => 3,
        'title' => 'Pemasangan (PSB)',
        'icon' => 'Wrench',
        'route' => '/admin/provisionings',
        'permission' => 'manage_provisioning',
        'order' => 2,
        'badge_key' => 'pending_provisionings',
    ],
    [
        'group' => 'Produk & Penjualan',
        'group_order' => 7,
        'title' => 'Katalog & Promo',
        'icon' => 'Package',
        'route' => '/admin/packages',
        'permission' => 'manage_packages',
        'order' => 1,
        'badge_key' => null,
    ],
];
