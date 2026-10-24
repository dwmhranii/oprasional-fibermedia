# Dokumentasi Resmi REST API — Fibermedia Provisioning & Complaint System
**Versi:** 3.2  
**Untuk:** Tim Frontend Developer (FE)  
**Base URL Development:** `http://127.0.0.1:8000/api`  
**Base URL Production:** `https://api.fibermediaplay.net/api`  

---

## 1. Standar Autentikasi & Header

Semua endpoint yang dilindungi (*protected routes*) membutuhkan header Bearer Token JWT/Sanctum:

```http
Authorization: Bearer <TOKEN_USER>
Accept: application/json
```

### Standar Format Response JSON
* **Response Sukses Standar:**
```json
{
  "success": true,
  "message": "Operasi berhasil dilakukan.",
  "data": { ... }
}
```
* **Response Error Validasi (HTTP 422):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "phone": ["Nomor WhatsApp wajib diisi."],
    "file": ["File harus berformat xlsx, xls, atau csv."]
  }
}
```

---

## 2. Modul Kelola Pelanggan (`/customers`)

Digunakan pada halaman **Kelola Pelanggan** (Admin & Superadmin).

### 2.1. Ambil Daftar Pelanggan
```http
GET /admin/customers
```
* **Query Parameters:**
  * `page` *(number)*: Nomor halaman (default: `1`).
  * `per_page` *(number)*: Jumlah data per halaman (default: `15`).
  * `search` *(string)*: Pencarian kode pelanggan, nama, telepon, alamat, paket, atau ODP.
  * `status` *(string)*: `active` | `suspended` | `terminated`.
* **Response (HTTP 200):**
```json
{
  "data": [
    {
      "id": 1,
      "customer_code": "FM-2026-00001",
      "name": "Pak Herman",
      "phone": "081234567890",
      "address": "Jl. Soekarno Hatta No. 45, Lowokwaru, Kota Malang",
      "package": "50 Mbps Home Ultra",
      "odp_code": "ODP-MLG-01",
      "status": "active",
      "created_at": "2026-10-12T10:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 68
  }
}
```

### 2.2. Statistik Metrik Pelanggan
```http
GET /admin/customers/stats
```
* **Response (HTTP 200):**
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

### 2.3. Ubah Status Pelanggan
```http
PATCH /admin/customers/{id}/status
```
* **Request Body:**
```json
{
  "status": "suspended", // "active" | "suspended" | "terminated"
  "notes": "Isolir sementara atas permintaan pelanggan"
}
```

### 2.4. Export Data Pelanggan ke Excel (.xlsx)
```http
GET /admin/customers/export
```
* **Query Parameters (Opsional):**
  * `status`: Filter status (`active` / `suspended` / `terminated`).
  * `search`: Kata kunci pencarian.
* **Response:** File Binary Stream (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

### 2.5. Unduh Template Import Excel Pelanggan
```http
GET /admin/customers/import-template
```
* **Response:** File Binary Excel (`template-import-pelanggan.xlsx`) berisi baris panduan & data contoh.

### 2.6. Import Data Pelanggan dari Excel / CSV
```http
POST /admin/customers/import
```
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `file`: File spreadsheet (`.xlsx`, `.xls`, `.csv`, max: 10MB).
* **Response (HTTP 200):**
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

## 3. Modul Manajemen Pengaduan (`/complaints`)

Digunakan pada menu **Manajemen Pengaduan** (Admin & Superadmin).

### 3.1. Ambil Hierarki Wilayah Operasional (Malang Raya)
Digunakan untuk mengisi 3 tingkat dropdown bertingkat (*Cascading Dropdown*):
```http
GET /admin/areas/hierarchy
```
* **Response (HTTP 200):**
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
        }
      ]
    },
    {
      "city": "Kabupaten Malang",
      "districts": [
        {
          "name": "Singosari",
          "villages": ["Ardimulyo", "Candirenggo", "Dengkol", "Klampok", "Pagentan", "Purwoasri", "Tunjungtirto", "Watugede"]
        }
      ]
    }
  ]
}
```

### 3.2. Cek Duplikasi Tiket Pelanggan
Dipanggil saat staf mengisi nomor telepon / ID pelanggan untuk mencegah duplikasi:
```http
GET /admin/complaints/check-duplicate?phone=081234567890&customer_code=FM-00123
```
* **Response (HTTP 200):**
```json
{
  "has_duplicate": true,
  "existing_ticket": {
    "id": 2,
    "ticket_number": "COMP-2026-00002",
    "status": "assigned",
    "subject": "Internet LOS Merah"
  }
}
```

### 3.3. Buat Tiket Pengaduan Baru
```http
POST /admin/complaints
```
* **Content-Type:** `multipart/form-data` *(Wajib multipart/form-data karena memerlukan upload berkas bukti fisik/screenshot kendala)*
* **Body / FormData:**
  * `customer_name` *(required|string)*: Nama pelapor/pelanggan.
  * `customer_phone` *(required|string)*: Nomor WA pelapor — **Wajib angka numerik, minimal 9 digit dan maksimal 14 digit** (`regex:/^[0-9]+$/|min:9|max:14`), contoh: `"081234567890"`.
  * `customer_code` *(optional|string)*: Kode ID pelanggan (misal: `"FM-2026-00001"`).
  * `customer_address` *(required|string)*: Alamat lengkap lokasi kendala.
  * `area` *(required|string)*: Format `"Kecamatan (Kab/Kota)"`, contoh `"Lowokwaru (Kota Malang)"`.
  * `category` *(required|string)*: 
    * `no_signal` (Internet Mati Total)
    * `slow_speed` (Koneksi Lambat)
    * `intermittent` (Putus-Putus)
    * `equipment` (Perangkat Rusak)
    * `billing` (Kendala Tagihan - diselesaikan Admin)
    * `relocation` (Relokasi ONT)
    * `other` (Lainnya)
  * `priority` *(required|string)*: `low` | `medium` | `high` | `critical`.
  * `subject` *(required|string)*: Subjek singkat kendala.
  * `description` *(required|string)*: Deskripsi rinci keluhan.
  * `whatsapp_message` *(optional|string)*: Salinan chat WA asli pelanggan.
  * `attachments[]` *(required|array of files)*: **Wajib diunggah minimal 1 file** (maksimal 5 file, image/pdf hingga 5MB). File ini berfungsi sebagai bukti screenshot kendala / laporan awal.
* **Response (HTTP 201 Created):**
```json
{
  "data": {
    "id": 1,
    "ticket_number": "CMP-20261015-0001",
    "customer_name": "Pak Budi",
    "customer_phone": "081234567890",
    "customer_address": "Jl. Soekarno Hatta No. 10",
    "area": "Lowokwaru (Kota Malang)",
    "attachments": [
      "https://api.fibermediaplay.com/storage/complaint-attachments/CMP-ATT-1728999999-1.jpg"
    ],
    "category": "no_signal",
    "subject": "Internet LOS Merah",
    "description": "Lampu LOS berkedip merah sejak pagi",
    "status": "open",
    "priority": "high",
    "created_at": "2026-10-15T14:00:00+07:00"
  }
}
```


### 3.4. Ambil Daftar Tim Teknisi yang Tersedia
Digunakan pada modal penugasan Superadmin:
```http
GET /admin/teams/available
```
* **Response (HTTP 200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Team A",
      "member_count": 2,
      "active_tickets_count": 1,
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
      "active_tickets_count": 0,
      "is_available": true,
      "technicians": [
        { "id": 6, "name": "Teknisi 1 - Team B", "phone": "081200000103" },
        { "id": 7, "name": "Teknisi 2 - Team B", "phone": "081200000104" }
      ]
    }
  ]
}
```

### 3.5. Penugasan Tim Teknisi (Assign Ticket)
```http
POST /admin/complaints/{id}/assign
```
* **Aturan Hak Akses (RBAC):**
  * **Role Admin:** Wajib otomatis (tanpa body `team`). Sistem menjalankan **Round Robin Least-Loaded Antar Tim**. Jika Admin mengirimkan `team`, sistem mengembalikan error `403 Forbidden`.
  * **Role Superadmin:** Fleksibel — boleh memilih `team` secara manual ATAU mengosongkannya untuk Round Robin.
* **Request Body (Superadmin Manual):**
```json
{
  "team": "Team A",
  "notes": "Harap bawa ONT cadangan tipe HG8245H"
}
```
* **Request Body (Admin / Superadmin Auto Round Robin):**
```json
{
  "notes": "Penugasan otomatis sistem"
}
```

### 3.6. Verifikasi Bukti Teknisi & Tutup Tiket
Tiket berstatus `resolved` ditutup oleh Admin setelah mengecek foto bukti pekerjaan teknisi:
```http
PUT /admin/complaints/{id}/verify-close
```
* **Request Body:**
```json
{
  "evidence_verified": true,
  "notes": "Pekerjaan rapi, redaman optik sudah normal -18 dBm."
}
```

### 3.7. Kembalikan Tiket ke Teknisi (Return)
Jika bukti foto atau pekerjaan teknisi dinilai belum tuntas:
```http
PUT /admin/complaints/{id}/return
```
* **Request Body:**
```json
{
  "reason": "Redaman masih tinggi -29 dBm, mohon lakukan penarikan ulang di ODP."
}
```

---

## 4. Modul Tugas Pengaduan Teknisi (`/teknisi/complaints`)

Digunakan pada portal atau menu khusus **Teknisi Lapangan**.

### 4.1. Ambil Tugas Pengaduan Teknisi
```http
GET /teknisi/complaints
```
* **Autentikasi:** Bearer Token akun Teknisi.
* **Otomatisasi:** Sistem otomatis menampilkan seluruh tiket yang ditugaskan ke **Tim Teknisi tersebut** (`assigned_team = user.team`).
* **Query Parameters (Opsional):**
  * `status`: `assigned` | `in_progress` | `pending_customer` | `resolved`

### 4.2. Mulai Pengerjaan di Lapangan
Mengubah status tiket menjadi `in_progress`:
```http
POST /teknisi/complaints/{id}/start
```

### 4.3. Simpan Jadwal Kunjungan Lapangan
```http
PUT /teknisi/complaints/{id}/schedule-visit
```
* **Request Body:**
```json
{
  "scheduled_visit_at": "2026-10-14 09:30:00"
}
```

### 4.4. Jeda Tiket (Menunggu Pelanggan)
Menjeda perhitungan timer SLA karena kendala di sisi pelanggan (misal: rumah kosong):
```http
PUT /teknisi/complaints/{id}/pending-customer
```
* **Request Body:**
```json
{
  "reason": "Pelanggan sedang tidak di tempat, janji temu jam 16.00 WIB."
}
```

### 4.5. Fase 1: Penyelesaian Teknis Lapangan & Upload Bukti Fisik
Dijalankan oleh perwakilan teknisi tim saat perbaikan kendala selesai:
```http
POST /teknisi/complaints/{id}/phase-1
```
*(Catatan: Endpoint lama `POST /teknisi/complaints/{id}/resolve` tetap berfungsi sebagai alias backward-compatible)*

* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `photos[]` *(required|file)*: Minimal 1 foto, maksimal 5 foto bukti fisik hasil perbaikan (kabel drop, redaman OPM, foto perangkat ONT). **Wajib difoto langsung dari kamera belakang HP & dikompres maks 2MB**.
  * `resolution_category` *(required|string)*:
    * `cable_broken` (Kabel Putus / Tertekuk)
    * `ont_faulty` (Ganti Perangkat ONT)
    * `ont_reset` (Reset / Setting Router)
    * `splitter_odp_issue` (Masalah ODP / Splitter)
    * `config_issue` (Konfigurasi PPPoE / VLAN)
    * `customer_side` (Kendala Perangkat User / Kabel LAN)
    * `other` (Lainnya)
  * `description` *(required|string)*: Uraian teknis perbaikan yang dilakukan (min 10 karakter).
  * `opm_redaman` *(optional|string)*: Angka redaman optik terakhir, contoh: `"-18.5 dBm"`.
* **Respon (HTTP 200 OK):**
  * Jika seluruh anggota tim sudah melakukan absensi Fase 2: status tiket langsung menjadi `resolved`.
  * Jika masih ada anggota tim yang belum absen: status tiket berpindah ke `phase_1_completed` (menunggu absensi rekan tim).

---

### 4.6. Fase 2: Absensi Mandiri Setiap Teknisi di Tim (Selfie & Geotag)
**Masing-masing personel teknisi di tim yang bertugas WAJIB melakukan absensi mandiri** untuk membuktikan kehadiran fisik di lokasi pelanggan (mencegah teknisi fiktif/titip absen):
```http
POST /teknisi/complaints/{id}/phase-2-attendance
```
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `selfie_photo` *(required|file)*: Foto selfie wajah teknisi di lokasi. **Wajib langsung dari kamera depan HP**, terdapat watermark (No Tiket, Nama, Waktu, Koordinat GPS), dan ukuran file maksimal 2 MB.
  * `latitude` *(required|numeric)*: Koordinat GPS latitude (-90 s/d 90).
  * `longitude` *(required|numeric)*: Koordinat GPS longitude (-180 s/d 180).
  * `accuracy` *(optional|numeric)*: Akurasi sinyal GPS dalam meter (contoh: `12.5`).
* **Respon (HTTP 200 OK):**
```json
{
  "message": "Absensi Anda tercatat dan seluruh tim telah lengkap! Tiket pengaduan resmi diselesaikan (RESOLVED).",
  "attendance": {
    "id": 1,
    "user_id": 4,
    "technician_name": "Teknisi 1 - Team A",
    "selfie_url": "https://api.fibermediaplay.com/storage/complaints/1/attendances/selfie-4.jpg",
    "latitude": -7.942150,
    "longitude": 112.615280,
    "accuracy": 8.0,
    "distance_meters": 45.2,
    "is_within_radius": true,
    "clocked_at": "2026-10-15T15:10:00+07:00"
  },
  "complaint": {
    "id": 1,
    "status": "resolved",
    "phase_1_completed_at": "2026-10-15T15:05:00+07:00",
    "phase_2_completed_at": "2026-10-15T15:10:00+07:00",
    "all_team_members_attended": true
  }
}
```

---

### 4.7. Cek Status Kehadiran Tim Lapangan
Digunakan untuk merender kartu absensi tim di aplikasi FE:
```http
GET /teknisi/complaints/{id}/attendances
```
* **Respon (HTTP 200 OK):**
```json
{
  "assigned_team": "Team A",
  "all_team_members_attended": false,
  "team_members": [
    { "id": 4, "name": "Teknisi 1 - Team A", "phone": "081200000101" },
    { "id": 5, "name": "Teknisi 2 - Team A", "phone": "081200000102" }
  ],
  "attendances": [
    {
      "id": 1,
      "user_id": 4,
      "technician_name": "Teknisi 1 - Team A",
      "selfie_url": "https://api.fibermediaplay.com/storage/...",
      "latitude": -7.942150,
      "longitude": 112.615280,
      "distance_meters": 45.2,
      "is_within_radius": true,
      "clocked_at": "2026-10-15T15:10:00+07:00"
    }
  ]
}
```

---

### 4.8. Panduan Integrasi Frontend (Kamera Langsung, Watermark, & Kompresi <2MB)

Untuk memenuhi instruksi bisnis:
1. **Kamera Langsung (Anti-Galeri):**
   * Gunakan tag input dengan atribut `capture`:
     * Kamera Belakang (Bukti Teknis): `<input type="file" accept="image/*" capture="environment" />`
     * Kamera Depan (Selfie Absen): `<input type="file" accept="image/*" capture="user" />`
2. **Watermark & Kompresi Otomatis (Helper TypeScript/React):**
   Frontend disarankan menggunakan helper canvas berikut sebelum memanggil API `formData.append()`:

```typescript
// src/app/lib/cameraHelper.ts

