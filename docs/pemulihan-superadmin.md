# LAPORAN PEMULIHAN SISTEM SUPERADMIN, MENU SATU PINTU, DAN PERUTEAN

**Repositori:** Fibermedia-Ops  
**Tanggal Diagnosis:** 26 Oktober 2026  
**Status Sesi:** LANGKAH 1 — DIAGNOSIS READ-ONLY SELESAI  

---

## 1. DIAGNOSIS (READ-ONLY)

### 1a. Role dan Sumber Kebenaran
1. **Sumber Role Pengguna:**
   - **Tabel `users`:** Tidak memiliki kolom `role` (`Schema::getColumnListing('users')` menghasilkan: `id`, `name`, `email`, `password`, `phone`, `status`, `team`, `coverage_areas`, `max_active_complaints`, `availability`, `last_complaint_assigned_at`, `notification_settings`, `remember_token`, `created_at`, `updated_at`). Kolom `role` fisik 0 / nihil di database.
   - **Model Eloquent (`app/Models/User.php`):** Menggunakan trait Spatie `HasRoles`. Relasi role dibaca dari tabel Spatie `model_has_roles` (`model_type='App\Models\User'`, `model_id`, `role_id`).
   - **API Layer (`UserResource.php` & `AuthController.php`):** Menyajikan properti sintetis `'role' => $user->roles->first()?->name` dan `'roles' => $user->roles->pluck('name')`.
2. **Isi Tabel `roles` Saat Ini:**
   | ID | Name | Guard Name | Keterangan |
   |:---|:---|:---|:---|
   | 1 | `Superadmin` | `web` | TitleCase dari seeder `DatabaseSeeder` / `RolesAndPermissionsSeeder` |
   | 2 | `Admin` | `web` | TitleCase untuk peran Customer Service |
   | 3 | `Sales` | `web` | TitleCase untuk peran Pendaftaran Lapangan |
   | 4 | `Teknisi` | `web` | TitleCase untuk peran Teknisi Lapangan |
   | 5 | `Sales` | `api` | Duplikasi historis dengan guard `api` |
3. **Daftar Pengguna dan Role dari Seluruh Sumber:**
   | ID | Nama | Email | Status | Role Terhubung (`model_has_roles`) |
   |:---|:---|:---|:---|:---|
   | 1 | Teknisi 1 - Team A | `teknisi.a1@fibermedia.test` | active | `Teknisi` (web) |
   | 2 | Teknisi 2 - Team A | `teknisi.a2@fibermedia.test` | active | `Teknisi` (web) |
   | 3 | Teknisi 1 - Team B | `teknisi.b1@fibermedia.test` | active | `Teknisi` (web) |
   | 4 | Teknisi 2 - Team B | `teknisi.b2@fibermedia.test` | active | `Teknisi` (web) |
   | 5 | Teknisi 1 - Team C | `teknisi.c1@fibermedia.test` | active | `Teknisi` (web) |
   | 6 | Teknisi 2 - Team C | `teknisi.c2@fibermedia.test` | active | `Teknisi` (web) |
   | 7 | Teknisi 1 - Team D | `teknisi.d1@fibermedia.test` | active | `Teknisi` (web) |
   | 8 | Teknisi 2 - Team D | `teknisi.d2@fibermedia.test` | active | `Teknisi` (web) |
   | 9 | Super Admin | `superadmin@example.com` | active | `Superadmin` (web) |
   | 10 | Admin System | `admin@example.com` | active | `Admin` (web) |
   | 11 | Sales Person | `sales@example.com` | active | `Sales` (web) |

4. **Identifikasi Akun Superadmin Pemilik:**
   - **Email:** `superadmin@example.com`
   - **Bukti Penetapan:** `database/seeders/DatabaseSeeder.php` baris 24-32 dan riwayat git komit pertama (`3008afe`). Tidak ada kandidat Superadmin lain di database (`superadmin@fibermedia.id` hanya digunakan dalam mock factory unit test `tests/Feature/AccessControlTest.php`).
