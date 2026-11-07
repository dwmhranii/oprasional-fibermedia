<?php

return [
    [
        'key' => 'teams.view',
        'module' => 'teams',
        'module_name' => 'Absensi & Tim',
        'label' => 'Melihat Tim dan Anggota',
        'description' => 'Melihat struktur organisasi tim lapangan teknisi dan sales.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin'],
        'prerequisites' => [],
    ],
    [
        'key' => 'teams.manage',
        'module' => 'teams',
        'module_name' => 'Absensi & Tim',
        'label' => 'Kelola Tim dan Anggota',
        'description' => 'Membuat tim, mengangkat ketua tim, dan mengatur penugasan anggota.',
        'is_locked' => false,
        'is_sensitive' => true,
        'default_roles' => ['Superadmin'],
        'prerequisites' => ['teams.view'],
    ],
    [
        'key' => 'settings.manage',
        'module' => 'settings',
        'module_name' => 'Pengaturan Sistem',
        'label' => 'Kelola Pengaturan Sistem & Dispatch',
        'description' => 'Mengatur alokasi dispatch otomatis, jam operasional, radius kantor, dan peta.',
        'is_locked' => true,
        'is_sensitive' => true,
        'default_roles' => ['Superadmin'],
        'prerequisites' => [],
    ],
];
