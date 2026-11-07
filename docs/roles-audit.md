# AUDIT HAK AKSES DAN PEMBAGIAN PERAN (ROLES & PERMISSIONS)
**Repositori:** Fibermedia-Ops  
**Tanggal Audit:** 2026-10-25  
**Status Audit:** **DITUTUP (SELESAI)** — Seluruh Langkah 1, 2, dan 3 telah diimplementasikan, diverifikasi, dan lulus 100%.

---

## 1. PENETAPAN BAKU (SUMBER KEBENARAN)

Berlandaskan aturan sistem Fibermedia-Ops, hierarki dan pembagian wewenang ditetapkan sebagai berikut:

| Peran (Role) | Ruang Lingkup Hak Akses | Sumber Kebenaran Izin |
| :--- | :--- | :--- |
| **Superadmin** | Akses ke **SEMUA** menu dan **SEMUA** fitur tanpa pengecualian, termasuk izin baru di masa depan secara otomatis tanpa perlu didaftarkan satu per satu. Sidebar selalu memuat semua menu (fitur belum selesai berlabel "Segera"). | `Gate::before` di `AppServiceProvider` yang selalu mengembalikan `true`. |
| **Admin (CS)** | **HANYA 4 HAL:**<br>1. Menambah pelanggan (`customers.create`) & melihat daftar pelanggan tanpa kolom rahasia (`customers.view`).<br>2. Absen harian via PWA (`attendance.self`).<br>3. Mengajukan tiket pengaduan (`complaints.create`) & melihat pengaduan miliknya sendiri (`complaints.view_own`).<br>4. Menyetujui pengajuan PSB sales (`submissions.view`, `submissions.approve` mencakup Validasi, Tolak + alasan, Minta Dilengkapi + alasan).<br><br>**Dilarang keras:** Mengubah/menghapus pelanggan, impor/ekspor, melihat NIK/password mentah, memantau antrean/dispatch teknisi, meninjau bukti lapangan, melihat laporan analitik, KPI, jaringan, tim, absensi orang lain, pengaturan pengguna/sistem. | **HANYA 8 IZIN:**<br>`dashboard.view` (varian ringkas), `customers.view`, `customers.create`, `submissions.view`, `submissions.approve`, `complaints.create`, `complaints.view_own`, `attendance.self`. |
| **Teknisi (PWA)** | Absen harian (`attendance.self`), melihat tiket timnya (`complaints.view_assigned`, `tasks.view_assigned`), terima/tolak tiket, Tahap 1 & Tahap 2, unggah bukti kerja, lihat peta & usulkan ODP/jalur kabel (status pending), lihat KPI sendiri. Dibatasi keanggotaan tim via policy. | Dibatasi oleh keanggotaan tim dan kepemilikan tiket via Policy. |
| **Sales (PWA)** | Absen harian (`attendance.self`), buat & ubah pengajuan PSB miliknya (`submissions.create`, `submissions.view_own`, `submissions.update_own`), pantau status pengajuan sendiri, lihat KPI sendiri (tanpa komisi). | Dibatasi oleh kepemilikan pengajuan (`user_id = auth->id`) via Policy. |
| **Izin/Sakit** | Pengajuan cuti, izin, atau sakit seluruh peran **HANYA** diinput dan disetujui oleh **Superadmin**. | `attendance.manage` (Superadmin only). |

---

## 2. AUDIT BAGIAN A: DAFTAR ROLE, IZIN, DAN TEMPAT PEMERIKSAAN SAAT AUDIT AWAL

### 2.1 Database & Seeder (`database/seeders/RolesAndPermissionsSeeder.php`)
- **Masalah Gate::before:** `AppServiceProvider.php` awalnya belum memiliki callback `Gate::before`. Hak Superadmin bergantung pada penugasan statis `$roleSuperadmin->givePermissionTo(Permission::all());`.
- **Kelebihan Izin Role Admin:** Role `Admin` awalnya diberi 27 permissions (termasuk `manage_customers`, `manage_provisioning`, `assign_tasks`, `manage_network`, `view_attendances`, `manage_teams`, dll.).
- **Inkonsistensi Naming:** Bercampurnya izin gaya lama (*snake_case*) dengan gaya dot-notation baku.

