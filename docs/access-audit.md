# AUDIT HAK AKSES, ROLE, DAN PERANGKAT (FIBERMEDIA-OPS)
*Tanggal Audit: 25 Oktober 2026*
*Tujuan: Fondasi implementasi R2 (Halaman Pengguna & Hak Akses Superadmin)*

---

## 1. TABEL BASIS DATA YANG TERLIBAT

1. **`roles`**:
   - Kolom: `id`, `name`, `guard_name`, `created_at`, `updated_at`.
   - Temuan: Kolom `description` belum ada di tabel `roles`. Akan ditambahkan lewat migrasi `add_description_to_roles_table.php`.
   - Role Sistem Baku: `Superadmin`, `Admin`, `Teknisi`, `Sales`.
     - `Superadmin`: Memiliki semua izin lewat `Gate::before`.
     - `Admin`: CS & admin kantor (8 izin operasional + `pwa.access`).
     - `Teknisi`: Lapangan (PWA, pengerjaan tiket tim, absen mandiri, usul ODP).
     - `Sales`: Lapangan (PWA, registrasi PSB baru, monitoring PSB sendiri, absen mandiri).
2. **`permissions`**:
   - Kolom: `id`, `name`, `guard_name`, `created_at`, `updated_at`.
   - Total permission aktif: 32 permission modular + `pwa.access` + backward compatibility aliases.
3. **`model_has_roles`** & **`role_has_permissions`**:
   - Menghubungkan pengguna dengan role, dan role dengan permissions (Spatie Permission package).
4. **`users`**:
   - Kolom: `id`, `name`, `email`, `phone`, `team`, `availability`, `max_active_complaints`, `is_active` (atau status), timestamps.
   - Relasi: Memiliki relasi ke `roles`, `teams`, dan `devices`.
5. **`devices`**:
   - Kolom: `id`, `user_id`, `device_id` (fingerprint), `device_name`, `model`, `platform`, `is_trusted`, `last_active_at`, `registered_at`.
   - Izin pelindung: `devices.view` dan `devices.manage`.
6. **`activity_log`**:
   - Kolom: `id`, `log_name`, `description`, `subject_type`, `subject_id`, `event`, `causer_type`, `causer_id`, `attribute_changes`, `properties`, timestamps.
   - Digunakan untuk mencatat audit trail perubahan hak akses, pergantian role, dan reset permission.

---

## 2. TEMPAT DEFINISI IZIN DAN PERUBAHAN KE REGISTRI

- **Sebelumnya**: Izin hanya dicantumkan secara manual di array `database/seeders/RolesAndPermissionsSeeder.php` dan hardcoded di beberapa controller (`RoleController::catalog`).
- **Target R2**:
  - Dibuat registri modular di `app/Modules/<Modul>/permissions.php` dan dilayani oleh `PermissionRegistry`.
  - Atribut setiap izin:
    - `key`: string unik (mis. `customers.create`).
    - `module`: modul pemilik (mis. `customers`).
    - `module_name`: nama label modul dalam Bahasa Indonesia (mis. `Kelola Pelanggan`).
    - `label`: label tindakan Bahasa Indonesia (mis. `Tambah Pelanggan Baru`).
    - `description`: deskripsi satu kalimat penjelas.
    - `is_locked`: boolean (terkunci khusus Superadmin, mis. `access.manage`, `users.manage`, `audit.view`, `settings.manage`).
    - `default_roles`: role bawaan yang menerima izin ini saat baru terdaftar.
    - `prerequisites`: array izin prasyarat (mis. `customers.update` butuh `customers.view`).
    - `is_sensitive`: penanda tindakan berisiko tinggi (hapus data, lihat rahasia, ekspor data, ubah pengaturan).
  - Perintah sinkronisasi: `php artisan permissions:sync`. Idempoten, hanya memberikan role bawaan untuk izin baru yang belum ada di basis data tanpa menimpa konfigurasi manual Superadmin.

---

## 3. PENGGUNAAN IZIN PADA MENU DAN SISTEM SATU PINTU

- **Menu Backend**: `app/Services/MenuService.php` membaca `app/Modules/*/menu.php`.
  - Item menu dan sub-tab diperiksa menggunakan `hasPermissionSafely($user, $permission, $isSuperadmin)`.
  - Superadmin lolos semua permission.
  - Untuk role lain, menu hanya tampil jika pengguna memiliki izin untuk minimal salah satu tab/itemnya.
