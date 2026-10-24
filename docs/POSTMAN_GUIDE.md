# Fibermedia Provisioning System - Postman Collection Guide

This guide describes how to configure and run the Postman collection for testing the Provisioning System API endpoints.

---

## 1. Postman Environment Configuration

Create a new environment in Postman and define the following variables:

| Variable | Value (Development) | Value (Production) | Description |
| :--- | :--- | :--- | :--- |
| `baseUrl` | `http://localhost:8000/api` | `https://provisioning.fibermedia.id/api` | Base URL of the API. |
| `accessToken` | `{{accessToken}}` | `{{accessToken}}` | Sanctum plain text token generated on Login. |

### Global Authorization Setup:
Instead of configuring authorization for each endpoint individually, set the authorization scheme at the **Collection level**:
1. Right-click the Collection and select **Edit**.
2. Click the **Authorization** tab.
3. Set **Type** to **Bearer Token**.
4. Set **Token** to `{{accessToken}}`.
5. Ensure individual requests are set to **Inherit auth from parent**.

---

## 2. API Endpoint Payloads & Responses

### Module A: Authentication

#### 1. POST `/login`
* **Method**: `POST`
* **URL**: `{{baseUrl}}/login`
* **Headers**: `Accept: application/json`
* **Body (raw JSON)**:
  ```json
  {
    "email": "sales@example.com",
    "password": "password"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "access_token": "2|lE46N21c1...",
      "token_type": "Bearer",
      "user": {
        "id": 2,
        "name": "Sales Person",
        "email": "sales@example.com",
        "roles": ["Sales"]
      }
    }
  }
  ```
* **Failure Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "message": "Invalid login details"
  }
  ```

#### 2. POST `/forgot-password`
* **Method**: `POST`
* **URL**: `{{baseUrl}}/forgot-password`
* **Body (raw JSON)**:
  ```json
  {
    "email": "sales@example.com"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "We have emailed your password reset link.",
    "data": null
  }
  ```

#### 3. POST `/reset-password`
* **Method**: `POST`
* **URL**: `{{baseUrl}}/reset-password`
* **Body (raw JSON)**:
  ```json
  {
    "token": "reset_token_from_email",
    "email": "sales@example.com",
    "password": "newsecurepassword123",
    "password_confirmation": "newsecurepassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Your password has been reset.",
    "data": null
  }
  ```

---

### Module B: Submissions (Sales Module)

#### 1. POST `/sales/submissions` (Create Submission)
* **Method**: `POST`
* **URL**: `{{baseUrl}}/sales/submissions`
* **Body (raw JSON)**:
  ```json
  {
    "customer_name": "Rian Pratama",
    "nik": "3201234567890001",
    "phone": "08123456789",
    "email": "rian@example.com",
    "address": "Jl. Merdeka No. 12",
    "district": "Menteng",
    "city": "Jakarta Pusat",
    "province": "DKI Jakarta",
    "lat": -6.18234,
    "lng": 106.82934,
    "package_name": "Home Speed 50",
    "package_speed": 50,
    "package_price": 350000,
    "installation_fee": 150000
  }
  ```
* **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Submission created successfully",
    "data": {
      "id": 12,
      "submission_number": "SUB-20260604-001",
      "customer_name": "Rian Pratama",
      "nik": "3201********0001",
      "status": "pending"
    }
  }
  ```

#### 2. GET `/sales/submissions` (List Submissions)
* **Method**: `GET`
* **URL**: `{{baseUrl}}/sales/submissions`
* **Success Response (200 OK - Paginated)**:
  ```json
  {
    "data": [
      {
        "id": 12,
        "submission_number": "SUB-20260604-001",
        "customer_name": "Rian Pratama",
        "nik": "3201********0001",
        "phone": "08123456789",
        "email": "rian@example.com",
        "status": "pending",
        "documents": []
      }
    ],
    "links": {
      "first": "http://localhost:8000/api/sales/submissions?page=1",
      "last": "http://localhost:8000/api/sales/submissions?page=1",
      "prev": null,
      "next": null
    },
    "meta": {
      "current_page": 1,
      "from": 1,
      "last_page": 1,
      "per_page": 15,
      "to": 1,
      "total": 1
    }
  }
  ```