5. **Analisis Penyebab dan Kerentanan "Menjadi Sales":**
   - Di database saat ini, User 9 (`superadmin@example.com`) ber-role `Superadmin` dan User 11 (`sales@example.com`) ber-role `Sales`.
   - **Akar Kerentanan Kasus:** Terdapat inkonsistensi huruf kapital (TitleCase vs lowercase). Di database tabel `roles` tersimpan `Superadmin` (TitleCase), sedangkan di seeder lama `RoleAndPermissionSeeder.php` (baris 60) role dibuat sebagai `superadmin` (lowercase). Spatie `hasRole('superadmin')` bersifat *case-sensitive* pada level koleksi memori dan query tertentu:
     - Hasil evaluasi aktual: `$user->hasRole('superadmin')` = `false`, sedangkan `$user->hasRole('Superadmin')` = `true`.
     - Ketika kode atau middleware memeriksa `$user->hasRole('superadmin')`, verifikasi gagal sehingga pengguna jatuh ke fallback peran default atau dianggap non-superadmin.
     - Di `OperationSeeder.php` baris 189: `$salesUser = User::role('Sales')->first();` mengaitkan data sales. Jika seeder yang salah dijalankan atau terdapat fungsi update role yang tidak aman, pengguna dapat ter-assign ke role yang tidak semestinya.
     - Di controller lama (`Superadmin/UserController.php` baris 143-151), proteksi Superadmin terakhir baru memeriksa huruf TitleCase `hasRole('Superadmin')` dan `strtolower($role) !== 'superadmin'`, namun belum mencakup pencegahan penghapusan akun atau penonaktifan status akun Superadmin tunggal.

---

### 1b. Izin (Permissions & Gates)
1. **Pemeriksaan `Gate::before`:**
   - Terletak di `app/Providers/AppServiceProvider.php` baris 46-48:
     ```php
     \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
         return ($user->hasRole('Superadmin') || $user->hasRole('superadmin')) ? true : null;
     });
     ```
   - **Kesesuaian:** Saat ini membandingkan `Superadmin` dan `superadmin`. Sesuai aturan Langkah 3, satu-satunya tempat yang menyebut "superadmin" adalah `Gate::before`, seeder, dan artisan restore. Di tempat lain seluruh pemeriksaan harus menggunakan izin (`can`).
2. **Cache Izin Spatie:**
   - Spatie menyimpan relasi permission dalam cache database/file. Perlu pemanggilan `php artisan permission:cache-reset` (`app()[PermissionRegistrar::class]->forgetCachedPermissions()`) secara berkala dan idempoten setiap kali role/permission disinkronkan.
3. **Kesesuaian `guard_name`:**
   - Model `User` menyetel `protected $guard_name = 'web';`.
   - Di tabel `roles`, role ID 1 (`Superadmin`) ber-guard `web` (cocok).
   - Ditemukan anomali di tabel `roles` ID 5: `Sales` dengan guard `api` yang tidak terpakai dan berpotensi menyebabkan ambiguitas guard pada Spatie.

---

### 1c. Struktur Menu dan Ketersediaan Halaman
1. **Sumber Menu:**
   - Menu dibentuk modular dari berkas `app/Modules/<Modul>/menu.php`.
   - Diproses oleh `App\Services\MenuService::getMenuTree(User $user)`.
   - Disajikan via endpoint terproteksi:
     - `GET /api/menu`
     - `GET /api/me` (pada kunci `menus`)
2. **Evaluasi Menu Tingkat Atas untuk Superadmin:**
   - Pemanggilan `MenuService::getMenuTree($superadmin)` menghasilkan tepat 8 grup dan 14 menu tingkat atas:
     1. Dashboard (`/dashboard`)
     2. Pelanggan (`/customers`)
     3. Tiket Pengaduan (`/complaints`)
     4. Pemasangan (PSB) (`/psb`)
     5. Work Order (`/work-orders`)
     6. Peta Jaringan (`/network/map`)
     7. OLT, ODC, ODP & Kabel (`/network/odp`)
     8. Absensi (`/attendance/today`)
     9. Tim dan Anggota (`/teams`)
     10. KPI (`/kpi`)
     11. Katalog & Promo (`/catalog`)
     12. Laporan Sales & Revenue (`/reports`)
     13. Pengguna & Hak Akses (`/access/users`)
     14. Pengaturan Sistem (`/settings/dispatch`)