### 2.2 Pemeriksaan Role Berbasis String di Rute Backend (`routes/api.php`)
Rute backend sebelumnya menggunakan middleware bawaan `role:...` secara langsung pada 6 blok grup rute sensitif.

### 2.3 Pemeriksaan Role Berbasis String di Frontend (`resources/js/admin/app/App.tsx`)
Komponen `RoleRoute` sebelumnya hanya memeriksa string `allowedRoles={['admin', 'superadmin']}` tanpa memeriksa izin granular pengguna.

---

## 3. AUDIT BAGIAN B: MATRIKS RUTE API & HALAMAN FE SEBELUM PERBAIKAN

Lihat log temuan awal rute API dan FE yang mengizinkan Admin (CS) membuka fitur teknis, antrean dispatch, topologi jaringan, dan laporan bisnis.

---

## 4. AUDIT BAGIAN C: ANALISIS KESENJANGAN (GAP ANALYSIS)

1. **Hak Admin yang Kelebihan:** Operasional Lapangan & Jaringan, Manajemen Tim & Absensi Staf, Analitik & Audit Log, Manipulasi Pelanggan (edit, hapus, impor, ekspor).
2. **Kerapuhan Superadmin:** Ketiadaan `Gate::before` membuat rute baru di masa depan terblokir untuk Superadmin.
3. **Kebocoran Data:** Data sensitif teknis pelanggan (NIK mentah, password, collector, PPPoE), tiket pengaduan orang lain dan penugasan teknisi internal terbuka untuk Admin.

---

## 5. RENCANA KERJA EKSEKUSI (LANGKAH 2)

Rencana kerja eksekusi yang telah diselesaikan:
1. Backend Core & `Gate::before`.
2. Seeder 100% Idempoten & Pemurnian 8 Izin Admin CS.
3. Rute & Middleware API berbasis `can:<permission>`.
4. Sanitasi Resource & Data Isolation (Customer, Complaint, Submission).
5. Frontend Guard berbasis izin, Admin Compact Dashboard, dan PWA Callout.
6. Matriks Pengujian Otomatis komprehensif.

---

## 6. HASIL IMPLEMENTASI & PENGAWALAN IZIN

### 6.1 Backend Core (`app/Providers/AppServiceProvider.php`)
Telah ditambahkan `Gate::before`:
```php
Gate::before(function ($user, string $ability) {
    if ($user->hasRole('Superadmin') || $user->hasRole('superadmin')) {
        return true;
    }
    return null;
});
```
Ditambahkan pula compound Gate:
- `submissions.view_any_or_own`: Mengizinkan Superadmin, Admin CS (`submissions.view`), atau Sales untuk pengajuannya sendiri (`submissions.view_own`).
- `complaints.view_any_or_own`: Mengizinkan Superadmin, pemilik izin `complaints.view`, atau Admin CS pembuat tiket (`complaints.view_own`).

### 6.2 Seeder Idempoten (`database/seeders/RolesAndPermissionsSeeder.php`)
- Seluruh permission didefinisikan secara granular berbasis fitur.
- Role `Admin` dibatasi ketat hanya pada **8 izin resmi**:
  1. `dashboard.view`
  2. `customers.view`
  3. `customers.create`
  4. `submissions.view`
  5. `submissions.approve`
  6. `complaints.create`
  7. `complaints.view_own`
  8. `attendance.self`
- Seeder menggunakan `firstOrCreate` dan `syncPermissions`, sehingga dapat dijalankan berulang kali tanpa membuat duplikat atau merusak relasi yang ada.

