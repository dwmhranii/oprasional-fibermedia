# Dokumentasi API V3.0 – V3.2 — Sistem Pengaduan, Tim Teknisi, & Excel

Versi 3.x merupakan rilis besar terkini sistem Fibermedia Play, menghadirkan:
1. **Sistem Pengaduan Gangguan (Ticketing)** lengkap dengan SLA cerdas.
2. **Penugasan Teknisi Berbasis Tim (by Team)** dengan algoritma *Least-Loaded Round Robin*.
3. **Hierarki Wilayah Operasional Malang Raya** (3-Level Cascading Dropdown).
4. **Fitur Export & Import Excel Pelanggan** dengan auto-generate kode pelanggan dan upsert.
5. **Portal Lapangan Teknisi Pengaduan** (Mulai pengerjaan, jeda SLA, upload foto bukti fisik, redaman OPM).
6. **Superadmin Team & Role Permission Management**.

---

## 1. Modul Hierarki Wilayah Operasional (Malang Raya)

### 1.1. Ambil Struktur Wilayah Bertingkat (Cascading)
* **Method & URL:** `GET /admin/areas/hierarchy`
* **Response (200 OK):**
  ```json
  {
    "province": "Jawa Timur",
    "default_city": "Kota Malang",
    "data": [
      {
        "city": "Kota Malang",
        "districts": [
          {
            "name": "Lowokwaru",
            "villages": ["Dinoyo", "Jatimulyo", "Ketawanggede", "Lowokwaru", "Merjosari", "Mojolangu", "Sumbersari", "Tasikmadu", "Tlogomas", "Tulusrejo", "Tunggulwulung"]
          },
          {
            "name": "Klojen",
            "villages": ["Bareng", "Gadingkasri", "Kasin", "Kauman", "Kiduldalem", "Klojen", "Oro-Oro Dowo", "Penanggungan", "Rampal Celaket", "Samaan", "Sukoharjo"]
          },
          {
            "name": "Blimbing",
            "villages": ["Arjosari", "Balearjosari", "Blimbing", "Jodipan", "Kesatrian", "Pandandwangi", "Polehan", "Polowijen", "Purwantoro", "Purwodadi"]
          },
          {
            "name": "Sukun",
            "villages": ["Bakalan Krajan", "Bandulan", "Bandungrejosari", "Ciptomulyo", "Gadang", "Karangbesuki", "Kebonsari", "Mulyorejo", "Pisangcandi", "Sukun", "Tanjungrejo"]
          },
          {
            "name": "Kedungkandang",
            "villages": ["Arjowinangun", "Bumiayu", "Buring", "Cemorokandang", "Kedungkandang", "Kotalama", "Lesanpuro", "Madyopuro", "Mergosono", "Sawojajar", "Wonokoyo"]
          }
        ]
      },
      {
        "city": "Kabupaten Malang",
        "districts": [
          {
            "name": "Singosari",
            "villages": ["Ardimulyo", "Candirenggo", "Dengkol", "Klampok", "Pagentan", "Purwoasri", "Tunjungtirto", "Watugede"]
          },
          {
            "name": "Lawang",
            "villages": ["Bedali", "Kalirejo", "Ketindan", "Lawang", "Mulyoarjo", "Sidodadi", "Srigading", "Turirejo", "Wonorejo"]
          },
          {
            "name": "Dau",
            "villages": ["Gadingkulon", "Kalisongo", "Karangwidoro", "Kucur", "Landungsari", "Petungsewu", "Selorejo"]
          },
          {
            "name": "Karangploso",
            "villages": ["Ampeldento", "Bojok", "Donowarih", "Girilmulyo", "Kepuharjo", "Ngenep", "Ngijo", "Tawangargo", "Tegalgondo"]
          },
          {
            "name": "Pakis",
            "villages": ["Ampeldento", "Asrikaton", "Banjarejo", "Bunutwetan", "Kedungrejo", "Mangliawan", "Pakisjajar", "Pakiskembar", "Pagentan", "Saptorenggo", "Sekarpuro", "Sumberkradenan", "Sumberpasir"]
          }
        ]
      }
    ]
  }
  ```

---

## 2. Modul Kelola Pelanggan (Excel Export & Import)

