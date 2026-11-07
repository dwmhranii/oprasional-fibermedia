<?php

return [
    [
        'group' => 'Absensi & Tim',
        'group_order' => 5,
        'title' => 'Absensi',
        'icon' => 'Clock',
        'route' => '/attendance/today',
        'permission' => 'attendance.view',
        'order' => 1,
        'badge_key' => null,
        'tabs' => [
            [
                'key' => 'today',
                'title' => 'Hari Ini',
                'route' => '/attendance/today',
                'permission' => 'attendance.view',
            ],
            [
                'key' => 'recap',
                'title' => 'Rekap',
                'route' => '/attendance/recap',
                'permission' => 'attendance.view',
            ],
            [
                'key' => 'offices',
                'title' => 'Titik Kantor',
                'route' => '/attendance/offices',
                'permission' => 'settings.manage',
            ],
        ],
        'actions' => [],
    ],
    [
        'group' => 'Absensi & Tim',
        'group_order' => 5,
        'title' => 'Tim dan Anggota',
        'icon' => 'Users2',
        'route' => '/teams',
        'permission' => 'teams.view',
        'order' => 2,
        'badge_key' => null,
        'tabs' => [],
        'actions' => [],
    ],
];
