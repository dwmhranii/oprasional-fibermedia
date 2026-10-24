<?php

return [
    [
        'group' => 'Dashboard',
        'group_order' => 1,
        'title' => 'Dashboard',
        'icon' => 'LayoutDashboard',
        'route' => '/dashboard',
        'permission' => 'view_dashboard',
        'order' => 1,
        'badge_key' => null,
    ],
    [
        'group' => 'Pengaturan',
        'group_order' => 8,
        'title' => 'Pengguna & Role',
        'icon' => 'Shield',
        'route' => '/superadmin/users',
        'permission' => 'manage_users',
        'order' => 2,
        'badge_key' => null,
    ],
    [
        'group' => 'Pengaturan',
        'group_order' => 8,
        'title' => 'Log Aktivitas',
        'icon' => 'FileText',
        'route' => '/superadmin/audit-logs',
        'permission' => 'view_audit_logs',
        'order' => 3,
        'badge_key' => null,
    ],
];