interface WatermarkOptions {
  ticketNumber: string;
  technicianName: string;
  latitude: number;
  longitude: number;
  locationName?: string;
}

/**
 * 1. Gambar watermark permanen di atas canvas.
 * 2. Kompres adaptif ke file JPEG dengan ukuran maksimal 2.0 MB.
 */
export async function stampWatermarkAndCompress(
  file: File,
  meta: WatermarkOptions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));

        // Skala proporsional (max lebar/tinggi 1920px untuk ketajaman optimal)
        const MAX_DIM = 1920;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Buat Strip Gelap Semi-Transparan di Bagian Bawah
        const bannerHeight = Math.max(90, Math.round(height * 0.12));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

        // Gambar Garis Aksen Oranye Fibermedia
        ctx.fillStyle = '#ff6b00';
        ctx.fillRect(0, height - bannerHeight, width, 4);

        // Styling Teks Watermark
        const fontSize = Math.max(14, Math.round(width * 0.02));
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff';

        const now = new Date().toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const line1 = `[${meta.ticketNumber}] • ${meta.technicianName} • ${now} WIB`;
        const line2 = `GPS: ${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)} ${meta.locationName ? `(${meta.locationName})` : ''}`;

        ctx.fillText(line1, 24, height - bannerHeight + (bannerHeight * 0.42));
        ctx.font = `400 ${fontSize * 0.9}px sans-serif`;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(line2, 24, height - bannerHeight + (bannerHeight * 0.8));

        // Kompresi Adaptif Loop: Pastikan file < 2 MB (Target ~1.2 MB)
        let quality = 0.85;
        const compressLoop = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Gagal kompresi canvas'));
              // Jika ukuran > 2MB dan kualitas masih > 0.4, turunkan kualitas
              if (blob.size > 2 * 1024 * 1024 && q > 0.4) {
                compressLoop(q - 0.12);
              } else {
                const watermarkedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(watermarkedFile);
              }
            },
            'image/jpeg',
            q
          );
        };

        compressLoop(quality);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

