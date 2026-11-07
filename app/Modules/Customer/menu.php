<?php

return [
    [
        'group' => 'Pelanggan',
        'group_order' => 2,
        'title' => 'Pelanggan',
        'icon' => 'Users',
        'route' => '/customers',
        'permission' => 'customers.view',
        'order' => 1,
        'badge_key' => 'pending_submissions',
        'tabs' => [
            [
                'key' => 'daftar',
                'title' => 'Daftar',
                'route' => '/customers',
                'permission' => 'customers.view',
            ],
            [
                'key' => 'pengajuan',
                'title' => 'Pengajuan',
                'route' => '/customers/submissions',
                'permission' => 'submissions.view',
                'badge_key' => 'pending_submissions',
            ],
        ],
        'actions' => [],
    ],
];
