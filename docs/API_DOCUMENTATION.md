# Fibermedia Provisioning System - Complete API Specification & Reference Manual (v2.1 Frozen)

Dokumen ini merupakan panduan spesifikasi dan referensi resmi API untuk **Fibermedia Provisioning System** (v2.1 API Freeze). Ditujukan untuk pengembang Frontend (Web Admin, Mobile Sales, Mobile Teknisi), QA Tester, dan Tim Integrasi.

---

## 📌 Ringkasan Arsitektur & Otorisasi

* **Base URL**: `http://localhost:8000/api`
* **Format Request & Response**: `application/json` (kecuali upload file menggunakan `multipart/form-data`)
* **Autentikasi**: Laravel Sanctum Bearer Token (`Authorization: Bearer <token>`)
* **Role-Based Access Control (RBAC)**: Enforced via Spatie Permission (`Superadmin`, `Admin`, `Sales`, `Teknisi`)

---

## 🛠️ 1. Autentikasi & Pengelolaan Akun (Auth & User Profile)

### 1.1 Login User
* **Endpoint**: `POST /login`
* **Rate Limit**: 100 request/menit
* **Public Route**
* **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "password"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "access_token": "1|sanctum_token_string...",
      "token_type": "Bearer",
      "user": {
        "id": 1,
        "name": "Super Admin",
        "email": "admin@example.com",
        "roles": ["Admin"]
      }
    }
  }
  ```

### 1.2 Minta Link Lupa Password (Forgot Password)
* **Endpoint**: `POST /forgot-password`
* **Rate Limit**: 100 request/menit
* **Public Route**
* **Request Body**: `{"email": "user@fibermedia.test"}`
* **Response (200 OK)**: `{"success": true, "data": null, "message": "We have emailed your password reset link!"}`

### 1.3 Reset Password Baru (Reset Password)
* **Endpoint**: `POST /reset-password`
* **Public Route**
* **Request Body**:
  ```json
  {
    "token": "reset_token_string",
    "email": "user@fibermedia.test",
    "password": "PasswordBaru123",
    "password_confirmation": "PasswordBaru123"
  }
  ```
* **Response (200 OK)**: `{"success": true, "data": null, "message": "Your password has been reset!"}`

### 1.4 Get Profile User Saat Ini
* **Endpoint**: `GET /user`
* **Header**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "name": "Admin System",
    "email": "admin@example.com",
    "status": "active",
    "roles": ["Admin"]
  }
  ```

### 1.5 Logout User
* **Endpoint**: `POST /logout`
* **Header**: `Authorization: Bearer <token>`
* **Response (200 OK)**: `{"success": true, "data": null, "message": "Successfully logged out"}`

### 1.6 Update Profile & Password Mandiri
* **Endpoint Profile**: `PUT /user/profile` (`{"name": "...", "phone": "..."}`)
* **Endpoint Password**: `PUT /user/password` (`{"current_password": "...", "new_password": "...", "new_password_confirmation": "..."}`)

---

## 🔔 2. Pusat Notifikasi (Notifications)

* **Get All Notifications**: `GET /notifications`
* **Mark All As Read**: `PATCH /notifications/read-all`
* **Mark Single As Read**: `PATCH /notifications/{id}/read`

---

## 📦 3. Katalog Paket & Kode Promo (Catalog & Promos)

### 3.1 Get Katalog Paket Internet Active
* **Endpoint**: `GET /packages`
* **Access**: Public / Authenticated
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "FMP Basic 20 Mbps",
        "speed_mbps": 20,
        "price": 150000,
        "installation_fee": 100000,
        "is_active": true
      }
    ]
  }
  ```

### 3.2 Validasi Kode Promo (Sales / Public)
* **Endpoint**: `POST /promos/validate`
* **Request Body**: `{"code": "PROMO2026", "package_id": 1}`
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "code": "PROMO2026",
      "discount_type": "fixed",
      "discount_value": 50000,
      "calculated_discount": 50000
    }
  }
  ```

---

## 💼 4. Modul Sales (Sales Submissions)
**Access Control**: `role: Sales | Admin | Superadmin`

### 4.1 Get List Submissions Sales
* **Endpoint**: `GET /sales/submissions`
* **Query Params**: `status`, `search`, `page`, `per_page`
* **Response**: Paginated Collection