### 2.1. Export Data Pelanggan ke Excel (.xlsx)
* **Method & URL:** `GET /admin/customers/export`
* **Query Parameters (Opsional):**
  * `status`: `active` | `suspended` | `terminated`
  * `search`: Kata kunci pencarian (nama, nomor WA, alamat, ODP)
* **Header Response:**
  * `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  * `Content-Disposition: attachment; filename="data-pelanggan-fibermedia-2026-10-13.xlsx"`

### 2.2. Unduh Format Template Import Excel
* **Method & URL:** `GET /admin/customers/import-template`
* **Response:** Mengunduh file `template-import-pelanggan.xlsx` yang sudah dilengkapi petunjuk kolom dan contoh data.

### 2.3. Upload & Import Data Pelanggan dari Excel / CSV
* **Method & URL:** `POST /admin/customers/import`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `file`: Berkas spreadsheet (`.xlsx`, `.xls`, `.csv`, maks: 10MB)
* **Kolom Spreadsheet yang Didukung:**
  * `nama` / `name` *(Wajib)*
  * `telepon` / `phone` *(Wajib)*
  * `alamat` / `address` *(Wajib)*
  * `paket` / `package` *(Opsional, default: "50 Mbps Home Ultra")*
  * `kode_odp` / `odp_code` *(Opsional)*
  * `status` *(Opsional: active / suspended / terminated)*
  * `kode_pelanggan` / `customer_code` *(Opsional — jika kosong otomatis digenerate `FM-YYYY-XXXXX`)*
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Import berhasil: 12 pelanggan baru ditambahkan, 3 diperbarui.",
    "data": {
      "imported": 12,
      "updated": 3,
      "skipped": 0,
      "total_processed": 15,
      "errors": []
    }
  }
  ```

---

## 3. Modul Tiket Pengaduan Gangguan (`/admin/complaints`)

### 3.1. Cek Duplikasi Tiket Terbuka
* **Method & URL:** `GET /admin/complaints/check-duplicate?phone=081234567890&customer_code=FM-2026-00001`
* **Response (200 OK):**
  ```json
  {
    "has_duplicate": true,
    "existing_ticket": {
      "id": 5,
      "ticket_number": "COMP-2026-00005",
      "status": "assigned",
      "subject": "Lampu LOS Merah Berkedip",
      "assigned_team": "Team A"
    }
  }
  ```

### 3.2. Buat Tiket Pengaduan Baru
* **Method & URL:** `POST /admin/complaints`
* **Format:** `multipart/form-data` *(Wajib menggunakan multipart form-data karena sistem mewajibkan pengunggahan lampiran tangkapan layar / bukti kendala)*
* **Request Payload (Form Data):**
  * `customer_name` *(string, required)* — Nama lengkap pelapor / pelanggan.
  * `customer_phone` *(string, required)* — Nomor WhatsApp aktif pelanggan. **Wajib hanya angka (numerik), minimal 9 digit dan maksimal 14 digit** (`regex:/^[0-9]+$/|min:9|max:14`). Contoh: `"081234567890"`.
  * `customer_code` *(string, optional)* — ID Pelanggan (contoh: `"FM-2026-00001"`). Jika diisi dan cocok dengan database, relasi pelanggan otomatis terhubung.
  * `customer_address` *(string, required)* — Alamat instalasi/rumah pelanggan.
  * `area` *(string, required)* — Wilayah operasional Malang Raya, contoh: `"Lowokwaru (Kota Malang)"`.
  * `category` *(string, required)*:
    * `no_signal` (Internet Mati Total / LOS Merah)
    * `slow_speed` (Koneksi Lambat)
    * `intermittent` (Koneksi Putus-Putus)
    * `equipment` (Perangkat Rusak / Terbakar)
    * `billing` (Masalah Tagihan)
    * `relocation` (Relokasi Titik ONT)
    * `other` (Lainnya)
  * `priority` *(string, required)*:
    * `critical` (Target SLA: 2 Jam)
    * `high` (Target SLA: 4 Jam)
    * `medium` (Target SLA: 8 Jam)
    * `low` (Target SLA: 24 Jam)
  * `subject` *(string, required)* — Subjek singkat permasalahan (contoh: `"Internet LOS Merah"`).
  * `description` *(string, required)* — Uraian lengkap kendala dari pelanggan.
  * `whatsapp_message` *(string, optional)* — Teks salinan percakapan WhatsApp dari pelanggan jika ada.
  * `attachments[]` *(file, required)* — **Wajib minimal 1 file dan maksimal 5 file** tangkapan layar (screenshot) / foto bukti gangguan (`jpg, jpeg, png, webp, pdf`, ukuran per file maksimal 5MB).
