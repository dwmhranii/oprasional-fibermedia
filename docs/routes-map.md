# PEMETAAN LENGKAP RUTE LAMA KE RUTE BARU (ROUTES MAP)
**Dokumen Pemetaan Endpoint API & Rute Frontend Fibermedia-Ops**  
*Tanggal: 25 Oktober 2026 (Revisi Terpadu R1)*

Dokumen ini mencatat seluruh transformasi endpoint backend dan rute halaman frontend dari pola berawalan peran (*role-based*) ke pola berbasis sumber daya bersih (*resource-based*), satu pintu (*single-door 14 menu*), dan jalur `/pwa`.

---

## 1. PEMETAAN RUTE FRONTEND ADMIN

| Rute Lama FE | Rute Baru FE (14 Menu & Tab) | Tindakan / Redirect | Izin Pelindung |
| :--- | :--- | :--- | :--- |
| `/admin` | `/dashboard` | Redirect 301 ke `/dashboard` | `dashboard.view` |
| `/superadmin/dashboard` | `/dashboard` | Redirect 301 ke `/dashboard` | `dashboard.view` |
| `/admin/customers` | `/customers` | Migrasi rute (Tab 1: Daftar) | `customers.view` |
| `/admin/customers/:id` | `/customers/:id` | Migrasi rute detail | `customers.view` |
| `/admin/submissions` | `/customers/submissions` | Migrasi rute (Tab 2: Pengajuan) | `submissions.view` |
| `/submissions` | `/customers/submissions` | Redirect 301 ke `/customers/submissions` | `submissions.view` |
| `/admin/validations` | `/customers/submissions` | Redirect 301 ke `/customers/submissions` | `submissions.view` |
| `/admin/submissions/:id` | `/customers/submissions/:id` | Migrasi rute detail validasi | `submissions.view` |
| `/submissions/:id` | `/customers/submissions/:id` | Redirect 301 ke `/customers/submissions/:id` | `submissions.view` |
| `/admin/complaints` | `/complaints` | Migrasi rute tiket pengaduan | `complaints.view` / `complaints.view_own` |
| `/admin/complaints/new` | `/complaints/new` | Migrasi rute buat tiket | `complaints.create` |
| `/admin/complaints/:id` | `/complaints/:id` | Migrasi rute detail tiket | `complaints.view` / `complaints.view_own` |
| `/admin/psb` | `/psb` | Migrasi rute pemasangan baru | `psb.view` |
| `/admin/provisionings` | `/psb` | Redirect 301 ke `/psb` | `psb.view` |
| `/admin/provisionings/create` | `/psb/create` | Migrasi rute form PSB | `psb.view` |
| `/admin/provisionings/:id` | `/psb/:id` | Migrasi rute detail PSB | `psb.view` |
| `/admin/work-orders` | `/work-orders` | Migrasi rute pantau work order | `workorders.view` |
| `/admin/evidence-review` | `/work-orders` | Redirect 301 ke `/work-orders` | `workorders.view` |
| `/admin/tasks/:id` | `/work-orders/:id` | Migrasi rute detail WO | `workorders.view` |
| `/admin/network/map` | `/network/map` | Migrasi rute peta jaringan | `network.view` |
| `/admin/tracking/live-map` | `/network/map` | Redirect 301 ke `/network/map` | `network.view` |
| `/admin/network/nodes` | `/network/odp` | Redirect 301 ke `/network/odp` | `network.view` |
| `/admin/network/kmz` | `/network/odp?action=import-kmz` | Redirect 301 ke `/network/odp?action=import-kmz` | `network.manage` |
| `/network/kmz` | `/network/odp?action=import-kmz` | Redirect 301 ke `/network/odp?action=import-kmz` | `network.manage` |
| `/network/nodes` | `/network/odp` | Redirect 301 ke `/network/odp` | `network.view` |
| `/admin/network/odcs` | `/network/odc` | Redirect 301 ke `/network/odc` | `network.view` |
| `/admin/network/odps` | `/network/odp` | Redirect 301 ke `/network/odp` | `network.view` |
| `/admin/network/cables` | `/network/cable` | Redirect 301 ke `/network/cable` | `network.view` |
| `/admin/network/bras` | `/network/bras` | Migrasi rute (Tab BRAS) | `network.view` / `bras.manage` |
| `/admin/network/approvals` | `/network/approvals` | Migrasi rute (Tab Persetujuan) | `network.approve` |
| `/admin/attendance/today` | `/attendance/today` | Migrasi rute (Tab Hari Ini) | `attendance.view` |
| `/admin/attendances/daily` | `/attendance/today` | Redirect 301 ke `/attendance/today` | `attendance.view` |
| `/attendance` | `/attendance/today` | Redirect 301 ke `/attendance/today` | `attendance.view` |
| `/admin/attendance/recap` | `/attendance/recap` | Migrasi rute (Tab Rekap) | `attendance.view` |
| `/admin/attendances/recap` | `/attendance/recap` | Redirect 301 ke `/attendance/recap` | `attendance.view` |
| `/admin/office-locations` | `/attendance/offices` | Migrasi rute (Tab Titik Kantor) | `settings.manage` |
| `/admin/teams` | `/teams` | Migrasi rute tim & anggota | `teams.view` |
| `/superadmin/teams` | `/teams` | Redirect 301 ke `/teams` | `teams.view` |
| `/admin/kpi` | `/kpi` | Migrasi rute (Tab Dasbor) | `kpi.view` |
| `/admin/kpi/ratings` | `/kpi/ratings` | Migrasi rute (Tab Rating) | `kpi.view` |
| `/admin/kpi/settings` | `/kpi/settings` | Migrasi rute (Tab Pengaturan) | `kpi.manage` |
| `/admin/packages` | `/catalog` | Migrasi rute katalog & promo | `catalog.view` |
| `/admin/promos` | `/catalog?tab=promo` | Redirect 301 ke `/catalog?tab=promo` | `catalog.view` |
| `/admin/sales-report` | `/reports` | Migrasi rute laporan | `reports.view` |
| `/admin/analytics` | `/reports` | Redirect 301 ke `/reports` | `reports.view` |
| `/admin/users` | `/access/users` | Migrasi rute (Tab Pengguna) | `users.view` |
| `/users` | `/access/users` | Redirect 301 ke `/access/users` | `users.view` |
| `/superadmin/users` | `/access/users` | Redirect 301 ke `/access/users` | `users.view` |
| `/admin/hak-akses` | `/access/roles` | Migrasi rute (Tab Role) | `access.manage` |
| `/admin/roles` | `/access/roles` | Redirect 301 ke `/access/roles` | `access.manage` |
| `/superadmin/roles` | `/access/roles` | Redirect 301 ke `/access/roles` | `access.manage` |
| `/settings/access` | `/access/roles` | Redirect 301 ke `/access/roles` | `access.manage` |
| `/admin/devices` | `/access/devices` | Migrasi rute (Tab Perangkat) | `devices.view` |
| `/devices` | `/access/devices` | Redirect 301 ke `/access/devices` | `devices.view` |
| `/admin/activity-log` | `/settings/activity-log` | Migrasi rute (Tab Log Aktivitas) | `audit.view` |
| `/activity-log` | `/settings/activity-log` | Redirect 301 ke `/settings/activity-log` | `audit.view` |
| `/superadmin/audit-logs` | `/settings/activity-log` | Redirect 301 ke `/settings/activity-log` | `audit.view` |
| `/admin/settings/dispatch` | `/settings/dispatch` | Migrasi rute (Tab Dispatch) | `settings.manage` |
| `/admin/dispatch` | `/settings/dispatch` | Redirect 301 ke `/settings/dispatch` | `settings.manage` |