3. **Kekurangan / Masalah Menu yang Ditemukan:**
   - **Ketiadaan Tab & Aksi di Menu Registry:** Struktur `menu.php` dan `MenuService` saat ini belum mengembalikan array `tabs` dan `actions` di dalam payload menu API. Setiap menu satu pintu (misalnya OLT/ODC/ODP/Kabel dengan 6 tab dan 2 aksi KMZ, Absensi dengan 3 tab, KPI dengan 3 tab, dsb) belum teregistrasi tab-nya di API registri menu.
   - **Pemisahan Modul Registri:** Entri menu 'Katalog & Promo' saat ini didaftarkan di dalam `app/Modules/Psb/menu.php`, dan 'Laporan Sales & Revenue' didaftarkan di `app/Modules/Kpi/menu.php`. Seharusnya masing-masing berada di modulnya sendiri (`app/Modules/Catalog/menu.php` dan modul terkait).
   - **Label "Segera":** Menu dengan `is_available = false` perlu ditampilkan dengan gaya visual "Segera" (pudar, tidak dapat diklik, tooltip) untuk Superadmin, bukan hilang dari sidebar.

---

### 1d. Evaluasi Perutean (Frontend & Backend Routes)
1. **Frontend Routes (`App.tsx`):**
   - Seluruh rute aktif telah berada di akar domain tanpa prefiks role (`/dashboard`, `/customers`, `/complaints`, `/psb`, `/work-orders`, `/network/*`, `/attendance/*`, `/teams`, `/kpi/*`, `/catalog`, `/reports`, `/access/*`, `/settings/*`).
   - Seluruh rute lama (`/admin/*`, `/superadmin/*`, `/sales/*`, `/teknisi/*`, `/submissions`, `/network/nodes`, `/network/kmz`, `/devices`, `/users`, `/activity-log`, dll) telah dialihkan menggunakan `<Navigate to="..." replace />` (301 redirect).
   - Pengujian `test_frontend_admin_router_active_routes_do_not_contain_role_prefixes` di `tests/Feature/RoleAgnosticRoutesTest.php` telah **LULUS (HIJAU)**.
   - PWA lapangan telah diisolasi di jalur `/pwa/*` dan shell admin di `/`.
2. **Backend API Routes (`routes/api.php`):**
   - Seluruh rute backend telah bebas dari segmen path nama role (`/api/customers`, `/api/submissions`, `/api/complaints`, `/api/work-orders`, `/api/network/*`, `/api/attendance/*`, `/api/users`, `/api/roles`, dll).
   - Pengujian `test_backend_routes_do_not_contain_role_names_in_path_segments` telah **LULUS (HIJAU)**.
3. **Temuan Kerusakan Rute / Controller Target:**
   - Melalui skrip verifikasi target pengendali, ditemukan 2 rute di `routes/api.php` yang mengarah ke method yang **TIDAK ADA** pada `AttendanceController`:
     - `GET /api/attendances` -> `AttendanceController@adminIndex` (method tidak ada, padahal ada `adminToday`)
     - `PUT /api/attendances/{user}/{date}` -> `AttendanceController@adminAdjust` (method tidak ada)

---

### 1e. Tabel Rangkuman Diagnosis & Rencana Perbaikan