- **Frontend**:
  - Endpoint `GET /api/me` mengembalikan daftar permission aktif, `is_superadmin`, dan pohon menu dinamis.
  - Komponen React `<RequirePermission can="..." />` melindungi rute dan tombol aksi.
  - Menu "Pengguna & Hak Akses" (`/access`) memiliki 5 tab:
    1. Pengguna (`/access/users`) -> Dilindungi `users.view`.
    2. Role (`/access/roles`) -> Dilindungi `access.manage`.
    3. Matriks Izin (`/access/matrix`) -> Dilindungi `access.manage`.
    4. Perangkat (`/access/devices`) -> Dilindungi `devices.view`.
    5. Riwayat (`/access/history`) -> Dilindungi `audit.view`.

---

## 4. AUDIT HALAMAN FRONTEND EKSISTING

1. **UserManagement & UserDetail**:
   - Lokasi: `resources/js/admin/app/components/superadmin/UserManagement.tsx`.
   - Fitur yang sudah ada: daftar pengguna, filter role, pencarian nama/email/telepon, tambah pengguna, ubah profil.
   - Penyesuaian R2: Memastikan integrasi tab, indikator akses PWA (`pwa.access`), tombol ganti role langsung, proteksi Superadmin terakhir tidak dapat dinonaktifkan/diturunkan jabatannya.
2. **RoleManagement & AccessControlManagement**:
   - Lokasi: `resources/js/admin/app/components/superadmin/RoleManagement.tsx` dan `AccessControlManagement.tsx`.
   - Fitur yang sudah ada: tabel role, matriks permission per modul, tombol simpan.
   - Penyesuaian R2:
     - Tab terpisah dan memiliki URL sendiri (`/access/roles` dan `/access/matrix`).
     - Pembuatan custom role dengan opsi `copy_from`.
     - Validasi prasyarat otomatis pada checkbox matriks (aktifkan prasyarat otomatis, matikan yang tergantung).
     - Gembok visual pada permission terkunci (`is_locked`).
     - Pratinjau sidebar instan di panel kanan (`GET /api/roles/{id}/menu-preview`).
     - Konfirmasi sandi Superadmin saat menyimpan matriks izin role, disertai diff dialog (izin ditambah vs dicabut).
     - Tombol "Kembalikan ke Bawaan" (`POST /api/roles/{id}/reset`).
3. **DeviceManagement**:
   - Lokasi: `resources/js/admin/app/components/admin/DeviceManagement.tsx`.
   - Fitur: Otorisasi perangkat, cabut perangkat terdaftar, filter pengguna.
   - Penyesuaian R2: Melebur sebagai tab ke-4 di `/access/devices`.
4. **AuditLogs**:
   - Lokasi: `resources/js/admin/app/components/superadmin/AuditLogs.tsx`.
   - Fitur: Riwayat aktivitas dan perubahan log.
   - Penyesuaian R2: Melebur sebagai tab ke-5 di `/access/history` terfilter pada kategori hak akses dan user management.

---

## 5. RENCANA KERJA TEKNIS R2

1. Buat migrasi penambahan kolom `description` pada tabel `roles`.
2. Bentuk berkas registri izin di `app/Modules/*/permissions.php` dan service `PermissionRegistry.php`.
3. Buat Artisan command `php artisan permissions:sync`.
4. Perbarui seeder `RolesAndPermissionsSeeder` untuk menyertakan `access.manage` dan mengeksekusi `permissions:sync`.
5. Perbarui endpoint backend di `RoleController`, `UserController`, dan routes:
   - `GET /api/roles`, `POST /api/roles`, `PATCH /api/roles/{id}`, `DELETE /api/roles/{id}`.
   - `GET /api/permissions`, `GET /api/roles/{id}/permissions`, `PUT /api/roles/{id}/permissions`.
   - `GET /api/roles/{id}/menu-preview`, `POST /api/roles/{id}/reset`.
   - `PATCH /api/users/{id}/role` dengan proteksi akun Superadmin terakhir.
   - Konfirmasi kata sandi Superadmin pada perubahan permission.
   - Event Reverb `permissions.changed` dan pencatatan diff di `activity_log`.
6. Bangun antarmuka FE tabbed `/access` yang memuat 5 tab (`/access/users`, `/access/roles`, `/access/matrix`, `/access/devices`, `/access/history`) dengan desain semantik token dan istilah baku `id.ts`.
7. Tulis pengujian fitur `tests/Feature/AccessControlTest.php` dan verifikasi seluruh gerbang pre-completion checklist.
