<?php

return [
    [
        'key' => 'kpi.view',
        'module' => 'kpi',
        'module_name' => 'KPI & Penilaian',
        'label' => 'Melihat Dasbor KPI Seluruh Tim',
        'description' => 'Melihat ringkasan metrik SLA, skor performa tim, dan rating pelanggan.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin'],
        'prerequisites' => [],
    ],
    [
        'key' => 'kpi.view_own',
        'module' => 'kpi',
        'module_name' => 'KPI & Penilaian',
        'label' => 'Melihat KPI Pribadi',
        'description' => 'Melihat pencapaian dan rekapitulasi poin performa kerja sendiri.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin', 'Teknisi', 'Sales'],
        'prerequisites' => [],
    ],
    [
        'key' => 'kpi.manage',
        'module' => 'kpi',
        'module_name' => 'KPI & Penilaian',
        'label' => 'Kelola Pengaturan KPI & SLA',
        'description' => 'Mengubah bobot target performa bulanan dan ambang batas SLA.',
        'is_locked' => false,
        'is_sensitive' => true,
        'default_roles' => ['Superadmin'],
        'prerequisites' => ['kpi.view'],
    ],
];