### 6.3 Pengisolasian Data & Sanitasi API Resource
1. **`CustomerResource`:**
   - Menyembunyikan kolom sensitif `password`, `username`, `collector`, `local_address`, `remote_address` kecuali user memiliki `customers.view_secret`.
   - Melakukan sensor NIK (`nik_masked`) jika tidak memiliki `customers.view_secret`.
2. **`ComplaintResource` & `ComplaintDetailResource`:**
   - Kolom penugasan teknisi internal (`assigned_team`, `technician_id`, `current_assignment`, `team_members`, `assignments`) disembunyikan kecuali user memiliki `complaints.view` atau `complaints.assign`.
3. **`CustomerController`:**
   - Operasi edit (`PUT /admin/customers/{id}`) diproteksi `can:customers.update` (Admin ditolak 403).
   - Operasi hapus (`DELETE /admin/customers/{id}`) diproteksi `can:customers.delete` (Admin ditolak 403).
   - Operasi ekspor (`GET /admin/customers/export`) diproteksi `can:customers.export` (Admin ditolak 403).
   - Operasi impor (`POST /admin/customers/import`) diproteksi `can:customers.import` (Admin ditolak 403).
4. **`ComplaintController`:**
   - Pemanggilan `index()` secara otomatis membatasi query: jika user tidak memiliki `complaints.view`, filter diterapkan secara transparan: `where('created_by_id', $user->id)->orWhere('created_by', $user->name)`.
   - Pemanggilan `show()` menolak dengan 403 bila tiket bukan milik Admin bersangkutan dan user tidak memiliki `complaints.view`.
   - Penugasan tiket (`assign()`) mewajibkan `can:complaints.assign` (Admin ditolak 403).
5. **`ValidateSubmissionRequest` & `SubmissionValidationController`:**
   - Validasi status `rejected` dan `need_info` mewajibkan kolom `rejection_reason` / `validation_notes` / `reason` dengan pesan bahasa Indonesia.
   - Setiap tindakan validasi dicatat ke dalam `activitylog` sistem.

### 6.4 Perlindungan Penurunan Akun Terakhir & Imutabilitas Superadmin
1. **`SuperadminRoleController`:** Mengembalikan 422 bila ada upaya memodifikasi atau menghapus permission milik role `Superadmin`.
2. **`UserController`:** Mengembalikan 400 bila akun Superadmin terakhir yang aktif hendak dinonaktifkan, diturunkan perannya, atau dihapus.

### 6.5 Antarmuka Pengguna (Frontend & Sidebar)
1. **`RoleRoute` di `App.tsx`:**
   - Diubah total dari array `allowedRoles` ke pengecekan `permission?: string` atau `permissions?: string[]` terhadap `user.permissions`, dengan bypass otomatis untuk Superadmin.
   - Jika pengguna tidak memiliki izin yang dipersyaratkan, rute dialihkan ke halaman 403 (`AccessDenied`).
2. **`AdminCompactDashboard`:**
   - Halaman khusus untuk Admin CS yang hanya menampilkan:
     - Kartu Pengajuan PSB Menunggu Persetujuan.
     - Kartu Pengaduan yang Diajukan oleh Admin.
     - Jalan pintas cepat: "Tambah Pelanggan" & "Ajukan Pengaduan".
     - Banner ajakan PWA: "Absen Harian dibuka lewat PWA. Buka aplikasi PWA untuk absen."
   - Web admin tidak memblokir Admin jika belum absen.
3. **Sidebar Admin:**
   - Berdasarkan `MenuService.php`, Admin hanya menerima menu yang sesuai dengan 8 izinnya: Dashboard, Kelola Pelanggan, Pengajuan Pelanggan, Tiket Pengaduan.
   - Menu berlabel "Segera" disembunyikan untuk Admin dan hanya tampil untuk Superadmin.
   - PWA callout disematkan di bagian bawah navigasi sidebar.

---

## 7. TABEL HASIL TES MATRIKS OTOMATIS (ROUTE × PERAN)

