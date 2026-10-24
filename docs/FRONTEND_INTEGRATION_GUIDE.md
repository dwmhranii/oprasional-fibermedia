# Fibermedia Provisioning System - Frontend Integration Guide

This guide provides technical specifications for client-side integration with the Provisioning System API. It is written for frontend engineers and QA testers building applications with React, Vue, or Next.js.

---

## 1. Authentication & Token Management

The API uses **Laravel Sanctum** token authentication. 

### Client-Side Best Practices:
* **Token Storage**: Store the returned token inside an `httpOnly` secure cookie or `localStorage` after a successful login.
* **Request Headers**: Every authenticated API request must include the following headers:
  ```http
  Authorization: Bearer <token_value>
  Accept: application/json
  ```
* **Authentication Expiry**: The backend returns a `401 Unauthenticated` status if a token is invalid, revoked, or expired. The client-side Axios/Fetch interceptor must automatically clear the local token store and redirect the browser to the `/login` route.

---

## 2. API Response Parsing

The frontend must handle two distinct response payload structures:

### 1. Paginated Collection Format (Index Lists)
Index endpoints (e.g. `/api/sales/submissions`, `/api/teknisi/tasks`) do **not** use the custom success/message envelope. The paginated data is returned at the root:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}
```

### 2. Single Resource Format (Actions & Details)
Show, store, update, and action endpoints return a wrapped envelope:
```typescript
interface ResourceResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

---

## 3. Workflow State Definitions & UI Layouts

The application's business workflows are strictly controlled by state machine enums. The frontend should display appropriate badge colors and control state transition buttons accordingly.

### 1. Submission Status (`SubmissionStatus`)

| Case | Meaning | UI Badge / Color | Allowed Transitions |
| :--- | :--- | :--- | :--- |
| **`pending`** | Newly submitted, waiting validation. | Amber (`bg-amber-100 text-amber-800`) | Approved, Rejected, Need Info |
| **`need_info`** | Verification failed due to missing info. | Purple (`bg-purple-100 text-purple-800`) | Pending (resubmitted by Sales) |
| **`approved`** | Verification passed. Ready to provision. | Blue (`bg-blue-100 text-blue-800`) | Completed (via Task completion) |
| **`rejected`** | Rejected. Workflow halts. | Red (`bg-red-100 text-red-800`) | None (Terminal state) |
| **`completed`**| Physical installation done, line active. | Green (`bg-green-100 text-green-800`) | None (Terminal state) |

### 2. Provisioning Status (`ProvisioningStatus`)

| Case | Meaning | UI Badge / Color | Allowed Transitions |
| :--- | :--- | :--- | :--- |
| **`pending`** | Configuration created, awaiting queue job. | Gray (`bg-gray-100 text-gray-800`) | Processing |
| **`processing`**| Background queue job communicating with BFASS.| Indigo (`bg-indigo-100 text-indigo-800`) | Success, Failed |
| **`success`** | Account created in BFASS. Ready to assign. | Blue (`bg-blue-100 text-blue-800`) | Ready, Completed |
| **`failed`**  | Queue job failed. Needs manual retry. | Red (`bg-red-100 text-red-800`) | Processing (via manual retry) |
| **`suspended`**| Blocked by Admin. | Orange (`bg-orange-100 text-orange-800`)| Active |
| **`active`**   | Re-activated connection. | Blue (`bg-blue-100 text-blue-800`) | Suspended, Completed |
| **`ready`**    | BFASS account confirmed ready. | Cyan (`bg-cyan-100 text-cyan-800`) | Completed |
| **`completed`**| Physical technician task completed. | Green (`bg-green-100 text-green-800`) | None (Terminal state) |

### 3. Task Status (`TaskStatus`)