## 5. Ringkasan Siklus Status Tiket Pengaduan (2-Phase State Machine)

```
[OPEN] ──(Assign Team)──> [ASSIGNED] ──(Teknisi Start)──> [IN_PROGRESS]
  │                                                            │
  │ (Resolve Remote)                                           │  (Fase 1: Pengerjaan Teknis)
  ▼                                                            ▼
[CLOSED]                                            [PHASE_1_COMPLETED]
  ▲                                                            │
  │                                                            │  (Fase 2: Seluruh Anggota Tim Absen)
  │                                                            ▼
  │ (Admin Verifikasi Bukti)                               [RESOLVED]
  └────────────────────────────────────────────────────────────┘
```

---

## 6. Modul Tugas Lapangan Teknisi PSB / Pasang Baru (`/teknisi/tasks`)

Digunakan pada portal aplikasi lapangan untuk **Instalasi Pasang Baru (PSB)**.  
**Aturan Utama PSB:**
* **Kamera Langsung (*Anti-Galeri*):** Semua foto instalasi wajib diambil langsung dari kamera saat berada di rumah pelanggan. Dilarang memilih dari album / galeri.
* **Geotagging Real-Time:** Koordinat latitude, longitude, dan akurasi GPS diambil tepat saat tombol kamera ditekan.
* **Kompresi Otomatis Maksimal 2 MB:** Foto dikompres di browser sebelum di-upload agar proses upload super cepat & hemat kuota.
* **Watermark Digital Permanen:** Menempelkan identitas No. SPK / Task, Nama Pelanggan, Nama Teknisi, Tanggal/Waktu, dan Koordinat GPS.