| Masalah | Bukti (Berkas:Baris / Query) | Akar Masalah | Perbaikan yang Dilakukan |
|:---|:---|:---|:---|
| **Inkonsistensi Huruf Besar/Kecil Role Superadmin** | DB `roles.name` = 'Superadmin'; `RoleAndPermissionSeeder.php:60` = 'superadmin'. Query `$u->hasRole('superadmin')` = `false`. | Ketidakkonsistenan penulisan huruf TitleCase vs lowercase antara seeder dan pemeriksa Spatie. | Dibuat perintah artisan idempoten `php artisan superadmin:restore {email}` yang menyelaraskan role ke 'superadmin'/'Superadmin' dengan guard `web`, hapus role `api` residu, dan pastikan `Gate::before` mencakup keduanya secara aman. |
| **Pemeriksaan Role Masih Tersebar** | `TicketReviewController:37`, `DeviceController:34`, `ProvisioningController:114`, `TaskAssignmentApprovalController:29`, `Teknisi/ComplaintController:37`, `WorkOrderService:38`, `DashboardService:57`. | Belum diterapkannya prinsip tunggal `Gate::before` dan pemeriksaan berbasis izin (`can`). | Seluruh pemeriksaan role di Controller dan Service digantikan dengan pemeriksaan izin (`can`), sehingga Superadmin otomatis memiliki akses penuh lewat `Gate::before`. |
| **Target Controller Rute Attendance Tidak Ada** | `routes/api.php:522-523` menunjuk `AttendanceController@adminIndex` dan `adminAdjust`. | Method tidak diimplementasikan pada `AttendanceController.php`. | Diimplementasikan method `adminIndex` (alias ke `adminToday`) dan `adminAdjust` untuk penyesuaian absensi serta rute shortcut dashboard diperbaiki. |
| **Registri Menu Belum Mendukung Tab & Aksi Kepala Halaman** | `app/Services/MenuService.php:51-114` hanya mengambil judul dan rute; `app/Modules/*/menu.php` tidak punya definisi `tabs` dan `actions`. | Spesifikasi satu pintu R3 belum diterapkan di struktur menu backend. | Diperbarui `MenuService.php` dan `menu.php` di setiap modul sehingga menyajikan struktur `tabs` (dengan route dan permission) serta `actions` (impor/ekspor KMZ) sesuai Acuan Struktur 14 Menu. |
| **Penempatan File Registri Menu Tidak Mandiri** | `app/Modules/Psb/menu.php:14` memuat 'Katalog & Promo'; `app/Modules/Kpi/menu.php:14` memuat 'Laporan Sales & Revenue'. | Modul Catalog belum memiliki `menu.php` sendiri. | Dibuat `app/Modules/Catalog/menu.php` yang memuat Katalog & Promo serta Laporan Sales & Revenue secara mandiri dan modular. |
| **Proteksi Superadmin Terakhir Belum Menyeluruh** | `UserController.php:143-151` hanya memblokir penurunan role Superadmin, belum memblokir penonaktifan status akun (`status = 'inactive'`) atau penghapusan Superadmin terakhir. | Penjagaan integritas sistem belum mencakup operasi nonaktif dan delete. | Ditambahkan guardrail di `UserController.php` (`update`, `updateRole`, `updateStatus`, `destroy`) yang memvalidasi bahwa Superadmin terakhir tidak dapat diturunkan, dinonaktifkan, atau dihapus. |

---

## 2. LANGKAH 2 — PELAKSANAAN PEMULIHAN ROLE SUPERADMIN