| Case | Meaning | UI Badge / Color | Allowed Transitions |
| :--- | :--- | :--- | :--- |
| **`assigned`** | Task created and mapped to technician. | Gray (`bg-gray-100 text-gray-800`) | On The Way |
| **`on_the_way`**| Technician is traveling to customer site. | Cyan (`bg-cyan-100 text-cyan-800`) | In Progress |
| **`in_progress`**| Installation active on site. | Orange (`bg-orange-100 text-orange-800`)| Completed, Failed |
| **`completed`**| Hardware installed, signals verified. | Green (`bg-green-100 text-green-800`) | None (Terminal state) |
| **`failed`**   | Installation failed on-site. | Red (`bg-red-100 text-red-800`) | Assigned (via manual reassign) |

---

## 4. File Upload Specifications

The backend limits uploads to prevent disk bloat. The frontend **MUST** validate file size and type client-side before sending.

### Rules
* **Max File Size**: **5 MB** (`5120` KB).
* **Allowed Document Types**: `.pdf`, `.png`, `.jpg`, `.jpeg` (Submission Documents).
* **Allowed Photo Types**: `.png`, `.jpg`, `.jpeg` (Task Photos).

### Upload Flow:
1. Block files > 5MB and files with invalid extensions directly in the file picker.
2. Construct request payload as `multipart/form-data`.
3. Track upload progress using an Axios upload progress bar.

---

## 5. Page-by-Page Integration Specifications

### 1. Login Screen
* **Required API Calls**: `POST /api/login`
* **Loading State**: Show a spinner inside the login button and disable all form fields.
* **Empty State**: N/A
* **Error State**: Display a red warning banner ("Invalid login details") above form fields.
* **Required Role**: Public / Guest

### 2. Admin Dashboard
* **Required API Calls**:
  - `GET /api/notifications` (Poll or receive via Reverb WebSockets)
  - `GET /api/admin/audit-log` (Paginated list of system events)
* **Loading State**: Show inline skeleton cards for stats and logs.
* **Empty State**: Show "No notifications found" centered inside notifications side-panel.
* **Error State**: Error Toast alert when data fetches fail.
* **Required Role**: `Admin` or `Superadmin`

### 3. Sales Screen: Submissions List
* **Required API Calls**: `GET /api/sales/submissions` (Takes optional `status` filter and `page` number)
* **Loading State**: Skeleton row lines inside grid table.
* **Empty State**: Big center-screen graphic saying "No customer registrations found" with a "+ Create Submission" button.
* **Error State**: Inline page banner: "Failed to load submissions. [Reload button]".
* **Required Role**: `Sales` (Checked via Spatie policy; Sales only see their own submissions).

### 4. Sales Screen: Create Submission
* **Required API Calls**: `POST /api/sales/submissions`
* **Validation Guards**:
  - `nik`: Must be string containing exactly 16 digits.
  - `package_speed`: Must be an integer (e.g. `50`), **not** a string (e.g. `50 Mbps`).
  - `lat` and `lng`: Must be decimal values. Must be provided together if one is set.
* **Loading State**: Lock the form inputs; show a full-page saving spinner.
* **Empty State**: N/A
* **Error State**: Map validation failures (HTTP 422 `errors` object) directly under each respective form input.
* **Required Role**: `Sales`

### 5. Sales Screen: Submission Detail & Upload Portal
* **Required API Calls**:
  - `GET /api/sales/submissions/{id}`
  - `POST /api/sales/submissions/{id}/upload-document`
* **Loading State**: Skeleton panels for details and documents grid.
* **Empty State**: Show "No uploaded documents found" with an "+ Upload Document" panel.
* **Error State**: Display validation errors (e.g., if PDF size exceeds 5MB, display "The file field must not be greater than 5120 kilobytes" in red).
* **Required Role**: `Sales`

### 6. Admin Screen: Submission Validation Portal
* **Required API Calls**:
  - `GET /api/admin/submissions` (Filter by `status=pending`)
  - `GET /api/admin/submissions/{id}`
  - `PUT /api/admin/submissions/{id}/validate`