---

### 6.1. Ambil Daftar Tugas PSB Teknisi
```http
GET /teknisi/tasks
```
* **Header:** `Authorization: Bearer <TOKEN_TEKNISI>`
* **Query Parameters (Opsional):**
  * `status`: `assigned` | `on_the_way` | `in_progress` | `phase_1_submitted` | `completed`
* **Response (HTTP 200 OK):** Menampilkan daftar tugas pasang baru yang ditugaskan ke tim teknisi bersangkutan.

---

### 6.2. Detail Tugas PSB & Informasi Pelanggan
```http
GET /teknisi/tasks/{id}
```
* **Response (HTTP 200 OK):**
  * Data pelanggan: Nama, Alamat, No. WA, Paket Bandwidth, Koordinat Target (`lat`, `lng`).
  * Data teknis: Port ODP, No. Redaman, Tipe Modem ONT.
  * Status pengerjaan & checklist material.

---

### 6.3. Upload Foto Instalasi PSB (Kamera Belakang, Watermark, & Kompresi <2MB)
Upload berkas dokumentasi fisik pemasangan:
```http
POST /teknisi/tasks/{id}/upload-photo
```
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `photo_type` *(required|string)*:
    * `before`: Foto kondisi lokasi sebelum instalasi (ODP / dinding rumah pelanggan).
    * `after`: Foto hasil pemasangan selesai (modem menyala, lampu PON hijau).
    * `modem`: Foto barcode / serial number (SN) & MAC Address modem ONT.
    * `cabling`: Foto kerapian penarikan kabel drop core / roset.
    * `speedtest`: Foto hasil uji kecepatan bandwidth di HP/laptop pelanggan.
    * `selfie` / `attendance`: Foto selfie kehadiran teknisi.
  * `photo` *(required|file)*: **Wajib foto langsung dari kamera HP**, format `.jpg`, `.jpeg`, `.png`, `.webp`, dan **ukuran maksimal 2 MB (2048 KB)**.
  * `latitude` *(optional|numeric)*: Koordinat latitude GPS saat tombol kamera ditekan (-90 s/d 90).
  * `longitude` *(optional|numeric)*: Koordinat longitude GPS saat tombol kamera ditekan (-180 s/d 180).
  * `accuracy` *(optional|numeric)*: Akurasi sinyal GPS dalam meter.

