# Documentation: Package Catalog & Sync API

This document provides API documentation for consuming the Package Catalog and triggering manual Synchronization from the remote `fibermediaplay.net` database.

---

## 1. Get Active Packages Catalog

Returns all active internet packages stored in the local cache. Designed for frontend consumption in sales submission forms.

- **Method**: `GET`
- **URL**: `/api/packages`
- **Authentication**: `Bearer <token>` (Required)

### Request Headers
```http
Authorization: Bearer <your_access_token>
Accept: application/json
```

### Response Example (200 OK)
```json
{
  "success": true,
  "message": "Active packages retrieved successfully",
  "data": {
    "packages": [
      {
        "id": 1,
        "code": "mini-deluxe-30mbps",
        "name": "Mini Deluxe",
        "speed_mbps": 30,
        "price": 125000,
        "category": "internet_only",
        "description": "Internet Unlimited hingga 30 Mbps untuk streaming dan video call",
        "is_popular": false,
        "synced_at": "2026-07-25T18:30:00+07:00"
      },
      {
        "id": 2,
        "code": "big-diamond-50mbps",
        "name": "Big Diamond",
        "speed_mbps": 50,
        "price": 155000,
        "category": "internet_only",
        "description": "Internet Unlimited hingga 50 Mbps stabil tanpa buffering",
        "is_popular": true,
        "synced_at": "2026-07-25T18:30:00+07:00"
      }
    ],
    "synced_at": "2026-07-25T18:30:00+07:00"
  }
}
```

---

## 2. Trigger Manual Package Synchronization (Admin Only)

Triggers an immediate read-only synchronization from the remote `fibermediaplay.net` database (`packages` table) into the local `packages` cache table.

- **Method**: `POST`
- **URL**: `/api/admin/packages/sync`
- **Authentication**: `Bearer <token>` (Required, Role: `Admin` or `Superadmin`)
- **Rate Limit**: Maximum 5 requests per minute (`throttle:5,1`)

### Request Headers
```http
Authorization: Bearer <admin_access_token>
Accept: application/json
```

### Response Example - Success (200 OK)
```json
{
  "success": true,
  "message": "Berhasil menyinkronkan 8 paket dari website.",
  "data": {
    "synced": 8,
    "synced_at": "2026-07-25T18:35:10+07:00"
  }
}
```

### Response Example - Unauthorized Role (403 Forbidden)
```json
{
  "success": false,
  "message": "User does not have the right roles."
}
```

### Response Example - Remote Connection Failure / Fault-Tolerant Fallback (500 Internal Error)
```json
{
  "success": false,
  "message": "Koneksi ke database remote gagal. Data lokal tetap dipertahankan."
}
```

---

## Technical Notes for Frontend Developers

1. **Zero Downtime Guarantee**: The `GET /api/packages` endpoint queries **only local database tables**. Remote connection outages will **never** cause `GET /api/packages` to crash or return `500`.
2. **`synced_at` Metadata**: Use the top-level `synced_at` field in `GET /api/packages` to display "Terakhir diperbarui: DD/MM/YYYY HH:mm" in the user interface.
