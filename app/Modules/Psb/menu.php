<?php

return [
    [
        'group' => 'Operasional',
        'group_order' => 3,
        'title' => 'Pemasangan (PSB)',
        'icon' => 'Wrench',
        'route' => '/psb',
        'permission' => 'psb.view',
        'order' => 2,
        'badge_key' => 'psb_action_needed',
        'tabs' => [
            [
                'key' => 'semua',
                'title' => 'Semua',
                'route' => '/psb',
                'permission' => 'psb.view',
            ],
            [
                'key' => 'unassigned',
                'title' => 'Belum Ditugaskan',
                'route' => '/psb?filter=unassigned',
                'permission' => 'psb.view',
            ],
            [
                'key' => 'review',
                'title' => 'Perlu Ditinjau',
                'route' => '/psb?filter=review',
                'permission' => 'psb.view',
            ],
        ],
        'actions' => [],
    ],
];