---

### 6.4. Upload Tanda Tangan Digital Pelanggan (BAST Pasang Baru)
```http
POST /teknisi/tasks/{id}/upload-signature
```
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `signature` *(required|file)*: Berkas gambar tanda tangan digital pelanggan dari canvas touchscreen (maksimal 2 MB).

---

### 6.5. Penyelesaian PSB 2 Fase (Phase 1 & Phase 2)

#### A. Fase 1: Selesai Pemasangan Teknis & Verifikasi Pelanggan
```http
POST /teknisi/tasks/{id}/phase-1
```
* **Syarat:**
  1. Foto `before` dan `after` sudah di-upload.
  2. Tanda tangan digital pelanggan (`signature`) sudah di-upload.
* **Respon:** Status tugas PSB berpindah ke `phase_1_submitted`.

#### B. Fase 2: Absensi Mandiri Teknisi di Lokasi Pelanggan (Geofence 500m)
```http
POST /teknisi/tasks/{id}/phase-2
```
* **Syarat:**
  1. Foto selfie absensi sudah di-upload via `upload-photo` (`photo_type: selfie`).
  2. Berada di dalam radius geofence **500 meter** dari koordinat rumah pelanggan (`submission.lat`, `submission.lng`).
* **Request Body (JSON):**
```json
{
  "completion_notes": "Pemasangan kabel 120m selesai, redaman -19.2 dBm, modem ZTE F609 aktif lancar.",
  "latitude": -7.942150,
  "longitude": 112.615280,
  "accuracy": 8.5
}
```
* **Respon:** Status penugasan teknisi menjadi `phase_2_complete`. Setelah seluruh anggota tim aktif yang ditugaskan (baik tim dengan 1 anggota solo maupun berpasangan) menyelesaikan Fase 2 dan di-*approve* Admin/Superadmin, tugas PSB resmi selesai (`completed`).

---

### 6.6. Contoh Penerapan Kamera & Watermark PSB di Frontend (React / TypeScript)

```tsx
import React, { useState } from 'react';
import { stampWatermarkAndCompress } from '../lib/cameraHelper';

export const PsbPhotoCapture: React.FC<{ taskId: number; regNumber: string; customerName: string }> = ({
  taskId,
  regNumber,
  customerName,
}) => {
  const [loading, setLoading] = useState(false);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>, photoType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 1. Ambil Koordinat GPS Instan saat Foto Diambil
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // 2. Tempelkan Watermark PSB & Kompres < 2 MB via Canvas
          const processedFile = await stampWatermarkAndCompress(file, {
            ticketNumber: regNumber,
            technicianName: 'Teknisi PSB (Team A)',
            latitude,
            longitude,
            locationName: customerName,
          });

          // 3. Kirim via Multipart Form Data ke Backend
          const formData = new FormData();
          formData.append('photo_type', photoType);
          formData.append('photo', processedFile);
          formData.append('latitude', latitude.toString());
          formData.append('longitude', longitude.toString());
          formData.append('accuracy', accuracy.toString());

          const res = await fetch(`/api/teknisi/tasks/${taskId}/upload-photo`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              Accept: 'application/json',
            },
            body: formData,
          });

          const data = await res.json();
          alert(`Foto ${photoType} berhasil diunggah (${(processedFile.size / 1024).toFixed(0)} KB)!`);
        },
        (err) => alert(`Gagal mengambil GPS: ${err.message}`),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Kamera Belakang untuk Foto Fisik Instalasi (Anti-Galeri) */}
      <div>
        <label>Foto Setelah Pemasangan (ONT Menyala):</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleCapture(e, 'after')}
        />
      </div>

      {/* 2. Kamera Depan untuk Selfie Absensi Teknisi (Anti-Galeri) */}
      <div>
        <label>Foto Selfie Absensi Teknisi di Lokasi:</label>
        <input
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => handleCapture(e, 'selfie')}
        />
      </div>
    </div>
  );
};
```