### 4.2 Buat Pendaftaran Pelanggan Baru (Store Submission)
* **Endpoint**: `POST /sales/submissions`
* **Request Body**:
  ```json
  {
    "customer_name": "Budi Santoso",
    "nik": "3171234567890001",
    "phone": "081299998888",
    "email": "budi@example.com",
    "address": "Jl. Merdeka No. 45",
    "district": "Gambir",
    "city": "Jakarta Pusat",
    "province": "DKI Jakarta",
    "postal_code": "10110",
    "lat": -6.175392,
    "lng": 106.827153,
    "package_id": 1,
    "promo_code": "PROMO2026"
  }
  ```
* **Response (201 Created)**: Data Submission baru dengan status `pending`.

### 4.3 Upload Berkas Dokumen Pelanggan (KTP / KK / Surat Kuasa)
* **Endpoint**: `POST /sales/submissions/{submission_id}/upload-document`
* **Content-Type**: `multipart/form-data`
* **Form Data**:
  - `document_type`: `ktp` | `kk` | `surat_kuasa` | `foto_rumah`
  - `file`: Berkas PDF / JPG / PNG (Max 5MB)
* **Response (200 OK)**: Metadata berkas terunggah.

---

## 👮 5. Modul Admin: Validasi Berkas & Document Review
**Access Control**: `role: Admin | Superadmin`

### 5.1 List Submissions untuk Validasi
* **Endpoint**: `GET /admin/submissions`
* **Query Params**: `status=pending`, `search=...`

### 5.2 Review Dokumen Berkas Pelanggan Individual
* **Endpoint**: `PUT /admin/documents/{document_id}/review`
* **Request Body**:
  ```json
  {
    "status": "approved",
    "rejection_reason": null
  }
  ```
  *(Status: `approved`, `rejected`, `needs_revision`)*

### 5.3 Validasi Akhir Submission Pelanggan
* **Endpoint**: `PUT /admin/submissions/{submission_id}/validate`
* **Request Body**:
  ```json
  {
    "status": "approved",
    "validation_notes": "Seluruh berkas fisik valid dan terverifikasi."
  }
  ```
* **Efek Business Rules**:
  - Jika `status` = `approved`, seluruh berkas aktif **HARUS** sudah di-approve.
  - Otomatis membuat record **Provisioning** baru berstatus `PENDING`.

---

## ⚡ 6. Modul Admin: Provisioning & Integrasi BFASS
**Access Control**: `role: Admin | Superadmin`

### 6.1 Check Status Kesehatan Server BFASS
* **Endpoint**: `GET /admin/bfass/health`
* **Response (200 OK)**: `{"status": "reachable", "latency_ms": 42}`

### 6.2 Input Parameter Kredensial BFASS & Assign Tim Teknisi (Round Robin / Manual Superadmin)
* **Endpoint**: `PUT /api/admin/provisionings/{provisioning_id}/bfass-credentials`
* **Access**: `role: Admin | Superadmin`
* **Request Body**:
  ```json
  {
    "bfass_username": "cust_fibermedia_001",
    "bfass_password": "SecretPassword123",
    "vlan": "100",
    "odp": "ODP-JKT-01/12",
    "onu_serial_number": "HWTC12345678",
    "notes": "Pemasangan kabel drop core max 150m",
    "assignment_mode": "round_robin",
    "technician_id": 4,
    "team": "Team A"
  }
  ```
* **Aturan Penugasan**:
  - Mendukung tim dengan **minimal 1 anggota aktif**.
  - **Admin**: Wajib menggunakan otomatisasi *Round-Robin* (sistem menolak jika mengisi `technician_id` / `team`).
  - **Superadmin**: Bebas memilih mode *Round-Robin* atau manual memilih teknisi (`technician_id`) / tim (`team`).
  - Dropdown teknisi & tim dapat diambil dari `GET /api/admin/technicians/available` dan `GET /api/admin/teams/available`.

### 6.3 Retry Integration Job BFASS (Jika Gagal Connection)
* **Endpoint**: `POST /api/admin/provisionings/{provisioning_id}/retry`
* **Response (200 OK)**: `{"message": "Provisioning queued for retry."}`

### 6.4 Reassign Task Teknisi (Superadmin Only)
* **Endpoint**: `PATCH /api/admin/tasks/{task_id}/reassign`
* **Access**: `role: Superadmin`
* **Request Body**:
  ```json
  {
    "assignment_mode": "manual",
    "technician_id": 6,
    "team": "Team B"
  }
  ```
* **Response (200 OK)**: Mengalihkan tugas ke tim/teknisi baru dan mengirim notifikasi realtime ke anggota tim baru.

---

## 👷 7. Modul Teknisi Lapangan (Technician Mobile Workflow)
**Access Control**: `role: Teknisi | Admin | Superadmin`

