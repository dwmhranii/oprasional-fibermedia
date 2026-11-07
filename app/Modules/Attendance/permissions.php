<?php

return [
    [
        'key' => 'attendance.self',
        'module' => 'attendance',
        'module_name' => 'Absensi & Tim',
        'label' => 'Absen Harian Mandiri (PWA)',
        'description' => 'Melakukan presensi hadir dan pulang menggunakan verifikasi GPS dan foto selfie.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin', 'Admin', 'Teknisi', 'Sales'],
        'prerequisites' => ['pwa.access'],
    ],
    [
        'key' => 'attendance.view',
        'module' => 'attendance',
        'module_name' => 'Absensi & Tim',
        'label' => 'Melihat Rekap Kehadiran',
        'description' => 'Melihat data presensi harian seluruh staf, rekap bulanan, dan titik kantor.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin'],
        'prerequisites' => [],
    ],
    [
        'key' => 'attendance.manage',
        'module' => 'attendance',
        'module_name' => 'Absensi & Tim',
        'label' => 'Kelola Presensi & Izin Staf',
        'description' => 'Menginput izin, cuti, atau sakit staf serta menyesuaikan catatan kehadiran.',
        'is_locked' => false,
        'is_sensitive' => true,
        'default_roles' => ['Superadmin'],
        'prerequisites' => ['attendance.view'],
    ],
];