---

## 7. Modul Terpadu Work Order & Live Tracking (*Unified FSM*)

Modul ini menyatukan seluruh pekerjaan lapangan (**Pasang Baru / PSB** dan **Perbaikan Gangguan / Komplain**) menjadi satu pintu:
* **Bagi Teknisi**: Cukup melihat 1 menu terpadu (*My Work Orders*) yang otomatis diurutkan berdasarkan skala prioritas & SLA.
* **Bagi Admin & Superadmin**: Peta Komando (*Command Center Map*) untuk melihat seluruh pergerakan tim teknisi di Malang Raya secara *real-time*.

---

### 7.1. Ambil Feed Terpadu Work Order Teknisi (Satu Pintu)
```http
GET /teknisi/work-orders
```
* **Header:** `Authorization: Bearer <TOKEN_TEKNISI>`
* **Query Parameters (Opsional):**
  * `type`: `all` (default) | `psb` | `complaint`
  * `status`: `active` (default) | `completed` | `all`
  * `search`: Kata kunci nomor tiket, nama pelanggan, alamat, atau nomor telepon.
* **Aturan Pengurutan Otomatis:**
  1. Komplain *Critical* dengan sisa waktu SLA paling mepet ditaruh paling atas.
  2. Pekerjaan yang sedang berlangsung (`in_progress`).
  3. Tugas terpasang / terjadwal hari ini.
* **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": "WO-CMP-12",
      "raw_id": 12,
      "type": "complaint",
      "type_label": "Gangguan (Komplain)",
      "ticket_number": "CMP-20261015-0001",
      "title": "Internet LOS Merah",
      "category": "no_signal",
      "customer_name": "Pak Budi",
      "customer_phone": "081234567890",
      "customer_address": "Jl. Soekarno Hatta No. 10",
      "area": "Lowokwaru (Kota Malang)",
      "coordinates": {
        "lat": -7.942150,
        "lng": 112.615280
      },
      "priority": "critical",
      "status": "in_progress",
      "assigned_team": "Team A",
      "is_two_phase": true,
      "phase_1_done": true,
      "phase_2_done": false,
      "sla_due_at": "2026-10-15T18:00:00+07:00",
      "is_sla_breached": false,
      "created_at": "2026-10-15T14:00:00+07:00"
    },
    {
      "id": "WO-TSK-4",
      "raw_id": 4,
      "type": "psb",
      "type_label": "Pasang Baru (PSB)",
      "ticket_number": "REG-20261015-0012",
      "title": "Instalasi PSB — 50 Mbps Home Ultra",
      "category": "installation",
      "customer_name": "Ibu Ratna",
      "customer_phone": "081298765432",
      "customer_address": "Jl. Candi Mendut No. 5",
      "area": "Lowokwaru (Kota Malang)",
      "coordinates": {
        "lat": -7.948210,
        "lng": 112.621040
      },
      "priority": "medium",
      "status": "assigned",
      "assigned_team": "Team A",
      "is_two_phase": true,
      "phase_1_done": false,
      "phase_2_done": false,
      "sla_due_at": null,
      "is_sla_breached": false,
      "created_at": "2026-10-15T13:30:00+07:00"
    }
  ]
}
```

---

### 7.2. Detail Spesifik Work Order
```http
GET /teknisi/work-orders/{id}
```
* **Contoh ID:** `WO-CMP-12` atau `WO-TSK-4`
* **Response (HTTP 200 OK):** Mengembalikan detail komprehensif dari komplain (beserta riwayat absensi tim & foto bukti OPM) atau tugas PSB (beserta BAST & checklist).

---

### 7.3. Live Fleet Map & Tracking Lapangan (Admin & Superadmin)
Digunakan untuk merender **Peta Operasional Malang Raya** (Leaflet / Mapbox) di Dashboard Admin & Superadmin:
```http
GET /admin/tracking/live-map
```
* **Header:** `Authorization: Bearer <TOKEN_ADMIN_ATAU_SUPERADMIN>`
* **Query Parameters (Opsional):**
  * `team`: `all` | `Team A` | `Team B` | `Team C`
  * `type`: `all` | `psb` | `complaint`
* **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_active_work_orders": 8,
      "active_psb_count": 5,
      "active_complaints_count": 3,
      "active_teams_count": 4
    },
    "teams": [
      {
        "name": "Team A",
        "member_count": 2,
        "members": [
          { "id": 4, "name": "Teknisi 1 - Team A", "phone": "081200000101" },
          { "id": 5, "name": "Teknisi 2 - Team A", "phone": "081200000102" }
        ],
        "total_active_wos": 2,
        "psb_count": 1,
        "complaint_count": 1,
        "status": "busy",
        "current_work_order": {
          "id": "WO-CMP-12",
          "type": "complaint",
          "ticket_number": "CMP-20261015-0001",
          "customer_name": "Pak Budi",
          "status": "in_progress"
        }
      },
      {
        "name": "Team B",
        "member_count": 2,
        "members": [
          { "id": 6, "name": "Teknisi 1 - Team B", "phone": "081200000103" },
          { "id": 7, "name": "Teknisi 2 - Team B", "phone": "081200000104" }
        ],
        "total_active_wos": 0,
        "psb_count": 0,
        "complaint_count": 0,
        "status": "standby",
        "current_work_order": null
      }
    ],
    "work_orders": [
      {
        "id": "WO-CMP-12",
        "type": "complaint",
        "ticket_number": "CMP-20261015-0001",
        "title": "Internet LOS Merah",
        "customer_name": "Pak Budi",
        "coordinates": { "lat": -7.942150, "lng": 112.615280 },
        "status": "in_progress",
        "assigned_team": "Team A"
      }
    ]
  }
}
```

