# Direktori Dokumentasi Resmi REST API — Fibermedia Provisioning & Complaint System

Selamat datang di repositori dokumentasi REST API **Fibermedia Play**. Folder ini merangkum seluruh spesifikasi teknis antarmuka API dari versi awal (V1) hingga versi operasional terkini (V3.x).

---

## 🗂️ Daftar Berkas Dokumentasi

| Versi / Berkas | Cakupan & Modul Utama | Status |
| :--- | :--- | :--- |
| 📘 [`V1_PROVISIONING_DASAR.md`](./V1_PROVISIONING_DASAR.md) | **API V1.0** — Autentikasi Sanctum, Pengajuan Registrasi Pasang Baru (Sales), Verifikasi & Penugasan Awal (Admin), Pelaksanaan Instalasi Lapangan (Teknisi). | Legacy / Core Active |
| 📙 [`V2_PROVISIONING_SYSTEM_LENGKAP.md`](./V2_PROVISIONING_SYSTEM_LENGKAP.md) | **API V2.0 – V2.1** — Master Paket Internet & Sync Mikrotik, Kode Promo Diskon, Database Pelanggan Dasar, Otomasi ONT/PPPoE BFASS, BAST Digital PDF/Excel, Analytics & SLA Breaches Tracker. | Core Active |
| 📕 [`V3_SISTEM_PENGADUAN_TIM_DAN_EXCEL.md`](./V3_SISTEM_PENGADUAN_TIM_DAN_EXCEL.md) | **API V3.0 – V3.2** — Sistem Tiket Pengaduan Gangguan, Penugasan Berbasis Tim Teknisi (Team A-D) Least-Loaded, Hierarki Wilayah Malang Raya, Export & Import Excel Pelanggan, Portal Tugas Teknisi Pengaduan, Superadmin Role Matrix. | **Current / Active** |
| 📗 [`DOKUMENTASI_API_MASTER_LENGKAP.md`](./DOKUMENTASI_API_MASTER_LENGKAP.md) | **Dokumen Tunggal Terpadu (All-in-One)** — Seluruh katalog endpoint aktif dari V1 sampai sekarang, format request/response JSON, role-based matrix, dan handling error. | **Recommended for FE** |
| 📔 [`POSTMAN_DAN_TESTING_GUIDE.md`](./POSTMAN_DAN_TESTING_GUIDE.md) | Panduan Pengujian Postman, konfigurasi Environment, variabel token, dan simulasi skenario end-to-end. | Testing Reference |

---

## 🌐 Informasi Server & Environment

* **Base URL Development (Lokal):**
  ```text
  http://127.0.0.1:8000/api
  ```
* **Base URL Staging / Production:**
  ```text
  https://api.fibermediaplay.net/api
  ```
* **Standard Headers:**
  ```http
  Authorization: Bearer <SANCTUM_TOKEN>
  Accept: application/json
  Content-Type: application/json (Gunakan multipart/form-data untuk upload berkas)
  ```

---

## 👥 Matriks Hak Akses Peran Pengguna (RBAC)

| Peran (Role) | Hak Akses Utama |
| :--- | :--- |
| **Superadmin** | Mengakses seluruh modul: Master User, Tim Teknisi, Role & Permission, Hapus Permanen Tiket/Pelanggan, Penugasan Manual & Otomatis. |
| **Admin** | Validasi Pengajuan Pasang Baru, Kelola Pelanggan (Export/Import), Monitoring Provisioning BFASS, Penugasan Tiket Pengaduan (Otomatis Round Robin Tim), Verifikasi & Penutupan Tiket. |
| **Sales** | Pendaftaran Pelanggan Baru, Upload Berkas Identitas KTP/KK, Pelacakan Status Pengajuan Registrasi. |
| **Teknisi** | Menerima Tugas Instalasi Pasang Baru, Menerima Tiket Pengaduan Tim, Eksekusi Lapangan, Upload Foto Redaman OPM/Perangkat, Selesaikan Tiket. |