* **Validation Guards**:
  - If status is set to `'rejected'`, `rejection_reason` is **required**.
* **Loading State**: Split screen skeleton layout.
* **Empty State**: "All customer submissions have been validated. Excellent work!"
* **Error State**: Red banner mapping input errors.
* **Required Role**: `Admin` or `Superadmin`

### 7. Admin Screen: Provisioning & Tasks Management
* **Required API Calls**:
  - `GET /api/admin/provisionings`
  - `POST /api/admin/provisionings` (Create network configuration)
  - `POST /api/admin/provisionings/{id}/retry` (Retry failed BFASS integrations)
  - `PATCH /api/admin/provisionings/{id}/suspend`
  - `PATCH /api/admin/provisionings/{id}/resume`
  - `POST /api/admin/provisionings/{id}/assign-task` (Assign scheduled task)
  - `PATCH /api/admin/tasks/{task}/reassign` (Reassign task to another technician)
* **Loading State**: Skeleton grids and status-loading indicators (especially for BFASS `processing` states).
* **Required Role**: `Admin` or `Superadmin`

### 8. Technician Screen: Assigned Tasks List
* **Required API Calls**: `GET /api/teknisi/tasks` (Filter by status)
* **Loading State**: Card container loading skeletons.
* **Empty State**: Centered graphic with "No tasks scheduled for today."
* **Error State**: Pull-to-refresh container displays error message.
* **Required Role**: `Teknisi` (Checked via Spatie policy; technicians only see tasks assigned to them).

### 9. Technician Screen: Task Detail & Installation Forms
* **Required API Calls**:
  - `GET /api/teknisi/tasks/{id}`
  - `PUT /api/teknisi/tasks/{id}/status` (Progress updates: `on_the_way` -> `in_progress`)
  - `POST /api/teknisi/tasks/{id}/upload-photo` (Max 5MB images)
  - `POST /api/teknisi/tasks/{id}/complete` (Final installation notes and star rating)
* **Loading State**: Lock buttons during network updates.
* **Error State**: Flash error notification toast on transaction failures.
* **Required Role**: `Teknisi`

---

## 6. Client-Side State Management Best Practices

### Caching vs Refetching (Axios / React Query / SWR)
* **Always Fetch Fresh (No Cache)**:
  - **Technician Installation Forms**: Real-time status updates are critical. Always fetch fresh on mount.
  - **Notifications Panel**: Keep fresh via WebSocket real-time triggers.
* **Cache with Revalidation (TTL = 30-60s)**:
  - **Submissions List / Provisioning List**: Cache the lists locally to prevent redundant queries. Invalidate/refetch when:
    - User creates a new submission/configuration.
    - User validates a submission.
    - Route transitions back to the dashboard.
* **Debouncing Search Inputs**: Apply a **300ms debounce** to search inputs (customer name, phone, NIK) before triggering the API search queries.
* **Pagination State**: Store the active page index inside the URL query parameters (e.g. `?page=2`) so that page refreshes do not reset the user's location.

---

## 7. Error Handling UX Actions

| HTTP Status | Backend Meaning | Client-Side Recommended UX Behavior |
| :--- | :--- | :--- |
| **`400`** | Bad Request (e.g. invalid workflow transition or failed action). | Show a Toast error explaining the issue (e.g., "Cannot complete task because BFASS is not finished"). |
| **`401`** | Sanctum Token Invalid / Expired. | Invalidate token, clear local state, and redirect immediately to the `/login` screen. |
| **`403`** | Spatie Role or Policy Gate failed. | Redirect user to a centralized "Access Denied" page, or show an overlay block. |
| **`404`** | Eloquent model or API endpoint not found. | Redirect to standard 404 Page or show "Resource not found" placeholder. |
| **`422`** | Validation Failed. | Highlight the corresponding input field in red and show the error messages directly below. |
| **`500`** | Database/Server error. | Trigger generic Toast alert: "System error occurred. Please contact the administrator." |