---

### 7.4. Seluruh Daftar Work Order untuk Admin & Superadmin
```http
GET /admin/work-orders
```
* **Filter:** `team`, `type` (`psb` / `complaint`), `status`, `search`.
* Memberikan tabel komprehensif bagi Admin untuk mengawasi seluruh antrian pekerjaan lapangan lintas tim di satu tempat.

---

## 8. Modul Pasang Baru (PSB): Kredensial BFASS & Penugasan Teknisi

Digunakan pada alur penugasan pemasangan baru (**PSB**) setelah pengajuan divalidasi (*Approved*).

### 8.1. Input Kredensial BFASS & Penugasan Tim (Auto / Manual)
```http
PUT /api/admin/provisionings/{provisioning_id}/bfass-credentials
```
* **Header:** `Authorization: Bearer <TOKEN_ADMIN_ATAU_SUPERADMIN>`
* **Aturan Hak Akses (RBAC):**
  * **Role Admin:** Wajib menggunakan penugasan otomatis (*Round Robin* antar tim aktif). Sistem akan menolak dengan error `403 Forbidden` jika Admin mencoba mengirim `technician_id` atau `team`.
  * **Role Superadmin:** Fleksibel — dapat memilih **Otomatis Round Robin** ATAU **Manual Teknisi / Tim**.
* **Aturan Anggota Tim:** Sistem mendukung tim dengan **minimal 1 orang teknisi aktif** (solo). Tim 1 orang tetap sah menerima tugas PSB dan menyelesaikan Fase 1 & 2 secara mandiri.

#### A. Request Body: Mode Otomatis (Round Robin)
```json
{
  "bfass_username": "cust_fibermedia_001",
  "bfass_password": "SecretPassword123",
  "vlan": "100",
  "odp": "ODP-MLG-01/05",
  "onu_serial_number": "HWTC12345678",
  "notes": "Pemasangan kabel drop core max 150m",
  "assignment_mode": "round_robin"
}
```

#### B. Request Body: Mode Manual Pilih Teknisi (Khusus Superadmin)
```json
{
  "bfass_username": "cust_fibermedia_001",
  "bfass_password": "SecretPassword123",
  "vlan": "100",
  "odp": "ODP-MLG-01/05",
  "onu_serial_number": "HWTC12345678",
  "notes": "Ditugaskan ke teknisi senior",
  "assignment_mode": "manual",
  "technician_id": 4
}
```

#### C. Request Body: Mode Manual Pilih Tim (Khusus Superadmin)
```json
{
  "bfass_username": "cust_fibermedia_001",
  "bfass_password": "SecretPassword123",
  "vlan": "100",
  "odp": "ODP-MLG-01/05",
  "onu_serial_number": "HWTC12345678",
  "notes": "Ditugaskan ke Team B",
  "assignment_mode": "manual",
  "team": "Team B"
}
```