---

## 2. PEMETAAN RUTE FRONTEND PWA LAPANGAN (`/pwa/*`)

| Rute Lama (Host PWA) | Rute Baru PWA | Tindakan / Redirect | Izin Pelindung |
| :--- | :--- | :--- | :--- |
| `/` | `/pwa` | Redirect ke `/pwa/work-orders` | `pwa.access` |
| `/work-orders` | `/pwa/work-orders` | Migrasi rute PWA | `pwa.access`, `tasks.view_assigned` |
| `/work-orders/:id` | `/pwa/work-orders/:id` | Migrasi rute detail PWA | `pwa.access`, `tasks.view_assigned` |
| `/attendance` | `/pwa/attendance` | Migrasi rute absensi PWA | `pwa.access`, `attendance.self` |
| `/map` | `/pwa/map` | Migrasi rute peta PWA | `pwa.access`, `network.view` |
| `/submissions` | `/pwa/submissions` | Migrasi rute pengajuan PWA | `pwa.access`, `submissions.view_own` |
| `/submissions/new` | `/pwa/submissions/new` | Migrasi rute form survei PWA | `pwa.access`, `submissions.create` |
| `/outbox` | `/pwa/outbox` | Migrasi rute antrean offline PWA | `pwa.access` |
| `/me` | `/pwa/me` | Migrasi rute profil PWA | `pwa.access` |
| `/login` (mode mobile) | `/pwa/login` | Migrasi rute login PWA | Publik |