### 7.1 View Task Assignment Teknisi
* **Endpoint**: `GET /teknisi/tasks`
* **Detail Task**: `GET /teknisi/tasks/{task_id}`

### 7.2 Update Status Perjalanan / Lokasi
* **Endpoint**: `PUT /teknisi/tasks/{task_id}/status`
* **Request Body**: `{"status": "on_the_way"}` / `{"status": "in_progress"}`

### 7.3 Upload Foto Bukti Lapangan (Before / After / Selfie)
* **Endpoint**: `POST /teknisi/tasks/{task_id}/upload-photo`
* **Content-Type**: `multipart/form-data`
* **Form Data**:
  - `photo_type`: `before` | `after` | `selfie`
  - `photo`: File foto JPG/PNG (Max 5MB)

### 7.4 Upload Tanda Tangan Pelanggan
* **Endpoint**: `POST /teknisi/tasks/{task_id}/upload-signature`
* **Form Data**: `signature` (File Image PNG/JPG)

### 7.5 Rincian & Update Checklist Pengujian Teknisi
* **Get Checklist**: `GET /teknisi/tasks/{task_id}/checklist`
* **Update Checklist**: `PUT /teknisi/tasks/{task_id}/checklist`
  ```json
  {
    "items": [
      {"item_id": 1, "is_completed": true},
      {"item_id": 2, "is_completed": true}
    ]
  }
  ```

### 7.6 Submit Phase 1 & Phase 2 Completion
* **Submit Phase 1**: `POST /teknisi/tasks/{task_id}/phase-1`
* **Submit Phase 2**: `POST /teknisi/tasks/{task_id}/phase-2`
  ```json
  {
    "completion_notes": "Pemasangan modem ONU dan pengujian internet lulus.",
    "latitude": -6.175392,
    "longitude": 106.827153,
    "accuracy": 10
  }
  ```

---

## 📋 8. Modul Admin: Approval, Return, & Export BAST PDF

### 8.1 Approve Hasil Validasi Lapangan Teknisi
* **Endpoint**: `PUT /admin/task-assignments/{assignment_id}/approve`
* **Efek System**: Task menjadi `COMPLETED`, Provisioning menjadi `SUCCESS`, Submission menjadi `COMPLETED`.

### 8.2 Reject / Return Bukti Pekerjaan Teknisi
* **Endpoint**: `PUT /admin/task-assignments/{assignment_id}/return`
* **Request Body**: `{"notes": "Foto ONU tidak jelas, harap foto ulang."}`
* **Efek System**: TaskAssignment berstatus `RETURNED`. Teknisi diizinkan mengunggah foto perbaikan baru dan mere-submit Phase 2.

### 8.3 Download Dokumen Resmi BAST PDF
* **Endpoint**: `GET /admin/reports/submissions/{submission_id}/bast`
* **Header**: `Authorization: Bearer <token>`
* **Format**: File Download `BAST_SUB-XXXXXX.pdf`
* **Isi BAST**: Kop Resmi PT Fibermedia, Data Pelanggan, Perangkat & SN ONU, ODP, VLAN, Koordinat GPS, Tabel Checklist Pengujian, dan Kolom Tanda Tangan.

### 8.4 Download Lapran Excel & PDF Detail
* **Export Excel**: `GET /admin/reports/submissions/excel`
* **Export Detail PDF**: `GET /admin/reports/submissions/{submission_id}/pdf`

---

## 📊 9. Modul Analytics, KPI, & SLA Breaches Monitoring

* **KPI Summary**: `GET /admin/analytics/kpi`
* **Funnel Conversion**: `GET /admin/analytics/funnel`
* **Regional Breakdown**: `GET /admin/analytics/regional`
* **Trends Analysis**: `GET /admin/analytics/trends`
* **SLA Breaches Summary**: `GET /admin/sla-breaches/summary`
* **SLA Breaches List**: `GET /admin/sla-breaches`

---

## ⚙️ 10. Modul Superadmin: User Management & System Logs

* **CRUD Users**: `GET|POST|PUT|DELETE /superadmin/users`
* **Toggle User Active Status**: `PATCH /superadmin/users/{user_id}/status`
* **Reset User Password**: `POST /superadmin/users/{user_id}/reset-password`
* **User Activity Logs**: `GET /superadmin/users/{user_id}/activity`
* **Audit Logs System**: `GET /admin/audit-logs`

---
*Spesifikasi Dokumentasi API v2.1 Frozen - PT Fibermedia Indonesia.*
