<?php

return [
    [
        'group' => 'KPI',
        'group_order' => 6,
        'title' => 'Dasbor KPI',
        'icon' => 'TrendingUp',
        'route' => '/admin/kpi',
        'permission' => 'view_kpi',
        'order' => 1,
        'badge_key' => null,
    ],
    [
        'group' => 'KPI',
        'group_order' => 6,
        'title' => 'Rating Pelanggan',
        'icon' => 'Star',
        'route' => '/admin/kpi/ratings',
        'permission' => 'manage_ratings',
        'order' => 2,
        'badge_key' => null,
    ],
    [
        'group' => 'KPI',
        'group_order' => 6,
        'title' => 'Pengaturan KPI',
        'icon' => 'Sliders',
        'route' => '/admin/kpi/settings',
        'permission' => 'manage_kpi_settings',
        'order' => 3,
        'badge_key' => null,
    ],
    [
        'group' => 'Produk & Penjualan',
        'group_order' => 7,
        'title' => 'Laporan Sales & Revenue',
        'icon' => 'BarChart3',
        'route' => '/admin/sales-report',
        'permission' => 'view_sales_reports',
        'order' => 2,
        'badge_key' => null,
    ],
];