Dijalankan secara otomatis melalui `tests/Feature/RoutePermissionMatrixTest.php`.

| Method | Endpoint API | Superadmin | Admin (CS) | Teknisi | Sales | Unauthenticated | Catatan Hak Akses |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `GET` | `/api/admin/customers` | 200 | 200 | 403 | 403 | 401 | Admin membaca data pelanggan non-sensitif |
| `POST` | `/api/admin/customers` | 422* | 422* | 403 | 403 | 401 | Admin berhak menambah pelanggan (*422 = lolos auth, validasi payload) |
| `PUT` | `/api/admin/customers/{id}` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang ubah pelanggan) |
| `DELETE` | `/api/admin/customers/{id}` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang hapus pelanggan) |
| `GET` | `/api/admin/customers/export` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang ekspor basis data) |
| `POST` | `/api/admin/customers/import` | 422* | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang impor massal) |
| `GET` | `/api/admin/submissions` | 200 | 200 | 403 | 403 | 401 | Admin membaca pengajuan PSB untuk disetujui |
| `POST` | `/api/admin/submissions/{id}/validate` | 422* | 422* | 403 | 403 | 401 | Admin menyetujui/menolak/minta lengkapi PSB |
| `GET` | `/api/admin/complaints` | 200 | 200 | 403 | 403 | 401 | Admin melihat pengaduan miliknya sendiri |
| `POST` | `/api/admin/complaints` | 422* | 422* | 403 | 403 | 401 | Admin mengajukan komplain baru |
| `POST` | `/api/admin/complaints/{id}/assign` | 422* | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang dispatch teknisi) |
| `GET` | `/api/admin/work-orders` | 200 | 403 | 403 | 403 | 401 | Admin & Teknisi ditolak 403 (khusus dispatch/superadmin) |
| `GET` | `/api/admin/network/approvals` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang kelola jaringan) |
| `GET` | `/api/superadmin/users` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang kelola pengguna) |
| `GET` | `/api/superadmin/roles` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang kelola peran) |
| `GET` | `/api/admin/kpi/overview` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang lihat KPI orang lain) |
| `GET` | `/api/admin/dispatch-settings` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang ubah aturan dispatch) |
| `GET` | `/api/admin/attendances/today` | 200 | 403 | 403 | 403 | 401 | Admin ditolak 403 (dilarang lihat absensi staf lain) |

*Catatan: Status 422 menunjukkan permintaan unprocessable entity yang membuktikan middleware otorisasi `can:` berhasil dilalui dan permintaan masuk ke tahap validasi form request.*

---

## 8. DAFTAR TEMPAT YANG SEBELUMNYA MEMAKAI NAMA ROLE LANGSUNG BESERTA PENGGANTINYA

Satu-satunya tempat yang diizinkan menyebut nama role `Superadmin` adalah `Gate::before` di `AppServiceProvider.php` dan seeder. Seluruh tempat lainnya telah diganti dengan izin spesifik:

