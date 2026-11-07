<?php

return [
    [
        'group' => 'KPI',
        'group_order' => 6,
        'title' => 'KPI',
        'icon' => 'TrendingUp',
        'route' => '/kpi',
        'permission' => 'kpi.view',
        'order' => 1,
        'badge_key' => null,
        'tabs' => [
            [
                'key' => 'dashboard',
                'title' => 'Dasbor',
                'route' => '/kpi',
                'permission' => 'kpi.view',
            ],
            [
                'key' => 'ratings',
                'title' => 'Rating',
                'route' => '/kpi/ratings',
                'permission' => 'kpi.view',
            ],
            [
                'key' => 'settings',
                'title' => 'Pengaturan',
                'route' => '/kpi/settings',
                'permission' => 'kpi.manage',
            ],
        ],
        'actions' => [],
    ],
];