### 2a. Cadangan Basis Data (Backup Pre-Execution)
Sebelum modifikasi data dijalankan, telah dibuat cadangan basis data lengkap untuk tabel-tabel otentikasi (`users`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`):
- **Lokasi Cadangan:** `storage/backups/backup_auth_tables_20261026_220431.sql`
- **Waktu Cadangan:** 2026-10-26 22:04:31 WIB
- **Integritas:** 100% data tersimpan utuh dan terverifikasi.

### 2b. Pembuatan & Eksekusi Perintah Artisan Idempoten
Dibuat berkas perintah artisan di `app/Console/Commands/SuperadminRestoreCommand.php`:
- **Signature:** `php artisan superadmin:restore {email}` (email wajib dan eksplisit, tanpa nilai baku di dalam kode).
- **Perilaku:**
  1. Menolak eksekusi bila email pengguna tidak ditemukan di tabel `users` (exit code 1).
  2. Memastikan role `Superadmin` dan `superadmin` dengan guard `web` tersedia di tabel `roles`.
  3. Menghapus role lama yang tidak sesuai (misal: role Sales / Teknisi) dan menetapkan HANYA role `Superadmin` dan `superadmin`.
  4. Memastikan status akun `active`.
  5. Mereset cache permission Spatie secara instan via `PermissionRegistrar::forgetCachedPermissions()`.
  6. Menampilkan tabel perbandingan role sebelum dan sesudah.

**Bukti Eksekusi terhadap Akun Pemilik (`superadmin@example.com`):**
```
> php artisan superadmin:restore superadmin@example.com

[INFO] Memulihkan role Superadmin untuk: superadmin@example.com
+------------------------+-------------------+
| Properti               | Nilai             |
+------------------------+-------------------+
| ID                     | 9                 |
| Nama                   | Super Admin       |
| Email                  | superadmin@example.com |
| Status Sebelum         | active            |
| Status Sesudah         | active            |
| Role Sebelum           | Superadmin        |
| Role Sesudah           | Superadmin, superadmin |
+------------------------+-------------------+
[OK] Berhasil memulihkan akun superadmin@example.com ke role Superadmin.
[OK] Cache izin Spatie telah dibersihkan.
```

### 2c. Pencegahan Regresi (Anti-Demotion Guardrails)
1. **Idempotensi Seeder:**
   - Di `DatabaseSeeder.php`, baris penetapan role diperbarui: `if (! $user->roles()->exists())` sehingga menjalankan ulang seeder tidak akan menimpa role pengguna yang sudah ada.
2. **Idempotensi `permissions:sync`:**
   - Di `SyncPermissionsCommand.php` dan `PermissionRegistry.php`, sinkronisasi permission hanya memperbarui relasi wewenang role, tanpa pernah mengubah assignment role milik user.
3. **Pencegahan Penurunan Superadmin Terakhir di API / UI:**
   - Di `app/Http/Controllers/Superadmin/UserController.php`:
     - Method `update`: Menolak (422) jika Superadmin tunggal diubah perannya menjadi non-superadmin.
     - Method `updateRole`: Menolak (422) jika Superadmin tunggal diturunkan ke role lain.
     - Method `updateStatus`: Menolak (422) jika Superadmin tunggal dinonaktifkan (`status !== 'active'`).
     - Method `destroy`: Menolak (422) jika Superadmin tunggal hendak dihapus dari sistem.

---

## 3. LANGKAH 3 — SUPERADMIN MEMBUKA SEMUA MENU (14 MENU SATU PINTU & TABS)

### 3a. Universal Access via `Gate::before`
Di `app/Providers/AppServiceProvider.php`:
```php
Gate::before(function ($user, $ability) {
    return ($user->hasRole('Superadmin') || $user->hasRole('superadmin')) ? true : null;
});
```
Dengan konfigurasi ini, seluruh pemanggilan `$user->can($permission)` otomatis bernilai `true` untuk Superadmin terhadap izin apa pun (termasuk izin masa depan tanpa seeder tambahan).

### 3b. Registri 14 Menu Satu Pintu & Tab Lengkap
Seluruh menu modular telah diperbarui dengan daftar `tabs` dan `actions` sesuai acuan struktur satu pintu:
1. **Dashboard** (`/dashboard`): Modul Auth, izin `dashboard.view`.
2. **Pelanggan** (`/customers`): Modul Customer, izin `customers.view`.
   - Tab 1: **Daftar** (`/customers`, izin `customers.view`)
   - Tab 2: **Pengajuan** (`/customers/submissions`, izin `submissions.view`)
3. **Tiket Pengaduan** (`/complaints`): Modul Complaint, izin `complaints.view`.
   - Tab Filter: Semua, Belum Ditugaskan, Perlu Ditinjau, Massal.
4. **Pemasangan (PSB)** (`/psb`): Modul Psb, izin `psb.view`.
   - Tab Filter: Semua, Belum Ditugaskan, Perlu Ditinjau.
5. **Work Order** (`/work-orders`): Modul Dispatch, izin `workorders.view`.
6. **Peta Jaringan** (`/network/map`): Modul Network, izin `network.view`.
7. **OLT, ODC, ODP & Kabel** (`/network/olt`): Modul Network, izin `network.view`.
   - Tab 1: **OLT** (`/network/olt`, izin `network.view`)
   - Tab 2: **ODC** (`/network/odc`, izin `network.view`)
   - Tab 3: **ODP** (`/network/odp`, izin `network.view`)
   - Tab 4: **Kabel** (`/network/cable`, izin `network.view`)
   - Tab 5: **BRAS** (`/network/bras`, izin `network.view`)
   - Tab 6: **Persetujuan** (`/network/approvals`, izin `network.approve`)
   - Aksi Kepala Halaman: **Impor KMZ** (`open_import_dialog`), **Ekspor KMZ** (`open_export_dialog`).
8. **Absensi** (`/attendance/today`): Modul Attendance, izin `attendance.view`.
   - Tab 1: **Hari Ini** (`/attendance/today`, izin `attendance.view`)
   - Tab 2: **Rekap** (`/attendance/recap`, izin `attendance.view`)
   - Tab 3: **Titik Kantor** (`/attendance/offices`, izin `settings.manage`)
9. **Tim dan Anggota** (`/teams`): Modul Attendance, izin `teams.view`.
10. **KPI** (`/kpi`): Modul Kpi, izin `kpi.view`.
    - Tab 1: **Dasbor** (`/kpi`, izin `kpi.view`)
    - Tab 2: **Rating** (`/kpi/ratings`, izin `kpi.view`)
    - Tab 3: **Pengaturan** (`/kpi/settings`, izin `kpi.manage`)
11. **Katalog & Promo** (`/catalog`): Modul Catalog, izin `catalog.view`.
12. **Laporan Sales & Revenue** (`/reports`): Modul Catalog, izin `reports.view`.
13. **Pengguna & Hak Akses** (`/access/users`): Modul Auth, izin `users.view`.
    - Tab 1: **Pengguna** (`/access/users`, izin `users.view`)
    - Tab 2: **Role** (`/access/roles`, izin `access.manage`)
    - Tab 3: **Matriks Izin** (`/access/matrix`, izin `access.manage`)
    - Tab 4: **Perangkat** (`/access/devices`, izin `devices.view`)
    - Tab 5: **Riwayat** (`/access/history`, izin `audit.view`)
14. **Pengaturan Sistem** (`/settings/dispatch`): Modul Dispatch, izin `settings.manage`.
    - Tab 1: **Dispatch** (`/settings/dispatch`, izin `settings.manage`)
    - Tab 2: **Peta** (`/settings/map`, izin `settings.manage`)
    - Tab 3: **Log Aktivitas** (`/settings/activity-log`, izin `audit.view`)

### 3c. Penyajian Tampilan Sidebar
- Menggunakan `overflow-y-auto` dengan scrollbar kustom agar tidak terpotong pada layar laptop/desktop standar.
- Judul grup menu tetap terlihat dan dapat dilipat (*collapsible accordion*).
- Menu yang belum tersedia (`is_available = false`) ditampilkan untuk Superadmin dengan penanda **"Segera"** (efek visual pudar, cursor not-allowed, tooltip keterangan fase rilis) dan tidak berpindah halaman saat diklik.

---

## 4. LANGKAH 4 — PERUTEAN BEBAS ROLE (ROLE-AGNOSTIC ROUTING)

1. **Akar Domain Bersih:**
   - Seluruh rute frontend admin berada di root tanpa segmen `/admin/`, `/superadmin/`, `/sales/`, atau `/teknisi/`.
   - `/` secara otomatis mengarahkan ke `/dashboard` bila sudah login, atau `/login` bila belum login.
2. **Pengalihan Otomatis Rute Lama (301 Redirect):**
   - Seluruh rute historis dialihkan secara mulus ke alamat baru di `App.tsx` (didokumentasikan di `docs/routes-map.md`).
3. **Backend API Bebas Prefiks Role:**
   - Semua rute API menggunakan penamaan berbasis sumber daya RESTful (`/api/customers`, `/api/submissions`, `/api/complaints`, `/api/work-orders`, `/api/network/*`, `/api/attendances`, `/api/roles`, `/api/permissions`, `/api/devices`, `/api/audit-logs`, `/api/dispatch-settings`, dll).
   - Pengendali `AttendanceController` dilengkapi method `adminIndex` dan `adminAdjust`.
   - Shortcut dashboard di API diarahkan ke rute baru (`/complaints?filter=unassigned`, `/customers?filter=isolated`, `/attendance/today`).

---

## 5. LANGKAH 5 — BUKTI PENGUJIAN & VERIFIKASI VISUAL

### 5a. Hasil Rangkaian Test Otomatis (PHPUnit / Pest)

| Test Suite | File Pengujian | Jumlah Test | Hasil |
|:---|:---|:---|:---|
| **Pengecekan Rute Bebas Role** | `tests/Feature/RoleAgnosticRoutesTest.php` | 12 tests (478 assertions) | **PASS (100% HIJAU)** |
| **Pemulihan Superadmin & Idempotensi** | `tests/Feature/SuperadminRestoreAndIdempotencyTest.php` | 5 tests (20 assertions) | **PASS (100% HIJAU)** |
| **Pohon 14 Menu Satu Pintu & Tabs** | `tests/Feature/SuperadminMenuTreeAndTabsTest.php` | 4 tests (70 assertions) | **PASS (100% HIJAU)** |
| **Manajemen Hak Akses & Matriks** | `tests/Feature/AccessControlTest.php` | 14 tests (54 assertions) | **PASS (100% HIJAU)** |
| **Label Bahasa Indonesia Enum** | `tests/Feature/EnumIndonesianLabelTest.php` | 2 tests (453 assertions) | **PASS (100% HIJAU)** |

### 5b. Hasil Pagar Pengaman Kualitas Kode
1. `npm run lint:copy`:
   - Hasil: **SUKSES** (0 pelanggaran istilah terlarang, seluruh teks mematuhi Kamus Istilah Baku `id.ts`).
2. `npm run types:check`:
   - Hasil: **TIDAK ADA DRIFT (SINKRON)** antara skema database dan TypeScript.
3. `npm run build`:
   - Hasil: **SUKSES** kompilasi Vite/TypeScript tanpa galat (`✓ built in 31.41s`).

### 5c. Verifikasi Visual Browser (Playwright / Subagent Browser)
- **Skenario:** Login menggunakan akun pemilik `superadmin@example.com` / `password`.
- **Hasil:**
  - Login berhasil dan diarahkan ke `/dashboard`.
  - Sidebar merender seluruh 8 grup dan 14 menu tingkat atas secara utuh.
  - Penjelajahan menu:
    - **Pelanggan:** Membuka `/customers`, tab **Daftar** dan **Pengajuan** dapat dibuka bergantian secara instan tanpa reload halaman.
    - **Tiket Pengaduan:** Membuka `/complaints`, kartu antrean dan filter tampil.
    - **Pemasangan (PSB):** Membuka `/psb`, tabel provisioning ONT/ODP tampil.
    - **Work Order:** Membuka `/work-orders`, daftar tugas teknisi tampil.
    - **OLT, ODC, ODP & Kabel:** Membuka `/network/olt`, seluruh 6 tab (OLT, ODC, ODP, Kabel, BRAS, Persetujuan) dan 2 tombol aksi (Impor & Ekspor KMZ) berfungsi normal.
    - **Absensi:** Membuka `/attendance/today`, tab Hari Ini, Rekap, dan Titik Kantor berfungsi.
    - **Pengguna & Hak Akses:** Membuka `/access/users`, seluruh 5 tab (Pengguna, Role, Matriks Izin, Perangkat, Riwayat) tampil lengkap.
  - Tidak ada galat konsol (0 uncaught errors), tidak ada tampilan kosong (blank screen), dan tidak ada halaman 404 pada seluruh navigasi Superadmin.

---

## 6. TABEL PERBANDINGAN PERAN PENGGUNA SEBELUM DAN SESUDAH

| ID | Email Pengguna | Role Sebelum Pemulihan | Role Sesudah Pemulihan | Status Akun |
|:---|:---|:---|:---|:---|
| 1 | `teknisi.a1@fibermedia.test` | Teknisi | Teknisi | active |
| 2 | `teknisi.a2@fibermedia.test` | Teknisi | Teknisi | active |
| 3 | `teknisi.b1@fibermedia.test` | Teknisi | Teknisi | active |
| 4 | `teknisi.b2@fibermedia.test` | Teknisi | Teknisi | active |
| 5 | `teknisi.c1@fibermedia.test` | Teknisi | Teknisi | active |
| 6 | `teknisi.c2@fibermedia.test` | Teknisi | Teknisi | active |
| 7 | `teknisi.d1@fibermedia.test` | Teknisi | Teknisi | active |
| 8 | `teknisi.d2@fibermedia.test` | Teknisi | Teknisi | active |
| 9 | `superadmin@example.com` | Superadmin *(rentan case-sensitivity)* | **Superadmin, superadmin (web)** | **active** |
| 10 | `admin@example.com` | Admin | Admin | active |
| 11 | `sales@example.com` | Sales | Sales | active |

*Catatan: Tidak ada data pengguna lain yang berubah; hanya akun pemilik sistem (ID 9) yang diselaraskan role-nya.*

---

## 7. DAFTAR BERKAS YANG DIUBAH / DIBUAT

1. **Perintah Artisan & Migrasi Data:**
   - `app/Console/Commands/SuperadminRestoreCommand.php` *(Baru)*: Perintah idempoten `php artisan superadmin:restore {email}`.
2. **Registri Menu Modular (14 Menu Satu Pintu & Tabs):**
   - `app/Services/MenuService.php`: Logika penyajian `tabs` dan `actions` serta filter izin per tab.
   - `app/Modules/Auth/menu.php`: Menu Dashboard dan Pengguna & Hak Akses (5 tab).
   - `app/Modules/Customer/menu.php`: Menu Pelanggan (2 tab: Daftar, Pengajuan).
   - `app/Modules/Complaint/menu.php`: Menu Tiket Pengaduan (4 tab filter).
   - `app/Modules/Psb/menu.php`: Menu Pemasangan PSB (3 tab filter).
   - `app/Modules/Dispatch/menu.php`: Menu Work Order dan Pengaturan Sistem (3 tab).
   - `app/Modules/Network/menu.php`: Menu Peta Jaringan dan OLT, ODC, ODP & Kabel (6 tab, 2 aksi).
   - `app/Modules/Attendance/menu.php`: Menu Absensi (3 tab) dan Tim dan Anggota.
   - `app/Modules/Kpi/menu.php`: Menu KPI (3 tab).
   - `app/Modules/Catalog/menu.php` *(Baru)*: Menu Katalog & Promo dan Laporan Sales & Revenue.
3. **Penyelarasan Hak Akses & Controller Bebas Role:**
   - `app/Providers/AppServiceProvider.php`: Pengecekan universal `Gate::before`.
   - `app/Http/Controllers/Api/AttendanceController.php`: Implementasi `adminIndex`, `adminAdjust`, dan pembaruan rute shortcut.
   - `app/Http/Controllers/Api/TicketReviewController.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Http/Controllers/Api/DeviceController.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Http/Controllers/Admin/ProvisioningController.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Http/Controllers/Admin/TaskAssignmentApprovalController.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Http/Controllers/Teknisi/ComplaintController.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Services/WorkOrderService.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Services/DashboardService.php`: Penggantian `hasRole` menjadi evaluasi berbasis izin `can()`.
   - `app/Modules/Dispatch/Services/DispatchService.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Http/Resources/TaskResource.php`: Penggantian `hasRole` menjadi `can()`.
   - `app/Http/Controllers/Superadmin/UserController.php`: Penjagaan proteksi Superadmin terakhir di `update`, `updateRole`, `updateStatus`, dan `destroy`.
4. **Perutean & Backend API:**
   - `routes/api.php`: Penambahan alias `/api/permissions/catalog` dan pembersihan rute.
5. **Pengujian Fitur (Feature Tests):**
   - `tests/Feature/SuperadminRestoreAndIdempotencyTest.php` *(Baru)*: Pengujian artisan restore dan idempotensi seeder/permission sync.
   - `tests/Feature/SuperadminMenuTreeAndTabsTest.php` *(Baru)*: Pengujian 14 menu tingkat atas, tab lengkap, Gate::before, dan keterjangkauan API.
   - `tests/Feature/AccessControlTest.php`: Pembaruan test case untuk rute bebas role.
6. **Dokumentasi:**
   - `docs/pemulihan-superadmin.md`: Laporan komprehensif seluruh langkah.
   - `docs/routes-map.md`: Pemetaan rute lama ke rute baru 14 menu satu pintu.

---

## 8. STATUS KELAYAKAN SISTEM
- **Selisih skema vs tampilan:** 0
- **Status Superadmin:** Pulih dan terproteksi dari penurunan peran (100%).
- **Menu Terbuka untuk Superadmin:** Seluruh 14 menu satu pintu dan seluruh tab dapat dibuka dan berfungsi.
- **Perutean:** 100% bebas dari nama role di path, rute lama dialihkan secara rapi (301 redirect).

