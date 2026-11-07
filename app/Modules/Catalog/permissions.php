<?php

return [
    [
        'key' => 'catalog.view',
        'module' => 'catalog',
        'module_name' => 'Katalog & Promo',
        'label' => 'Melihat Katalog Layanan & Promo',
        'description' => 'Melihat daftar paket internet pelanggan dan kode voucher promo.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin'],
        'prerequisites' => [],
    ],
    [
        'key' => 'reports.view',
        'module' => 'reports',
        'module_name' => 'Laporan Sales & Revenue',
        'label' => 'Melihat Laporan Bisnis & Penjualan',
        'description' => 'Mengakses statistik pertumbuhan pelanggan dan rekapitulasi penjualan bulanan.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin'],
        'prerequisites' => [],
    ],
];
