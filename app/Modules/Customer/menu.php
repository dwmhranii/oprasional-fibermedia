<?php

return [
    [
        'group' => 'Pelanggan',
        'group_order' => 2,
        'title' => 'Kelola Pelanggan',
        'icon' => 'Users',
        'route' => '/admin/customers',
        'permission' => 'manage_customers',
        'order' => 1,
        'badge_key' => null,
    ],
    [
        'group' => 'Pelanggan',
        'group_order' => 2,
        'title' => 'Pengajuan Pelanggan',
        'icon' => 'FileText',
        'route' => '/submissions',
        'permission' => 'view_any_submissions',
        'order' => 2,
        'badge_key' => 'pending_submissions',
    ],
];
