# Dokumentasi API V2.0 – V2.1 — Provisioning Lengkap, Paket, BFASS, & Analytics

Versi 2.x melengkapi sistem dengan integrasi otomasi perangkat ONT/PPPoE (BFASS), katalog paket internet dinamis, kode promo, database master pelanggan, pelaporan BAST digital, analitik performa bisnis, dan penanganan SLA.

---

## 1. Master Paket Internet & Kode Promo

### 1.1. Katalog Paket Publik (Sales & Web)
* **Method & URL:** `GET /packages`
* **Response:** Mengembalikan daftar paket internet aktif, kecepatan (Mbps), harga, dan kuota/FUP.

### 1.2. Validasi Kode Promo
* **Method & URL:** `POST /promos/validate`
* **Request Body:** `{"code": "HEMAT50", "package_id": 2}`
* **Response (200 OK):**
  ```json
  {
    "valid": true,
    "discount_amount": 50000,
    "final_price": 200000,
    "description": "Potongan biaya pasang Rp 50.000"
  }
  ```

### 1.3. Kelola Paket Internet (Admin)
* `POST /admin/packages` — Tambah paket baru
* `PUT /admin/packages/{id}` — Edit data paket
* `PATCH /admin/packages/{id}/toggle-active` — Nonaktifkan / aktifkan paket
* `POST /admin/packages/sync` — Sinkronisasi profil bandwidth dengan Mikrotik / OLT

### 1.4. Kelola Promo (Admin)
* `GET /admin/promos` — Daftar promo
* `POST /admin/promos` — Buat kupon promo
* `PATCH /admin/promos/{id}/toggle-status` — Aktif/nonaktifkan kupon

---

## 2. Modul Pelanggan Dasar (Customer Base)

### 2.1. List Pelanggan
* **Method & URL:** `GET /admin/customers`
* **Query Params:** `page`, `per_page`, `search`, `status` (`active`, `suspended`, `terminated`)

### 2.2. Statistik Ringkasan Pelanggan
* **Method & URL:** `GET /admin/customers/stats`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "total": 68,
      "active": 60,
      "suspended": 5,
      "terminated": 3
    }
  }
  ```

### 2.3. Ubah Status Pelanggan (Isolir / Aktif Kembali)
* **Method & URL:** `PATCH /admin/customers/{id}/status`
* **Request Body:**
  ```json
  {
    "status": "suspended",
    "notes": "Isolir tagihan belum lunas"
  }
  ```

---

## 3. Otomasi Provisioning ONT & BFASS

Role Akses: `Admin`, `Superadmin`.

### 3.1. Cek Koneksi & Kesehatan Server BFASS
* **Method & URL:** `GET /admin/bfass/health`
* **Response (200 OK):** `{"status": "online", "olt_reachable": true, "latency_ms": 14}`

### 3.2. Daftar Riwayat Provisioning Otomatis
* **Method & URL:** `GET /admin/provisionings`

### 3.3. Inisiasi Eksekusi Provisioning Perangkat
* **Method & URL:** `POST /admin/provisionings`
* **Request Body:**
  ```json
  {
    "submission_id": 10,
    "ont_sn": "48575443ABCDEF12",
    "olt_ip": "10.10.1.2",
    "pon_port": "0/1/2",
    "vlan_id": 100,
    "pppoe_username": "user10@fibermedia",
    "pppoe_password": "secretPassword"
  }
  ```

### 3.4. Retry Provisioning Gagal
* **Method & URL:** `POST /admin/provisionings/{id}/retry`

---

## 4. BAST Digital, Approval Instalasi, & Laporan

### 4.1. Verifikasi & Approval Akhir Task Teknisi
* **Method & URL:** `PUT /admin/task-assignments/{id}/approve`
* **Efek:** Registrasi pelanggan otomatis ditandai `installed`, akun pelanggan aktif di sistem.

### 4.2. Kembalikan Tugas Lapangan (Revisi Teknisi)
* **Method & URL:** `PUT /admin/task-assignments/{id}/return`
* **Request Body:** `{"reason": "Foto ODP tidak fokus, harap foto ulang label port ODP"}`

### 4.3. Export Dokumen BAST (Berita Acara Serah Terima)
* `GET /admin/reports/submissions/{id}/bast` — Unduh BAST resmi ber-tanda tangan digital.
* `GET /admin/reports/submissions/{id}/pdf` — Unduh ringkasan instalasi (PDF).
* `GET /admin/reports/submissions/excel` — Unduh rekap instalasi bulanan (Excel).

---

## 5. Analytics, KPI, & SLA Breaches Tracker

### 5.1. Dashboard KPI Utama
* **Method & URL:** `GET /admin/analytics/kpi`
* **Metrik:** Total Revenue Bulanan, Total Pemasangan Berhasil, Rata-rata Durasi Instalasi (Lead Time SLA), Churn Rate.

### 5.2. Sales Funnel Analytics
* **Method & URL:** `GET /admin/analytics/funnel`
* **Tahapan:** `Draft` ➔ `Submitted` ➔ `Verified` ➔ `Scheduled` ➔ `Installed`.

### 5.3. Sebaran Regional & Trend Pemasangan
* `GET /admin/analytics/regional` — Persebaran pelanggan per wilayah/kecamatan.
* `GET /admin/analytics/trends` — Tren pendaftaran dari bulan ke bulan.

### 5.4. SLA Breaches Tracker
* `GET /admin/sla-breaches/summary` — Ringkasan jumlah tiket melewati batas toleransi SLA.
* `GET /admin/sla-breaches` — Daftar rincian pengerjaan yang mengalami keterlambatan.

---

## 6. Audit Trail & Web Push Notification (PWA)

### 6.1. Audit Trail Log
* **Method & URL:** `GET /admin/audit-logs`
* **Keterangan:** Mencatat seluruh histori modifikasi, siapa yang mengubah, IP address, dan timestamp.

### 6.2. Web Push PWA (Desktop & Mobile Browser)
* `GET /push-subscriptions/vapid-key` — Mengambil VAPID Public Key untuk inisialisasi service worker.
* `POST /push-subscriptions` — Mendaftarkan payload subscription browser.
* `DELETE /push-subscriptions` — Unsubscribe notifikasi.
