# Master Dokumentasi REST API — Fibermedia Provisioning & Complaint System
**Kompilasi Seluruh API Aktif (V1.0 s/d V3.2 Terkini)**  
**Target:** Tim Frontend Web & Mobile Developer  
**Status:** Frozen & Production Ready  

---

## 📑 Daftar Isi Cepat

1. [Standar Protokol, Base URL & Error Handling](#1-standar-protokol-base-url--error-handling)
2. [Modul Autentikasi & Profil Pengguna](#2-modul-autentikasi--profil-pengguna)
3. [Modul Notifikasi & Web Push PWA](#3-modul-notifikasi--web-push-pwa)
4. [Modul Master Paket & Validasi Promo](#4-modul-master-paket--validasi-promo)
5. [Modul Pendaftaran Pasang Baru (Sales)](#5-modul-pendaftaran-pasang-baru-sales)
6. [Modul Verifikasi & Manajemen Pasang Baru (Admin)](#6-modul-verifikasi--manajemen-pasang-baru-admin)
7. [Modul Pelaksanaan Lapangan Pasang Baru (Teknisi)](#7-modul-pelaksanaan-lapangan-pasang-baru-teknisi)
8. [Modul Kelola Pelanggan (CRUD, Status, Excel Export/Import)](#8-modul-kelola-pelanggan-crud-status-excel-exportimport)
9. [Modul Manajemen Pengaduan & Wilayah Malang Raya (Admin)](#9-modul-manajemen-pengaduan--wilayah-malang-raya-admin)
10. [Modul Penanganan Pengaduan Lapangan (Teknisi Tim)](#10-modul-penanganan-pengaduan-lapangan-teknisi-tim)
11. [Modul Otomasi Provisioning ONT & BFASS](#11-modul-otomasi-provisioning-ont--bfass)
12. [Modul Laporan, BAST, Analytics & SLA](#12-modul-laporan-bast-analytics--sla)
13. [Modul Superadmin (Tim, Role, & User Management)](#13-modul-superadmin-tim-role--user-management)

---

## 1. Standar Protokol, Base URL & Error Handling

### 🌐 Base URL
* **Development (Lokal):** `http://127.0.0.1:8000/api`
* **Production:** `https://api.fibermediaplay.net/api`

### 🔑 Header Standar
```http
Authorization: Bearer <SANCTUM_TOKEN>
Accept: application/json
Content-Type: application/json
```
*(Catatan: Jangan sertakan `Content-Type: application/json` saat mengirim `multipart/form-data`; biarkan browser atau library seperti Axios men-generate boundary otomatis)*.

### 🛡️ Standar Format Response JSON
* **Sukses (HTTP 200 / 201):**
  ```json
  {
    "success": true,
    "message": "Data berhasil diproses.",
    "data": { ... }
  }
  ```
* **Error Validasi Input (HTTP 422 Unprocessable Content):**
  ```json
  {
    "message": "The given data was invalid.",
    "errors": {
      "customer_phone": ["Nomor WhatsApp minimal 9 digit."],
      "file": ["File harus berupa ekstensi xlsx, xls, atau csv."]
    }
  }
  ```
* **Error Otorisasi / Role (HTTP 403 Forbidden):**
  ```json
  {
    "message": "User does not have the right roles."
  }
  ```
* **Token Kedaluwarsa / Belum Login (HTTP 401 Unauthorized):**
  ```json
  {
    "message": "Unauthenticated."
  }
  ```

---

## 2. Modul Autentikasi & Profil Pengguna

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | Public | **Multi-Credential Login**: Masuk menggunakan Email, Nama/Username, atau Nomor Telepon/WhatsApp & kata sandi. |
| `POST` | `/forgot-password` | Public | Kirim link reset password ke email. |
| `POST` | `/reset-password` | Public | Submit token dan kata sandi baru. |
| `POST` | `/logout` | Auth | Revoke token aktif user. |
| `GET` | `/user` | Auth | Ambil data profil, role, permissions, dan tim teknisi user. |
| `PUT` | `/user/profile` | Auth | Ubah nama, email, dan no telepon. |
| `PUT` | `/user/password` | Auth | Ganti password akun aktif. |
| `GET` | `/user/notification-settings` | Auth | Preferensi push notification user. |
| `PUT` | `/user/notification-settings` | Auth | Simpan preferensi notifikasi. |

#### 🔐 Spesifikasi Payload Multi-Credential Login (`POST /login`)
Sistem mendukung login fleksibel dengan salah satu identifier berikut:
* **Format Request Body:**
  ```json
  {
    "login": "admin@example.com", // Dapat berupa Email, Nama/Username, atau No. HP/WA
    "password": "password123",
    "remember": false
  }
  ```
  *(Catatan: Backend juga tetap mendukung kunci `"email": "..."` atau `"username": "..."` untuk kompatibilitas penuh)*.

* **Dukungan Kredensial:**
  1. **Email:** Contoh: `admin@example.com`
  2. **Username / Nama:** Contoh: `Admin System`, `Teknisi Lapangan 1`
  3. **Nomor Telepon / WhatsApp:** Contoh: `081200000002` atau `6281200000002` (otomatis dinormalisasi oleh sistem).

---

## 3. Modul Notifikasi & Web Push PWA

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Auth | Ambil daftar notifikasi in-app user. |
| `PATCH`| `/notifications/{id}/read` | Auth | Tandai 1 notifikasi telah dibaca. |
| `PATCH`| `/notifications/read-all` | Auth | Tandai semua notifikasi telah dibaca. |
| `GET` | `/push-subscriptions/vapid-key`| Auth | Ambil VAPID Public Key untuk registrasi Service Worker PWA. |
| `POST`| `/push-subscriptions` | Auth | Simpan payload subscription browser Web Push. |
| `DELETE`| `/push-subscriptions` | Auth | Hapus subscription Web Push. |

---

## 4. Modul Master Paket & Validasi Promo

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/packages` | Auth / Public | Ambil katalog paket internet aktif (kecepatan, harga, kuota). |
| `POST` | `/promos/validate` | Auth | Validasi kupon promo (`{"code": "...", "package_id": 1}`). |
| `GET` | `/admin/packages` | Admin, Superadmin | Kelola seluruh paket internet (termasuk paket nonaktif). |
| `POST` | `/admin/packages` | Admin, Superadmin | Buat paket internet baru. |
| `PUT` | `/admin/packages/{id}` | Admin, Superadmin | Update paket. |
| `PATCH`| `/admin/packages/{id}/toggle-active` | Admin, Superadmin | Toggle status aktif paket. |
| `POST` | `/admin/packages/sync` | Admin, Superadmin | Sinkronisasi profil bandwidth dengan OLT/Mikrotik. |
| `GET` | `/admin/promos` | Admin, Superadmin | Daftar master kode promo. |
| `POST` | `/admin/promos` | Admin, Superadmin | Tambah kupon diskon promo baru. |

---

## 5. Modul Pendaftaran Pasang Baru (Sales)

Akses: `Sales`, `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan & Payload Penting |
| :--- | :--- | :--- |
| `GET` | `/sales/submissions` | List pengajuan pasang baru sales (`?status=draft,submitted...`). |
| `POST` | `/sales/submissions` | Buat registrasi pasang baru pelanggan (`customer_name`, `customer_phone`, `address`, `package_id`, `latitude`, `longitude`). |
| `GET` | `/sales/submissions/{id}` | Detail registrasi dan riwayat approval. |
| `PUT` | `/sales/submissions/{id}` | Edit data registrasi (selama belum berstatus approved/installed). |
| `POST` | `/sales/submissions/{id}/upload-document` | Upload berkas KTP / KK / Foto Rumah (`multipart/form-data`, file maks 5MB). |

---

## 6. Modul Verifikasi & Manajemen Pasang Baru (Admin)

Akses: `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/admin/submissions` | List registrasi yang masuk dari seluruh sales. |
| `GET` | `/admin/submissions/{id}` | Detail berkas dan data teknis calon pelanggan. |
| `PUT` | `/admin/documents/{id}/review` | Validasi dokumen KTP/KK (`approved` / `rejected`). |
| `PUT` | `/admin/submissions/{id}/validate`| Keputusan verifikasi: `approve` (dan assign jadwal/teknisi), `return_to_sales`, atau `reject`. |

---

## 7. Modul Pelaksanaan Lapangan Pasang Baru (Teknisi)

Akses: `Teknisi`, `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan & Payload |
| :--- | :--- | :--- |
| `GET` | `/teknisi/tasks` | Daftar tugas instalasi lapangan yang ditugaskan ke teknisi. |
| `GET` | `/teknisi/tasks/{id}` | Detail instruksi pasang baru, koordinat lokasi, dan kontak pelanggan. |
| `PUT` | `/teknisi/tasks/{id}/status` | Ubah status pengerjaan (`in_progress`, `installed`). |
| `POST` | `/teknisi/tasks/{id}/upload-photo` | Upload foto ODP, tarikan kabel, ONT menyala, dan redaman OPM (`multipart/form-data`). |
| `GET` | `/teknisi/tasks/{id}/checklist` | Ambil form checklist parameter teknis. |
| `PUT` | `/teknisi/tasks/{id}/checklist` | Simpan data teknis (redaman dBm, panjang kabel meter, SN modem ONT, speedtest). |
| `POST` | `/teknisi/tasks/{id}/upload-signature` | Upload tanda tangan digital pelanggan di BAST (`multipart/form-data`). |

---

## 8. Modul Kelola Pelanggan (CRUD, Status, Excel Export/Import)

Akses: `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan Lengkap |
| :--- | :--- | :--- |
| `GET` | `/admin/customers` | Daftar pelanggan lengkap (`?page=1&per_page=15&search=...&status=...`). |
| `GET` | `/admin/customers/stats` | Ringkasan metrik total pelanggan, aktif, isolir/suspend, dan terminated. |
| `GET` | `/admin/customers/{id}` | Detail lengkap data pelanggan, paket, dan riwayat komplain. |
| `PATCH`| `/admin/customers/{id}/status`| Update status isolir (`active` / `suspended` / `terminated`) beserta alasan. |
| `PUT` | `/admin/customers/{id}` | Perbarui data identitas / paket pelanggan. |
| `GET` | `/admin/customers/export` | **Export data pelanggan langsung ke file Excel (.xlsx)** dengan header download stream. |
| `GET` | `/admin/customers/import-template`| **Unduh file template Excel (.xlsx)** dengan panduan kolom dan data dummy. |
| `POST` | `/admin/customers/import` | **Import berkas Excel/CSV (.xlsx, .xls, .csv)** via `multipart/form-data` dengan otomatisasi upsert dan auto-generate customer code. |
| `DELETE`| `/admin/customers/{id}` | Hapus data pelanggan (Khusus Superadmin). |

---

## 9. Modul Manajemen Pengaduan & Wilayah Malang Raya (Admin)

Akses: `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan & Alur Kerja |
| :--- | :--- | :--- |
| `GET` | `/admin/areas/hierarchy` | **Cascading Dropdown Malang Raya**: Kab/Kota (Kota Malang, Kab Malang) ➔ Kecamatan ➔ Kelurahan/Desa. |
| `GET` | `/admin/complaints/check-duplicate` | Deteksi tiket ganda berdasarkan query `?phone=...` atau `?customer_code=...`. |
| `GET` | `/admin/complaints/stats` | Ringkasan jumlah tiket open, in progress, pending, resolved, dan closed. |
| `GET` | `/admin/complaints` | Tabel daftar pengaduan (filter status, area, prioritas, tim). |
| `POST` | `/admin/complaints` | **Buat Tiket Komplain Baru**:<br>• `customer_name`: string wajib<br>• `customer_phone`: angka 9 s/d 14 digit wajib (`regex:/^[0-9]+$/|min:9|max:14`)<br>• `customer_address`: string alamat wajib<br>• `area`: wilayah wajib<br>• `category`: kategori gangguan wajib<br>• `priority`: prioritas wajib<br>• `subject`: judul kendala wajib<br>• `description`: deskripsi lengkap wajib<br>• `attachments`: **Wajib minimal 1 file screenshot/foto bukti** (maks 5 file, image/pdf hingga 5MB) |
| `GET` | `/admin/complaints/{id}` | Detail tiket, timeline penanganan, foto bukti, dan log riwayat status. |
| `GET` | `/admin/teams/available` | Ambil daftar tim teknisi (Team A, B, C, D) yang aktif beserta jumlah tiket yang sedang dikerjakan. |
| `POST` | `/admin/complaints/{id}/assign` | **Penugasan Tim:**<br>• Admin: Wajib otomatis (Least-Loaded Round Robin antartim).<br>• Superadmin: Boleh manual memilih `team` atau otomatis. |
| `PUT` | `/admin/complaints/{id}/resolve-remote` | Selesaikan komplain dari meja admin/NOC tanpa kunjungan teknisi. |
| `PUT` | `/admin/complaints/{id}/verify-close` | Verifikasi hasil kerja & foto bukti redaman teknisi untuk menutup tiket (`closed`). |
| `PUT` | `/admin/complaints/{id}/return` | Kembalikan tiket ke tim teknisi jika pekerjaan dinilai belum beres. |
| `PUT` | `/admin/complaints/{id}/resume` | Lanjutkan kembali perhitungan SLA setelah tiket berada di status `pending_customer`. |
| `PUT` | `/admin/complaints/{id}/cancel` | Batalkan tiket pengaduan. |
| `PUT` | `/admin/complaints/{id}/reopen` | Buka kembali tiket yang sudah ditutup jika kendala kambuh. |

---

## 10. Modul Penanganan Pengaduan Lapangan (Teknisi Tim — Alur 2 Fase)

Akses: `Teknisi`, `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan Operasional |
| :--- | :--- | :--- |
| `GET` | `/teknisi/complaints` | Menampilkan seluruh tiket pengaduan yang ditugaskan ke **Tim Teknisi tersebut** (`assigned_team = user.team`). |
| `GET` | `/teknisi/complaints/{id}` | Detail kendala pelanggan, nomor WhatsApp, alamat, status 2 fase, dan riwayat catatan. |
| `POST` | `/teknisi/complaints/{id}/start` | Teknisi klik tombol **Mulai Kerjakan** saat tiba di lokasi (status jadi `in_progress`). |
| `PUT` | `/teknisi/complaints/{id}/schedule-visit` | Simpan jadwal estimasi kunjungan (`{"scheduled_visit_at": "YYYY-MM-DD HH:mm:ss"}`). |
| `PUT` | `/teknisi/complaints/{id}/pending-customer` | Jeda perhitungan timer SLA karena kendala di pihak pelanggan (misal: rumah kosong). |
| `POST` | `/teknisi/complaints/{id}/phase-1` | **Fase 1: Penyelesaian Teknis Lapangan**:<br>• Upload 1–5 foto bukti fisik hasil perbaikan/redaman OPM (`photos[]`, kamera belakang, watermarked, maks 2MB per file).<br>• `resolution_category`: kategori perbaikan teknis.<br>• `description`: uraian tindakan perbaikan.<br>• `opm_redaman`: angka redaman optik (misal `-18.5 dBm`).<br>*(Status menjadi `phase_1_completed` atau `resolved` jika absensi sudah lengkap)* |
| `POST` | `/teknisi/complaints/{id}/phase-2-attendance` | **Fase 2: Absensi Mandiri Setiap Anggota Tim**:<br>• `selfie_photo`: foto selfie wajah langsung dari kamera depan (watermark No Tiket, Nama, Waktu, Lat/Lng, maks 2MB).<br>• `latitude`, `longitude`, `accuracy`: koordinat GPS teknisi di lokasi.<br>*(Jika semua anggota tim di `assigned_team` sudah absen & Fase 1 selesai, status otomatis `resolved`)* |
| `GET` | `/teknisi/complaints/{id}/attendances` | Ambil status kehadiran seluruh anggota tim teknisi pada tiket tersebut. |
| `POST` | `/teknisi/complaints/{id}/resolve` | Alias kompatibilitas mundur untuk `POST /teknisi/complaints/{id}/phase-1`. |

---

## 11. Modul Otomasi Provisioning ONT & BFASS

Akses: `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/admin/bfass/health` | Status heartbeat koneksi server provisioning BFASS ke OLT. |
| `GET` | `/admin/provisionings` | Riwayat log eksekusi konfigurasi ONT/PPPoE. |
| `POST` | `/admin/provisionings` | Trigger penembakan konfigurasi profile bandwidth, VLAN, dan PPPoE ke modem ONT. |
| `POST` | `/admin/provisionings/{id}/retry`| Eksekusi ulang provisioning yang berstatus failed. |

---

## 12. Modul Laporan, BAST, Analytics & SLA

Akses: `Admin`, `Superadmin`.

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/admin/reports/submissions/excel` | Unduh rekap instalasi pasang baru format Excel. |
| `GET` | `/admin/reports/submissions/{id}/pdf` | Cetak ringkasan instalasi format PDF. |
| `GET` | `/admin/reports/submissions/{id}/bast`| Cetak BAST resmi ber-tanda tangan digital pelanggan format PDF. |
| `GET` | `/admin/analytics/kpi` | Metrik KPI eksekutif (Pendapatan, Pelanggan Baru, Rata-rata Durasi SLA). |
| `GET` | `/admin/analytics/funnel` | Analisis conversion funnel dari pengajuan sales sampai aktivasi. |
| `GET` | `/admin/analytics/regional` | Distribusi konsentrasi pelanggan berdasarkan kecamatan/wilayah. |
| `GET` | `/admin/analytics/trends` | Tren pertumbuhan pemasangan bulanan. |
| `GET` | `/admin/sla-breaches/summary` | Ringkasan metrik pelanggaran target waktu respon dan resolusi SLA. |
| `GET` | `/admin/sla-breaches` | Rincian tiket yang melewati ambang batas SLA. |
| `GET` | `/admin/audit-logs` | Jejak audit trail pencatatan aktivitas pengguna sistem. |

---

## 13. Modul Superadmin (Tim, Role, & User Management)

Akses: Khusus `Superadmin`.

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/superadmin/teams` | Kelola master Tim Lapangan (Team A, Team B, Team C, Team D). |
| `POST` | `/superadmin/teams` | Tambah Tim baru. |
| `PUT` | `/superadmin/teams/{id}` | Edit nama tim atau status aktif. |
| `POST` | `/superadmin/teams/{id}/members` | Atur penempatan personil teknisi ke dalam tim (`user_ids: [1, 2]`). |
| `GET` | `/superadmin/roles` | Daftar Role sistem (`Superadmin`, `Admin`, `Sales`, `Teknisi`). |
| `GET` | `/superadmin/permissions` | Katalog seluruh permission fitur. |
| `PUT` | `/superadmin/roles/{id}/permissions` | Perbarui matrix izin hak akses pada masing-masing role. |
| `GET` | `/superadmin/users` | List seluruh akun staf internal. |
| `POST` | `/superadmin/users` | Daftarkan akun staf baru. |
| `PATCH`| `/superadmin/users/{id}/status` | Blokir / aktifkan akses akun staf. |
| `POST` | `/superadmin/users/{id}/reset-password` | Reset password akun staf secara langsung. |
| `DELETE`| `/superadmin/submissions/{id}` | Hapus permanen berkas pengajuan sales yang salah input. |
