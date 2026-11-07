<?php

return [
    [
        'group' => 'Operasional',
        'group_order' => 3,
        'title' => 'Tiket Pengaduan',
        'icon' => 'AlertTriangle',
        'route' => '/complaints',
        'permission' => 'complaints.view',
        'order' => 1,
        'badge_key' => 'complaints_action_needed',
        'tabs' => [
            [
                'key' => 'semua',
                'title' => 'Semua',
                'route' => '/complaints',
                'permission' => 'complaints.view',
            ],
            [
                'key' => 'unassigned',
                'title' => 'Belum Ditugaskan',
                'route' => '/complaints?filter=unassigned',
                'permission' => 'complaints.view',
            ],
            [
                'key' => 'review',
                'title' => 'Perlu Ditinjau',
                'route' => '/complaints?filter=review',
                'permission' => 'complaints.view',
            ],
            [
                'key' => 'massal',
                'title' => 'Massal',
                'route' => '/complaints?filter=massal',
                'permission' => 'complaints.view',
            ],
        ],
        'actions' => [],
    ],
];
