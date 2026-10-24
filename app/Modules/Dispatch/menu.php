<?php

return [
    [
        'group' => 'Operasional',
        'group_order' => 3,
        'title' => 'Work Order (pantau)',
        'icon' => 'ClipboardList',
        'route' => '/admin/work-orders',
        'permission' => 'view_work_orders',
        'order' => 3,
        'badge_key' => 'operational_tickets',
    ],
    [
        'group' => 'Pengaturan',
        'group_order' => 8,
        'title' => 'Pengaturan Dispatch',
        'icon' => 'Settings',
        'route' => '/admin/dispatch-settings',
        'permission' => 'manage_dispatch_settings',
        'order' => 1,
        'badge_key' => null,
    ],
];