#### 3. GET `/sales/submissions/{id}` (Detail Submission)
* **Method**: `GET`
* **URL**: `{{baseUrl}}/sales/submissions/12`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Success",
    "data": {
      "id": 12,
      "submission_number": "SUB-20260604-001",
      "customer_name": "Rian Pratama",
      "nik": "3201********0001",
      "phone": "08123456789",
      "email": "rian@example.com",
      "address": "Jl. Merdeka No. 12",
      "district": "Menteng",
      "city": "Jakarta Pusat",
      "province": "DKI Jakarta",
      "package_name": "Home Speed 50",
      "package_speed": 50,
      "package_price": "350000.00",
      "installation_fee": "150000.00",
      "total_price": "500000.00",
      "status": "pending",
      "documents": []
    }
  }
  ```

---

### Module C: Validation & Provisioning (Admin Module)

#### 1. PUT `/admin/submissions/{id}/validate` (Approve Validation)
* **Method**: `PUT`
* **URL**: `{{baseUrl}}/admin/submissions/12/validate`
* **Body (raw JSON)**:
  ```json
  {
    "status": "approved",
    "validation_notes": "All requirements verified."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Submission status updated successfully",
    "data": {
      "id": 12,
      "status": "approved",
      "validated_by": 1,
      "validated_at": "2026-06-04T15:05:00Z",
      "validation_notes": "All requirements verified."
    }
  }
  ```

#### 2. PUT `/admin/submissions/{id}/validate` (Reject Validation)
* **Method**: `PUT`
* **URL**: `{{baseUrl}}/admin/submissions/12/validate`
* **Body (raw JSON)**:
  ```json
  {
    "status": "rejected",
    "validation_notes": "Document invalid.",
    "rejection_reason": "KTP signature mismatch."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Submission status updated successfully",
    "data": {
      "id": 12,
      "status": "rejected",
      "validated_by": 1,
      "validated_at": "2026-06-04T15:05:00Z",
      "validation_notes": "Document invalid.",
      "rejection_reason": "KTP signature mismatch."
    }
  }
  ```

#### 3. POST `/admin/provisionings` (Create Provisioning)
* **Method**: `POST`
* **URL**: `{{baseUrl}}/admin/provisionings`
* **Body (raw JSON)**:
  ```json
  {
    "submission_id": 12,
    "service_type": "PPPOE",
    "nas_server": "NAS-JKT-01",
    "nas_ip": "172.16.1.1",
    "ip_address": "10.100.1.5",
    "ip_pool": "pool-home-50m",
    "bandwidth_profile": "50M_Symmetric",
    "bandwidth_up": 51200,
    "bandwidth_down": 51200
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Provisioning created and sent to BFASS queue",
    "data": {
      "id": 4,
      "provisioning_number": "PROV-20260604-001",
      "status": "pending",
      "bfass_status": "pending"
    }
  }
  ```

#### 4. POST `/admin/provisionings/{id}/assign-task` (Assign Technician)
* **Method**: `POST`
* **URL**: `{{baseUrl}}/admin/provisionings/4/assign-task`
* **Body (raw JSON)**:
  ```json
  {
    "teknisi_id": 5,
    "scheduled_date": "2026-06-05",
    "scheduled_start": "09:00",
    "scheduled_end": "12:00"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Task assigned to technician successfully",
    "data": {
      "id": 9,
      "task_number": "TSK-20260604-001",
      "status": "assigned"
    }
  }
  ```

#### 5. PATCH `/admin/tasks/{id}/reassign` (Reassign Technician)
* **Method**: `PATCH`
* **URL**: `{{baseUrl}}/admin/tasks/9/reassign`
* **Body (raw JSON)**:
  ```json
  {
    "teknisi_id": 6
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task reassigned successfully.",
    "data": {
      "id": 9,
      "task_number": "TSK-20260604-001",
      "teknisi_id": 6,
      "status": "assigned"
    }
  }
  ```

---

### Module D: Technician Workflow

#### 1. PUT `/teknisi/tasks/{id}/status` (Update status to On the way)
* **Method**: `PUT`
* **URL**: `{{baseUrl}}/teknisi/tasks/9/status`
* **Body (raw JSON)**:
  ```json
  {
    "status": "on_the_way"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task status updated successfully",
    "data": {
      "id": 9,
      "status": "on_the_way",
      "departed_at": "2026-06-04T15:10:00.000000Z"
    }
  }
  ```

#### 2. POST `/teknisi/tasks/{id}/complete` (Complete Task)
* **Method**: `POST`
* **URL**: `{{baseUrl}}/teknisi/tasks/9/complete`
* **Body (raw JSON)**:
  ```json
  {
    "completion_notes": "ONT installation completed. Signal levels are -19dBm.",
    "customer_rating": 5
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Task marked as completed successfully.",
    "data": {
      "id": 9,
      "status": "completed",
      "completion_notes": "ONT installation completed. Signal levels are -19dBm."
    }
  }
  ```

---

### Module E: Upload Endpoints (Multipart/Form-Data)

#### 1. POST `/sales/submissions/{id}/upload-document`
* **Method**: `POST`
* **URL**: `{{baseUrl}}/sales/submissions/12/upload-document`
* **Headers**: `Content-Type: multipart/form-data`
* **Body (form-data)**:
  - `document_type`: `ktp`
  - `file`: `ktp_file.jpg` (Binary file, limit **5 MB**)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document uploaded successfully",
    "data": {
      "document_type": "ktp",
      "path": "submissions/12/ktp_file.jpg",
      "url": "https://storage.fibermedia.id/submissions/12/ktp_file.jpg"
    }
  }
  ```

#### 2. POST `/teknisi/tasks/{id}/upload-photo`
* **Method**: `POST`
* **URL**: `{{baseUrl}}/teknisi/tasks/9/upload-photo`
* **Headers**: `Content-Type: multipart/form-data`
* **Body (form-data)**:
  - `photo_type`: `modem`
  - `photo`: `modem_photo.jpg` (Binary image, limit **5 MB**)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Photo uploaded successfully",
    "data": {
      "photo_type": "modem",
      "path": "tasks/9/modem_photo.jpg",
      "url": "https://storage.fibermedia.id/tasks/9/modem_photo.jpg"
    }
  }
  ```