| Lokasi Berkas | Kode Lama (Nama Peran Langsung) | Kode Baru (Pemeriksaan Izin / Policy) |
| :--- | :--- | :--- |
| `app/Providers/AppServiceProvider.php` | - | Ditambahkan `Gate::before(fn ($user) => $user->hasRole('Superadmin') ? true : null)` |
| `routes/api.php` | `Route::middleware('role:Admin\|Superadmin')` | `Route::middleware('can:<permission>')` pada seluruh modul |
| `routes/api.php` | `Route::middleware('role:Teknisi\|Admin\|Superadmin')` | `Route::middleware('can:workorders.view')` & policy |
| `routes/api.php` | `Route::middleware('role:Sales\|Admin\|Superadmin')` | `Route::middleware('can:submissions.view_any_or_own')` |
| `routes/api.php` | `Route::middleware('role:Superadmin')` | `Route::middleware('can:users.manage')` / `can:settings.manage` |
| `app/Http/Controllers/Admin/CustomerController.php` | `$user->hasRole(['Superadmin', 'superadmin'])` | `$user->can('customers.view_secret')` |
| `app/Http/Controllers/Admin/CustomerController.php` | `$user->hasRole('Superadmin')` pada destroy | `can:customers.delete` via route middleware & gate |
| `app/Exports/CustomersExport.php` | `$user->hasRole(['Superadmin', 'superadmin'])` | `$canViewSecrets` boolean berasal dari `$user->can('customers.view_secret')` |
| `app/Http/Controllers/Admin/ComplaintController.php` | `$user->hasRole('Superadmin')` pada penugasan manual | `$user->can('complaints.assign')` |
| `app/Http/Resources/CustomerResource.php` | Menampilkan username/password jika admin | Menampilkan rahasia hanya jika `$user->can('customers.view_secret')` |
| `app/Http/Resources/ComplaintResource.php` | Menampilkan penugasan teknisi untuk admin | Menyembunyikan data tim & teknisi jika bukan `can('complaints.view')` |
| `resources/js/admin/app/App.tsx` | `<RoleRoute allowedRoles={['admin', 'superadmin']}>` | `<RoleRoute permission="customers.view">`, `permission="submissions.view"`, dll. |
| `resources/js/admin/app/components/superadmin/CustomerManagement.tsx` | Pengecekan role string untuk tombol edit/delete/export | `canCreate`, `canUpdate`, `canDelete`, `canExport`, `canImport` via user permissions |
| `resources/js/admin/app/components/superadmin/CustomerDetail.tsx` | Tombol edit & tab teknis terbuka untuk admin | Guarded dengan `canUpdate` dan `canViewSecret` |
| `resources/js/admin/app/components/sales/SubmissionDetail.tsx` | Tombol delete pengajuan terbuka untuk admin | Guarded dengan `canDelete` |
| `resources/js/admin/app/components/complaints/ComplaintDetail.tsx` | Aksi assign dan verifikasi teknisi terbuka untuk admin | Guarded dengan `canAssign` dan `canReview` |

---

## 9. DAFTAR BERKAS YANG DIUBAH / DITAMBAHKAN

### Backend:
1. `app/Providers/AppServiceProvider.php` (Gate::before Superadmin & compound gates).
2. `bootstrap/app.php` (Middleware priority & DomainException renderer 422).
3. `database/seeders/RolesAndPermissionsSeeder.php` (Izin granular dot-notation, isolasi 8 izin Admin, idempoten).
4. `routes/api.php` (Pembersihan seluruh middleware role string, penegakan can:).
5. `app/Http/Resources/UserResource.php` & `app/Http/Controllers/AuthController.php` (Output permissions array).
6. `app/Http/Resources/CustomerResource.php` (Masking NIK, sensor password/username).
7. `app/Http/Controllers/Admin/CustomerController.php` (Pembersihan hasRole, penegakan can:customers.view_secret).
8. `app/Exports/CustomersExport.php` (Sanitasi ekspor pelanggan).
9. `app/Http/Resources/ComplaintResource.php` & `ComplaintDetailResource.php` (Penyembunyian internal assignment data).
10. `app/Http/Controllers/Admin/ComplaintController.php` (Scoping index query ke created_by_id, pembatasan show & assign).
11. `app/Http/Requests/Submission/ValidateSubmissionRequest.php` (Validasi alasan tolak/revisi ber-Bahasa Indonesia).
12. `app/Http/Controllers/Admin/SubmissionValidationController.php` (Activity logging untuk validasi).
13. `app/Http/Controllers/Admin/SuperadminRoleController.php` (Imutabilitas role Superadmin).
14. `app/Http/Controllers/Superadmin/UserController.php` (Proteksi akun Superadmin terakhir).
15. `app/Services/MenuService.php` (Alias permissions untuk menu registri).

