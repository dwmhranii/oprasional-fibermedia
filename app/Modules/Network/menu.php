<?php

return [
    [
        'group' => 'Jaringan',
        'group_order' => 4,
        'title' => 'Peta Jaringan',
        'icon' => 'Map',
        'route' => '/network/map',
        'permission' => 'network.view',
        'order' => 1,
        'badge_key' => null,
        'is_available' => true,
        'tabs' => [],
        'actions' => [],
    ],
    [
        'group' => 'Jaringan',
        'group_order' => 4,
        'title' => 'OLT, ODC, ODP & Kabel',
        'icon' => 'Network',
        'route' => '/network/olt',
        'permission' => 'network.view',
        'order' => 2,
        'badge_key' => 'network_approvals',
        'is_available' => true,
        'tabs' => [
            [
                'key' => 'olt',
                'title' => 'OLT',
                'route' => '/network/olt',
                'permission' => 'network.view',
            ],
            [
                'key' => 'odc',
                'title' => 'ODC',
                'route' => '/network/odc',
                'permission' => 'network.view',
            ],
            [
                'key' => 'odp',
                'title' => 'ODP',
                'route' => '/network/odp',
                'permission' => 'network.view',
            ],
            [
                'key' => 'cable',
                'title' => 'Kabel',
                'route' => '/network/cable',
                'permission' => 'network.view',
            ],
            [
                'key' => 'bras',
                'title' => 'BRAS',
                'route' => '/network/bras',
                'permission' => 'network.view',
            ],
            [
                'key' => 'approvals',
                'title' => 'Persetujuan',
                'route' => '/network/approvals',
                'permission' => 'network.approve',
                'badge_key' => 'network_approvals',
            ],
        ],
        'actions' => [
            [
                'key' => 'import_kmz',
                'title' => 'Impor KMZ',
                'permission' => 'network.manage',
                'action' => 'open_import_dialog',
            ],
            [
                'key' => 'export_kmz',
                'title' => 'Ekspor KMZ',
                'permission' => 'network.view',
                'action' => 'open_export_dialog',
            ],
        ],
    ],
];
