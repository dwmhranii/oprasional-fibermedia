# Fibermedia Provisioning System - API Freeze Declaration

**Status**: 🔒 **FROZEN (v2.1)**  
**Effective Date**: 4 Agustus 2026  
**Target Clients**: Web Admin CMS, Mobile App Sales, Mobile App Teknisi  

---

## 1. Pernyataan API Freeze (API Freeze Policy)

Dokumen ini secara resmi menyatakan bahwa seluruh antarmuka pemrograman aplikasi (**REST API v2.1**) untuk **Fibermedia Provisioning System** berada dalam status **API Freeze**.

### Ketentuan API Freeze:
1. **Kontrak API Terkunci (Contract Immutability)**:
   Seluruh struktur URL Endpoint, Metode HTTP, Header, Format JSON Request Body, Query Parameter, dan Struktur Response JSON (termasuk tipe data dan kunci nama atribut) **TIDAK BOLEH** diubah tanpa versi mayor baru (`/api/v3/`).
2. **Tidak Ada Breaking Changes**:
   Klien Frontend (Web Admin, Mobile Sales, Mobile Teknisi) dapat membangun dan menggunakan seluruh endpoint sesuai spesifikasi resmi tanpa khawatir adanya perubahan nama field, perubahan tipe data, atau pergeseran status code HTTP.
3. **Penambahan Fitur (Non-breaking Additions)**:
   Penambahan field opsional di masa mendatang pada response JSON yang bersifat *backward compatible* diperbolehkan dengan persetujuan dokumentasi terlebih dahulu.

---

## 2. Ringkasan Modul & Cakupan Endpoint Terkunci

| Modul System | Jumlah Endpoint | Otorisasi & Middleware | Catatan Modul |
| :--- | :---: | :--- | :--- |
| **Auth & Profile** | 9 | Public & Sanctum | Login, Logout, Forgot & Reset Password, Profile & Notification Settings |
| **Notifications** | 3 | Sanctum | List Notifikasi, Mark Read Single, Mark Read All |
| **Catalog & Promos** | 2 | Public / Sanctum | List Paket Internet & Validasi Kode Promo |
| **Sales Module** | 5 | `role: Sales \| Admin \| Superadmin` | Pengajuan Pendaftaran, Upload Dokumen Berkas Pelanggan |
| **Admin Submission Validation** | 4 | `role: Admin \| Superadmin` | Validasi Berkas Pelanggan, Review Dokumen Individual |
| **Admin Provisioning & BFASS** | 6 | `role: Admin \| Superadmin` | Input BFASS, Round-Robin Assign Task, Retry Job, Health Check |
| **Admin Task & SLA** | 5 | `role: Admin \| Superadmin` | Approval Hasil Teknisi, Return Task, Ringkasan SLA Breaches |
| **Admin Analytics & Reports** | 7 | `role: Admin \| Superadmin` | KPI, Funnel, Regional, Trends, Export Excel, Export PDF & **Export BAST PDF** |
| **Promo & Package Admin** | 10 | `role: Admin \| Superadmin` | CRUD Promo Code, CRUD & Sync Paket Internet |
| **Teknisi Module** | 9 | `role: Teknisi \| Admin \| Superadmin` | Task List, Update Status, Upload Photo (Before/After/Selfie), Upload Signature, Checklist, Phase 1 & Phase 2 |
| **Superadmin User Mgmt** | 9 | `role: Superadmin` | CRUD User, Activate/Deactivate, Reset Password, Activity Log, Roles & Permissions |
| **Audit Logs** | 2 | `role: Admin \| Superadmin` | System Activity Logs Audit |
| **TOTAL** | **71 Endpoints** | | **Semua Endpoint Terkunci dalam API Freeze v2.1** |

---

## 3. Standar Status Code HTTP Terkunci

- `200 OK`: Request sukses (Mengembalikan data tunggal atau paginasi).
- `201 Created`: Resource baru berhasil dibuat.
- `400 Bad Request`: Parameter request tidak valid atau alur bisnis menyalahi syarat (*workflow transition error*).
- `401 Unauthorized`: Token Bearer tidak valid, kadaluarsa, atau status akun non-aktif.
- `403 Forbidden`: Pengguna tidak memiliki Role/Permission yang sesuai.
- `404 Not Found`: Resource tidak ditemukan di database.
- `409 Conflict`: Konflik data unik (misal: duplikasi username BFASS atau duplikasi pendaftaran).
- `422 Unprocessable Content`: Validasi input gagal (Format rincian error `errors: { field: ["reason"] }`).
- `429 Too Many Requests`: Melebihi batas Rate Limiting (Throttle limit).
- `500 Internal Server Error`: Kesalahan tidak terduga pada server.

---

## 4. Standar Amplop Response (Response Envelopes)

### Single Resource Response
```json
{
  "success": true,
  "message": "Resource action message",
  "data": {
    "id": 1,
    "field": "value"
  }
}
```

### Paginated Collection Response (Standard Laravel Pagination)
```json
{
  "data": [
    { "id": 1, "field": "value" }
  ],
  "links": {
    "first": "http://localhost:8000/api/endpoint?page=1",
    "last": "http://localhost:8000/api/endpoint?page=5",
    "prev": null,
    "next": "http://localhost:8000/api/endpoint?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "per_page": 15,
    "to": 15,
    "total": 75
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": [
      "The email field is required."
    ]
  }
}
```

---
*Penutupan Spesifikasi API Freeze v2.1 - PT Fibermedia Indonesia.*