---

## 3. PEMETAAN ENDPOINT BACKEND REST API

Seluruh 191 endpoint backend yang sebelumnya mengandung `/admin/*`, `/superadmin/*`, `/teknisi/*`, dan `/sales/*` telah dimigrasikan ke endpoint sumber daya murni tanpa segmen nama role:

| Endpoint Lama Backend | Endpoint Baru Backend | Nama Rute Laravel | Izin / Policy |
| :--- | :--- | :--- | :--- |
| `GET /api/superadmin/me`, `GET /api/admin/me` | `GET /api/me` | `api.me` | Terotentikasi |
| `GET /api/admin/customers` | `GET /api/customers` | `customers.index` | `customers.view` |
| `POST /api/admin/customers` | `POST /api/customers` | `customers.store` | `customers.create` |
| `GET /api/admin/customers/{id}` | `GET /api/customers/{id}` | `customers.show` | `customers.view` |
| `PUT /api/admin/customers/{id}` | `PUT /api/customers/{id}` | `customers.update` | `customers.update` |
| `DELETE /api/admin/customers/{id}` | `DELETE /api/customers/{id}` | `customers.destroy` | `customers.delete` |
| `GET /api/admin/submissions`, `GET /api/sales/submissions` | `GET /api/submissions` | `submissions.index` | `submissions.view` / `submissions.view_own` |
| `POST /api/sales/submissions` | `POST /api/submissions` | `submissions.store` | `submissions.create` |
| `GET /api/admin/submissions/{id}`, `GET /api/sales/submissions/{id}` | `GET /api/submissions/{id}` | `submissions.show` | `submissions.view` / `submissions.view_own` |
| `GET /api/admin/complaints`, `GET /api/teknisi/complaints` | `GET /api/complaints` | `complaints.index` | `complaints.view` / `complaints.view_own` |
| `POST /api/admin/complaints` | `POST /api/complaints` | `complaints.store` | `complaints.create` |
| `GET /api/admin/complaints/{id}`, `GET /api/teknisi/complaints/{id}` | `GET /api/complaints/{id}` | `complaints.show` | `complaints.view` / `complaints.view_own` |
| `GET /api/admin/work-orders`, `GET /api/teknisi/work-orders` | `GET /api/work-orders` | `work_orders.index` | `workorders.view` / `tasks.view_assigned` |
| `GET /api/admin/work-orders/{id}`, `GET /api/teknisi/work-orders/{id}` | `GET /api/work-orders/{id}` | `work_orders.show` | `workorders.view` / `tasks.view_assigned` |
| `GET /api/kpi/sales/{user}/{period}` | `GET /api/kpi/acquisitions/{user}/{period}` | `kpi.acquisitions.show` | `kpi.view` / `kpi.view_own` |
| `GET /api/kpi/technician/{user}/{period}` | `GET /api/kpi/operations/{user}/{period}` | `kpi.operations.show` | `kpi.view` / `kpi.view_own` |
| `GET /api/superadmin/users`, `GET /api/admin/users` | `GET /api/users` | `users.index` | `users.view` |
| `POST /api/superadmin/users` | `POST /api/users` | `users.store` | `users.manage` |
| `GET /api/superadmin/roles`, `GET /api/admin/roles` | `GET /api/roles` | `roles.index` | `access.manage` |
| `GET /api/superadmin/roles/catalog` | `GET /api/roles/catalog` | `roles.catalog` | `access.manage` |
| `GET /api/superadmin/roles/{role}/permissions` | `GET /api/roles/{role}/permissions` | `roles.permissions.show` | `access.manage` |
| `PUT /api/superadmin/roles/{role}/permissions` | `PUT /api/roles/{role}/permissions` | `roles.permissions.update`| `access.manage` |
| `GET /api/superadmin/permissions` | `GET /api/permissions` | `permissions.index` | `access.manage` |
