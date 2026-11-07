<?php

return [
    [
        'group' => 'Operasional',
        'group_order' => 3,
        'title' => 'Work Order',
        'icon' => 'ClipboardList',
        'route' => '/work-orders',
        'permission' => 'workorders.view',
        'order' => 3,
        'badge_key' => 'workorders_review',
        'tabs' => [],
        'actions' => [],
    ],
    [
        'group' => 'Pengaturan',
        'group_order' => 8,
        'title' => 'Pengaturan Operasional',
        'icon' => 'Settings',
        'route' => '/settings/dispatch',
        'permission' => 'settings.manage',
        'order' => 3,
        'badge_key' => null,
        'tabs' => [
            [
                'key' => 'dispatch',
                'title' => 'Dispatch',
                'route' => '/settings/dispatch',
                'permission' => 'settings.manage',
            ],
            [
                'key' => 'map',
                'title' => 'Peta',
                'route' => '/settings/map',
                'permission' => 'settings.manage',
            ],
            [
                'key' => 'activity_log',
                'title' => 'Log Aktivitas',
                'route' => '/settings/activity-log',
                'permission' => 'audit.view',
            ],
        ],
        'actions' => [],
    ],
];
