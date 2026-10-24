# Fibermedia Provisioning System API Documentation

## Base URL
`http://localhost:8000/api`

## Authentication

All endpoints except `/login`, `/forgot-password`, and `/reset-password` require a Bearer token in the `Authorization` header.

### Login
- **URL**: `/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "sales@example.com",
    "password": "password"
  }
  ```
- **Returns**: Bearer Token

### Logout
- **URL**: `/logout`
- **Method**: `POST`
- **Returns**: Message confirming logout

### Forgot Password
- **URL**: `/forgot-password`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "sales@example.com"
  }
  ```
- **Returns**: Success message indicating reset link sent.

### Reset Password
- **URL**: `/reset-password`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "sales@example.com",
    "token": "valid_reset_token",
    "password": "new_password",
    "password_confirmation": "new_password"
  }
  ```
- **Returns**: Success message confirming password update.

---

## 1. Sales Module

### List Submissions
- **URL**: `/sales/submissions`
- **Method**: `GET`
- **Access**: Sales, Admin, Superadmin

### Create Submission
- **URL**: `/sales/submissions`
- **Method**: `POST`
- **Body**: `customer_name`, `nik`, `phone`, `email`, `address`, `district`, `city`, `province`, `package_name`, `package_speed`, `package_price`, `installation_fee`

### Upload Document
- **URL**: `/sales/submissions/{id}/upload-document`
- **Method**: `POST` (Multipart/form-data)
- **Body**: 
  - `document_type`: string (e.g. "ktp")
  - `file`: File

---

## 2. Admin Module

### List Submissions
- **URL**: `/admin/submissions`
- **Method**: `GET`
- **Access**: Admin, Superadmin

### Validate Submission
- **URL**: `/admin/submissions/{id}/validate`
- **Method**: `PUT`
- **Body**:
  ```json
  {
    "status": "approved", // or rejected, need_info
    "validation_notes": "All good."
  }
  ```

### List Provisionings
- **URL**: `/admin/provisionings`
- **Method**: `GET`

### Get Provisioning Detail
- **URL**: `/admin/provisionings/{id}`
- **Method**: `GET`
- **Returns**: Detailed provisioning data including related tasks.

### Create Provisioning (Triggers BFASS)
- **URL**: `/admin/provisionings`
- **Method**: `POST`
- **Body**: `submission_id`, `service_type`, `nas_server`, `nas_ip`, `bandwidth_profile`, `bandwidth_up`, `bandwidth_down`

### Retry BFASS Provisioning
- **URL**: `/admin/provisionings/{id}/retry`
- **Method**: `POST`

### Suspend Provisioning
- **URL**: `/admin/provisionings/{id}/suspend`
- **Method**: `PATCH`
- **Returns**: Updates status to suspended.

### Resume Provisioning
- **URL**: `/admin/provisionings/{id}/resume`
- **Method**: `PATCH`
- **Returns**: Updates status to active.

### Assign Task
- **URL**: `/admin/provisionings/{id}/assign-task`
- **Method**: `POST`
- **Body**: `teknisi_id`, `scheduled_date`, `scheduled_start`, `scheduled_end`

### Reassign Task
- **URL**: `/admin/tasks/{id}/reassign`
- **Method**: `PATCH`
- **Body**: 
  ```json
  {
    "teknisi_id": 5
  }
  ```
- **Returns**: Task assigned to the new teknisi and notifications sent.

---

## 3. Teknisi Module

### List Assigned Tasks
- **URL**: `/teknisi/tasks`
- **Method**: `GET`
- **Access**: Teknisi, Admin, Superadmin

### Update Task Status
- **URL**: `/teknisi/tasks/{id}/status`
- **Method**: `PUT`
- **Body**:
  ```json
  {
    "status": "in_progress" // on_the_way, in_progress
  }
  ```

### Complete Task
- **URL**: `/teknisi/tasks/{id}/complete`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "completion_notes": "Modem installed and signal is good.",
    "customer_rating": 5
  }
  ```
- **Returns**: Updates task status to `completed` and records final metrics.

### Upload Photo
- **URL**: `/teknisi/tasks/{id}/upload-photo`
- **Method**: `POST` (Multipart/form-data)
- **Body**:
  - `photo_type`: string (e.g. "modem", "red_laser")
  - `photo`: Image file

---

## 4. Notifications Module (All Authenticated Users)

### List Notifications
- **URL**: `/notifications`
- **Method**: `GET`
- **Returns**: Paginated list of unread and read notifications.

### Mark Notification as Read
- **URL**: `/notifications/{id}/read`
- **Method**: `PATCH`
- **Returns**: Marks a specific notification as read.

### Mark All Notifications as Read
- **URL**: `/notifications/read-all`
- **Method**: `PATCH`
- **Returns**: Marks all unread notifications for the user as read.

---

## 5. Audit Log (Admin / Superadmin)

### View System Audit Logs
- **URL**: `/admin/audit-log`
- **Method**: `GET`
- **Query Parameters (Optional)**:
  - `log_name`: Filter by specific log name (e.g., "default")
  - `causer_id`: Filter by the user ID who performed the action.
- **Returns**: Paginated history of system events, changes, and user actions.

---

## 6. Superadmin Module

### Manage Users
- **URL**: `/superadmin/users`
- **Method**: `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- **Body for POST**: `name`, `email`, `password`, `role`

---

## 7. Reports (Admin)

### Export Excel
- **URL**: `/admin/reports/submissions/excel?status=approved`
- **Method**: `GET`
- **Returns**: XLSX File

### Export PDF
- **URL**: `/admin/reports/submissions/{id}/pdf`
- **Method**: `GET`
- **Returns**: PDF File
