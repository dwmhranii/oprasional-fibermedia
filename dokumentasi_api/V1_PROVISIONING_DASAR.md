# Dokumentasi API V1.0 — Provisioning Pasang Baru & Instalasi Lapangan

Versi 1.0 merupakan pondasi utama sistem alur kerja pemasangan baru (*New Installation Workflow*) layanan internet Fibermedia Play, mencakup modul Autentikasi, Pengajuan Sales, Verifikasi Admin, dan Pelaksanaan Instalasi oleh Teknisi Lapangan.

---

## 1. Autentikasi & Akun Pengguna

### 1.1. Login Pengguna (Multi-Credential)
* **Method & URL:** `POST /login`
* **Akses:** Publik (Rate limit: 100 req/menit)
* **Deskripsi:** Mendukung autentikasi menggunakan **Email**, **Nama/Username Akun**, atau **Nomor Telepon/WhatsApp**.
* **Request Body:**
  ```json
  {
    "login": "sales@fibermedia.test", // Bisa Email, Nama/Username, atau Nomor HP (08... / 628...)
    "password": "password123"
  }
  ```
  *(Catatan: Field `"email"` atau `"username"` juga tetap diterima)*.
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "access_token": "1|sanctum_token_string_here...",
      "token_type": "Bearer",
      "user": {
        "id": 1,
        "name": "Budi Sales",
        "email": "sales@fibermedia.test",
        "roles": ["Sales"],
        "team": null
      }
    }
  }
  ```

### 1.2. Lupa Password (Forgot Password)
* **Method & URL:** `POST /forgot-password`
* **Request Body:** `{"email": "sales@fibermedia.test"}`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tautan reset password telah dikirim ke email Anda."
  }
  ```

### 1.3. Reset Password
* **Method & URL:** `POST /reset-password`
* **Request Body:**
  ```json
  {
    "email": "sales@fibermedia.test",
    "token": "valid_reset_token",
    "password": "new_password_123",
    "password_confirmation": "new_password_123"
  }
  ```

### 1.4. Logout
* **Method & URL:** `POST /logout`
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Berhasil logout."
  }
  ```

### 1.5. Ambil Profil Pengguna Saat Ini
* **Method & URL:** `GET /user`
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Response (200 OK):** Mengembalikan data user, daftar role, dan permissions.

---

## 2. Modul Sales (Pendaftaran Pasang Baru)

Role Akses: `Sales`, `Admin`, `Superadmin`.

### 2.1. Daftar Pengajuan Pasang Baru
* **Method & URL:** `GET /sales/submissions`
* **Query Parameters:** `page`, `per_page`, `status` (`draft`, `submitted`, `verified`, `scheduled`, `installed`, `rejected`).
* **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 10,
        "registration_code": "REG-2026-00010",
        "customer_name": "Ibu Ratna",
        "customer_phone": "081298765432",
        "address": "Jl. Ijen No. 12, Klojen, Kota Malang",
        "package_name": "50 Mbps Ultra Home",
        "status": "submitted",
        "created_at": "2026-10-12T08:00:00Z"
      }
    ]
  }
  ```

### 2.2. Buat Pengajuan Baru
* **Method & URL:** `POST /sales/submissions`
* **Request Body:**
  ```json
  {
    "customer_name": "Ibu Ratna",
    "customer_phone": "081298765432",
    "customer_email": "ratna@gmail.com",
    "identity_number": "3573012345670001",
    "address": "Jl. Ijen No. 12, Klojen, Kota Malang",
    "latitude": -7.9784,
    "longitude": 112.6318,
    "package_id": 2,
    "promo_code": "PROMOFIBER",
    "notes": "Pemasangan di ruko lantai 1"
  }
  ```

### 2.3. Detail Pengajuan
* **Method & URL:** `GET /sales/submissions/{id}`

### 2.4. Unggah Dokumen KTP / KK / Bukti Lokasi
* **Method & URL:** `POST /sales/submissions/{id}/upload-document`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `document_type`: `ktp` | `kk` | `house_photo`
  * `file`: Berkas gambar (JPG, PNG, PDF maks 5MB)

---

## 3. Modul Admin Verifikasi Pasang Baru

Role Akses: `Admin`, `Superadmin`.

### 3.1. Daftar Menunggu Validasi
* **Method & URL:** `GET /admin/submissions`

### 3.2. Detail & Review Berkas Pengajuan
* **Method & URL:** `GET /admin/submissions/{id}`
* **Review Dokumen:** `PUT /admin/documents/{document_id}/review`
  * Body: `{"status": "approved"}` atau `{"status": "rejected", "rejection_reason": "Foto KTP buram"}`

### 3.3. Keputusan Validasi Pengajuan
* **Method & URL:** `PUT /admin/submissions/{id}/validate`
* **Request Body:**
  ```json
  {
    "action": "approve", // atau "return_to_sales" / "reject"
    "assigned_technician_id": 3,
    "scheduled_date": "2026-10-14 09:00:00",
    "odp_code": "ODP-KLJ-01",
    "notes": "Jalur fiber siap"
  }
  ```

---

## 4. Modul Teknisi Instalasi Pasang Baru

Role Akses: `Teknisi`, `Admin`, `Superadmin`.

### 4.1. Daftar Tugas Instalasi
* **Method & URL:** `GET /teknisi/tasks`
* **Filter:** `?status=pending|in_progress|completed`

### 4.2. Update Status Pengerjaan Lapangan
* **Method & URL:** `PUT /teknisi/tasks/{task_id}/status`
* **Request Body:** `{"status": "in_progress"}` atau `{"status": "installed"}`

### 4.3. Upload Foto Bukti Lapangan
* **Method & URL:** `POST /teknisi/tasks/{task_id}/upload-photo`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `photo_type`: `odp` | `kabel_drop` | `ont_modem` | `redaman_opm` | `speedtest`
  * `file`: Gambar berkas foto

### 4.4. Checklist Kelayakan Instalasi
* **Method & URL:** `GET /teknisi/tasks/{task_id}/checklist`
* **Method & URL:** `PUT /teknisi/tasks/{task_id}/checklist`
* **Request Body:**
  ```json
  {
    "power_optical_dbm": -19.5,
    "drop_cable_length_meters": 120,
    "ont_sn": "48575443ABCDEF12",
    "is_wifi_configured": true,
    "customer_speedtest_download": 49.8,
    "customer_speedtest_upload": 48.2
  }
  ```

### 4.5. Tanda Tangan Digital Pelanggan (BAST)
* **Method & URL:** `POST /teknisi/tasks/{task_id}/upload-signature`
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `signature`: Data URL gambar / file PNG tanda tangan pelanggan
  * `signer_name`: Nama penanda tangan