### Frontend:
16. `resources/js/admin/app/App.tsx` (Refaktor RoleRoute ke permission, konversi seluruh rute admin).
17. `resources/js/admin/app/components/admin/AdminCompactDashboard.tsx` (Dasbor ringkas Admin CS).
18. `resources/js/admin/app/components/admin/AdminDashboard.tsx` (Peralihan dinamis dasbor berdasarkan izin/peran).
19. `resources/js/admin/app/components/layout/DashboardLayout.tsx` (PWA attendance callout untuk Admin).
20. `resources/js/admin/app/components/error/AccessDenied.tsx` (Token semantik & kamus istilah).
21. `resources/js/admin/app/components/superadmin/CustomerManagement.tsx` (Guard tombol aksi pelanggan).
22. `resources/js/admin/app/components/superadmin/CustomerDetail.tsx` (Guard edit dan data rahasia pelanggan).
23. `resources/js/admin/app/components/sales/SubmissionDetail.tsx` (Guard delete submission).
24. `resources/js/admin/app/components/complaints/ComplaintDetail.tsx` (Guard tiket assignment).

### Pengujian:
25. `tests/Feature/RoutePermissionMatrixTest.php` (8 tes terpadu: Idempotensi seeder, Dynamic Superadmin, Route Guard Whitelist, Data Leak Prevention Snapshot, Approval Logging, Sidebar Visibility, Field Policy Isolation, dan Matriks Rute Lengkap).

---

## 10. BUKTI KEPATUHAN CHECKLIST PRA-SELESAI & SINKRONISASI

Semua pagar pengaman sistem dieksekusi dan diverifikasi HIJAU (LULUS 100%):

### 10.1 Selisih Skema vs Tampilan
**Selisih skema vs tampilan: 0**

Bukti verifikasi drift tipe TypeScript (`npm run types:check`):
```text
> fibermedia-ops@1.0.0 types:check
> php artisan types:generate --check

Generating TypeScript types from database schemas, resources, and contracts...
Pemeriksaan drift tipe: TIDAK ADA DRIFT (SINKRON).
```

### 10.2 Pemeriksaan Istilah Baku (`npm run lint:copy`)
```text
> fibermedia-ops@1.0.0 lint:copy
> node scripts/lint-copy.cjs

🔍 Memulai pemindaian lint:copy pada resources/js...
✓ Selesai memindai 226 berkas.
✔ SUKSES: Semua istilah mematuhi Kamus Istilah Baku!
```

### 10.3 Tes Label Bahasa Indonesia Enum (`php artisan test --filter=EnumIndonesianLabelTest`)
```text
   PASS  Tests\Feature\EnumIndonesianLabelTest
  ✓ all backend enums have indonesian labels                                                                     0.24s  
  ✓ api enums endpoint returns all labels                                                                        0.06s  

  Tests:    2 passed (453 assertions)
  Duration: 0.55s
```

### 10.4 Tes Matriks Izin Rute Lengkap (`php artisan test --filter=RoutePermissionMatrixTest`)
```text
   PASS  Tests\Feature\RoutePermissionMatrixTest
  ✓ seeder is idempotent and can run twice                                                                       1.29s  
  ✓ superadmin dynamically accesses new permission and route                                                     0.20s  
  ✓ all api routes declare permission or are whitelisted                                                         0.16s  
  ✓ admin data leak prevention snapshot                                                                          0.22s  
  ✓ admin approve reject need info submission                                                                    0.25s  
  ✓ sidebar menu visibility for admin and superadmin                                                             0.21s  
  ✓ field policy ownership and team isolation                                                                    0.23s  
  ✓ route permission matrix all roles                                                                            1.23s  

  Tests:    8 passed (127 assertions)
  Duration: 4.16s
```

### 10.5 Kompilasi Produksi Frontend (`npm run build`)
```text
✓ built in 26.84s

PWA v1.3.0
mode      generateSW
precache  485 entries (43994.27 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

---
*Audit ditutup dan disahkan pada 2026-10-25.*