* **Response Sukses (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "BFASS credentials saved and Task assigned successfully.",
  "data": {
    "id": 1,
    "provisioning_number": "PRV-20261017-0001",
    "status": "ready",
    "bfass_status": "success",
    "tasks": [
      {
        "id": 10,
        "task_number": "TSK-20261017-ABCD",
        "assigned_team": "Team A",
        "status": "assigned"
      }
    ]
  }
}
```

---

### 8.2. Ambil Opsi Dropdown Teknisi & Tim untuk Form Superadmin
Frontend dapat memuat daftar teknisi dan tim secara dinamis:
1. **Daftar Teknisi Aktif:**
   ```http
   GET /api/admin/technicians/available
   ```
   *Mengembalikan daftar teknisi lengkap dengan nama, ID, nomor telepon, tim, dan status ketersediaan.*
2. **Daftar Tim Aktif:**
   ```http
   GET /api/admin/teams/available
   ```
   *Mengembalikan daftar tim beserta jumlah anggota teknisi di masing-masing tim.*

---

### 8.3. Penugasan Ulang Tugas PSB yang Berjalan (*Reassign Task*)
Khusus akun ber-role **Superadmin**, jika tugas PSB yang sudah dibuat perlu dialihkan ke teknisi/tim lain:
```http
PATCH /api/admin/tasks/{task_id}/reassign
```
* **Header:** `Authorization: Bearer <TOKEN_SUPERADMIN>`
* **Request Body:**
```json
{
  "assignment_mode": "manual",
  "technician_id": 6
}
```
*(Atau gunakan `"team": "Team C"` atau `"assignment_mode": "round_robin"`)*
* **Response Sukses (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Tugas berhasil dialihkan ke tim Team B.",
  "data": {
    "id": 10,
    "task_number": "TSK-20261017-ABCD",
    "assigned_team": "Team B",
    "teknisi_id": 6,
    "status": "assigned"
  }
}
```

---

### 8.4. Contoh Implementasi Form Input Kredensial BFASS (React + TypeScript)

```tsx
import React, { useState, useEffect } from 'react';

interface Props {
  provisioningId: number;
  userRole: 'Superadmin' | 'Admin';
  onSuccess: () => void;
  onClose: () => void;
}

interface Technician {
  id: number;
  name: string;
  team: string;
  is_available: boolean;
}

export const BfassAssignmentModal: React.FC<Props> = ({
  provisioningId,
  userRole,
  onSuccess,
  onClose,
}) => {
  const [mode, setMode] = useState<'round_robin' | 'manual'>('round_robin');
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Kredensial BFASS
  const [formData, setFormData] = useState({
    bfass_username: '',
    bfass_password: '',
    vlan: '',
    odp: '',
    onu_serial_number: '',
    notes: '',
  });

  // Ambil daftar teknisi jika user adalah Superadmin
  useEffect(() => {
    if (userRole === 'Superadmin') {
      fetch('/api/admin/technicians/available', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then((res) => res.json())
        .then((json) => setTechnicians(json.data || []));
    }
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: any = {
      ...formData,
      assignment_mode: mode,
    };

    if (userRole === 'Superadmin' && mode === 'manual' && selectedTechId) {
      payload.technician_id = Number(selectedTechId);
    }

    try {
      const res = await fetch(`/api/admin/provisionings/${provisioningId}/bfass-credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Gagal menyimpan penugasan');

      alert('Kredensial BFASS disimpan & tugas berhasil ditugaskan!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl space-y-4 max-w-lg">
        <h2 className="text-xl font-bold">Input Kredensial BFASS & Penugasan PSB</h2>

        <input
          required
          placeholder="Username BFASS"
          value={formData.bfass_username}
          onChange={(e) => setFormData({ ...formData, bfass_username: e.target.value })}
          className="w-full border p-2 rounded"
        />

        <input
          required
          type="password"
          placeholder="Password BFASS"
          value={formData.bfass_password}
          onChange={(e) => setFormData({ ...formData, bfass_password: e.target.value })}
          className="w-full border p-2 rounded"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            required
            placeholder="VLAN (misal: 100)"
            value={formData.vlan}
            onChange={(e) => setFormData({ ...formData, vlan: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            required
            placeholder="Port ODP"
            value={formData.odp}
            onChange={(e) => setFormData({ ...formData, odp: e.target.value })}
            className="border p-2 rounded"
          />
        </div>

        <input
          required
          placeholder="Serial Number Modem ONT"
          value={formData.onu_serial_number}
          onChange={(e) => setFormData({ ...formData, onu_serial_number: e.target.value })}
          className="w-full border p-2 rounded"
        />

        {/* Khusus Superadmin: Pilihan Round Robin vs Manual */}
        {userRole === 'Superadmin' ? (
          <div className="border p-3 rounded bg-gray-50 space-y-2">
            <label className="font-semibold text-sm">Metode Penugasan Teknisi:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="assignment_mode"
                  value="round_robin"
                  checked={mode === 'round_robin'}
                  onChange={() => setMode('round_robin')}
                />
                Auto (Round Robin)
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="assignment_mode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                />
                Manual Pilih Teknisi
              </label>
            </div>

            {mode === 'manual' && (
              <select
                required
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border p-2 rounded text-sm bg-white"
              >
                <option value="">-- Pilih Teknisi Lapangan --</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.team || 'Solo'}) {tech.is_available ? '• Tersedia' : '• Sibuk'}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            * Penugasan tim teknisi akan ditentukan otomatis oleh sistem via rotasi Round Robin.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan & Tugaskan'}
          </button>
        </div>
      </form>
    </div>
  );
};
```