* **Response (201 Created):**
  ```json
  {
    "data": {
      "id": 1,
      "ticket_number": "CMP-20261015-0001",
      "customer_id": 12,
      "customer_code": "FM-2026-00001",
      "customer_name": "Pak Budi",
      "customer_phone": "081234567890",
      "customer_address": "Jl. Soekarno Hatta No. 10",
      "area": "Lowokwaru (Kota Malang)",
      "assigned_team": null,
      "team_members": [],
      "whatsapp_message": null,
      "attachments": [
        "https://api.fibermediaplay.com/storage/complaint-attachments/CMP-ATT-1728999999-1.jpg"
      ],
      "category": "no_signal",
      "subject": "Internet LOS Merah",
      "description": "Lampu LOS berkedip merah sejak pagi",
      "status": "open",
      "priority": "high",
      "sla_response_due_at": "2026-10-15T15:00:00+07:00",
      "sla_resolve_due_at": "2026-10-15T18:00:00+07:00",
      "is_sla_breached": false,
      "created_by": {
        "id": 2,
        "name": "Admin Dispatcher"
      },
      "created_at": "2026-10-15T14:00:00+07:00"
    }
  }
  ```

### 3.3. Ambil Daftar Tim Teknisi Tersedia (Available Teams)
* **Method & URL:** `GET /admin/teams/available`
* **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Team A",
        "member_count": 2,
        "active_tickets_count": 0,
        "is_available": true,
        "technicians": [
          { "id": 4, "name": "Teknisi 1 - Team A", "phone": "081200000101" },
          { "id": 5, "name": "Teknisi 2 - Team A", "phone": "081200000102" }
        ]
      },
      {
        "id": 2,
        "name": "Team B",
        "member_count": 2,
        "active_tickets_count": 2,
        "is_available": true,
        "technicians": [
          { "id": 6, "name": "Teknisi 1 - Team B", "phone": "081200000103" },
          { "id": 7, "name": "Teknisi 2 - Team B", "phone": "081200000104" }
        ]
      }
    ]
  }
  ```

### 3.4. Penugasan Tim Teknisi (Assign Ticket)
* **Method & URL:** `POST /admin/complaints/{id}/assign`
* **Aturan Hak Akses:**
  * **Role Admin:** Wajib **Otomatis** (tanpa parameter `team`). Sistem otomatis menugaskan ke Tim dengan beban tiket aktif paling sedikit (*Least-Loaded Round Robin*). Jika Admin memaksakan mengirim field `team`, server merespon `403 Forbidden`.
  * **Role Superadmin:** **Fleksibel**. Boleh memilih `team` secara manual atau mengosongkan untuk otomatis.
* **Payload Penugasan Manual (Superadmin):**
  ```json
  {
    "team": "Team A",
    "notes": "Prioritas pelanggan VIP, bawa ONT cadangan"
  }
  ```
* **Payload Penugasan Otomatis (Admin & Superadmin):**
  ```json
  {
    "notes": "Penugasan otomatis sistem"
  }
  ```

### 3.5. Penyelesaian Remote / Tanpa Kunjungan Lapangan
* **Method & URL:** `PUT /admin/complaints/{id}/resolve-remote`
* **Request Body:** `{"resolution_notes": "Dilakukan restart port OLT dari NOC, koneksi normal kembali."}`

### 3.6. Verifikasi Bukti & Penutupan Tiket (Admin / Superadmin)
* **Method & URL:** `PUT /admin/complaints/{id}/verify-close`
* **Request Body:**
  ```json
  {
    "evidence_verified": true,
    "notes": "Redaman OPM terpantau -18.2 dBm, foto bukti pengerjaan lengkap."
  }
  ```

### 3.7. Tolak / Kembalikan Tiket ke Teknisi (Return)
* **Method & URL:** `PUT /admin/complaints/{id}/return`
* **Request Body:**
  ```json
  {
    "reason": "Redaman masih di atas batas toleransi (-29 dBm), lakukan perapian sambungan fusion splicer."
  }
  ```

---

## 4. Modul Lapangan Teknisi Pengaduan (`/teknisi/complaints`)

Role Akses: `Teknisi`, `Admin`, `Superadmin`.

### 4.1. Daftar Tugas Pengaduan Tim Teknisi
* **Method & URL:** `GET /teknisi/complaints`
* **Mekanisme Otomatis:** API secara otomatis memfilter seluruh pengaduan yang ditugaskan ke **Tim teknisi tersebut** (`assigned_team = user.team`). Seluruh personil di tim yang sama melihat tiket yang sama secara real-time.
* **Filter:** `?status=assigned|in_progress|pending_customer|resolved`

### 4.2. Mulai Pengerjaan di Lapangan
* **Method & URL:** `POST /teknisi/complaints/{id}/start`
* **Efek:** Status tiket berubah menjadi `in_progress`.

### 4.3. Update Jadwal Janji Temu Kunjungan
* **Method & URL:** `PUT /teknisi/complaints/{id}/schedule-visit`
* **Request Body:** `{"scheduled_visit_at": "2026-10-14 14:00:00"}`

### 4.4. Jeda Tiket (Menunggu Pelanggan)
* **Method & URL:** `PUT /teknisi/complaints/{id}/pending-customer`
* **Efek:** Timer SLA dijeda (*paused*).
* **Request Body:** `{"reason": "Rumah pelanggan tertutup rapat, pelanggan konfirmasi bisa dikunjungi pukul 16.30 WIB."}`

### 4.5. Lanjutkan Pengerjaan (Resume from Pending)
* **Method & URL:** `PUT /admin/complaints/{id}/resume`

### 4.6. Selesaikan Tiket & Upload Foto Bukti Fisik
* **Method & URL:** `POST /teknisi/complaints/{id}/resolve`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `photos[]` *(required, minimal 1 file gambar)*: Foto OPM redaman optik, foto modem terpasang, atau perbaikan kabel.
  * `resolution_category` *(required, string)*:
    * `cable_broken` (Kabel Drop Putus / Terjepit)
    * `ont_faulty` (Penggantian Modem ONT Rusak)
    * `ont_reset` (Konfigurasi Ulang / Reset Perangkat)
    * `splitter_odp_issue` (Perbaikan Port ODP / Splitter)
    * `config_issue` (Masalah Konfigurasi PPPoE / VLAN)
    * `customer_side` (Kendala Kabel LAN / Perangkat Pribadi Pelanggan)
    * `other` (Lain-lain)
  * `description` *(optional, string)*: Rincian perbaikan di lapangan.

---

## 5. Modul Superadmin (Tim & Hak Akses)

Role Akses: `Superadmin`.

### 5.1. Manajemen Tim Lapangan (Teams)
* `GET /superadmin/teams` — Daftar semua tim (Team A, B, C, D)
* `POST /superadmin/teams` — Buat tim baru
* `GET /superadmin/teams/{id}` — Detail tim beserta personil teknisinya
* `PUT /superadmin/teams/{id}` — Edit nama tim & deskripsi
* `PATCH /superadmin/teams/{id}/toggle` — Nonaktifkan / aktifkan tim
* `POST /superadmin/teams/{id}/members` — Masukkan teknisi ke dalam tim (`{"user_ids": [4, 5]}`)

### 5.2. Role & Permission Matrix
* `GET /superadmin/roles` — Daftar role (`Superadmin`, `Admin`, `Sales`, `Teknisi`)
* `GET /superadmin/permissions` — Katalog permission sistem
* `PUT /superadmin/roles/{id}/permissions` — Perbarui hak akses permission per role

### 5.3. Manajemen User
* `GET /superadmin/users` — Daftar akun pengguna
* `POST /superadmin/users` — Buat akun baru (Admin, Teknisi, Sales)
* `PATCH /superadmin/users/{id}/status` — Blokir / aktifkan akun
* `POST /superadmin/users/{id}/reset-password` — Reset password akun langsung dari dashboard
