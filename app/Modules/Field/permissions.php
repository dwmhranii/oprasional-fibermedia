<?php

return [
    [
        'key' => 'pwa.access',
        'module' => 'field',
        'module_name' => 'Aplikasi Lapangan (/pwa)',
        'label' => 'Buka Aplikasi Lapangan (/pwa)',
        'description' => 'Izin masuk dan mengakses seluruh antarmuka PWA lapangan.',
        'is_locked' => false,
        'is_sensitive' => false,
        'default_roles' => ['Superadmin', 'Admin', 'Teknisi', 'Sales'],
        'prerequisites' => [],
    ],
];
