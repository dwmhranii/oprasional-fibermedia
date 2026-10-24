# Panduan Pengujian Postman & REST API Testing

Panduan ini ditujukan bagi pengembang Frontend dan QA Tester untuk menguji endpoint Fibermedia Provisioning & Complaint System secara terstruktur.

---

## 1. Setup Environment Postman

Buat environment baru di Postman dengan variabel berikut:

| Variabel | Initial Value | Current Value |
| :--- | :--- | :--- |
| `base_url` | `http://127.0.0.1:8000/api` | `http://127.0.0.1:8000/api` |
| `token_superadmin` | *(Kosongkan)* | Terisi otomatis via Script Login |
| `token_admin` | *(Kosongkan)* | Terisi otomatis via Script Login |
| `token_sales` | *(Kosongkan)* | Terisi otomatis via Script Login |
| `token_teknisi` | *(Kosongkan)* | Terisi otomatis via Script Login |

---

## 2. Otomatisasi Token di Tab "Tests" Postman

Tambahkan script berikut pada tab **Tests** di request `POST {{base_url}}/login`:

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    var token = jsonData.data.access_token;
    var roles = jsonData.data.user.roles || [];
    
    pm.collectionVariables.set("current_token", token);
    
    if (roles.includes("Superadmin")) {
        pm.environment.set("token_superadmin", token);
    } else if (roles.includes("Admin")) {
        pm.environment.set("token_admin", token);
    } else if (roles.includes("Sales")) {
        pm.environment.set("token_sales", token);
    } else if (roles.includes("Teknisi")) {
        pm.environment.set("token_teknisi", token);
    }
    
    console.log("Token tersimpan untuk user: " + jsonData.data.user.name);
}
```

### 💡 Contoh Variasi Payload Login (Multi-Credential)
Body request `POST {{base_url}}/login` (JSON):
* **Opsi A (Email):**
  ```json
  { "login": "admin@example.com", "password": "password" }
  ```
* **Opsi B (Username / Nama):**
  ```json
  { "login": "Admin System", "password": "password" }
  ```
* **Opsi C (Nomor Telepon / WhatsApp):**
  ```json
  { "login": "081200000002", "password": "password" }
  ```
  *(Format `628...` atau `08...` otomatis dinormalisasi oleh sistem)*.

---

## 3. Contoh Uji End-to-End Alur Pengaduan

### Skenario: Penanganan Komplain Gangguan Internet
1. **Admin / CS Buat Tiket:**
   * `POST {{base_url}}/admin/complaints`
   * Header: `Authorization: Bearer {{token_admin}}`
   * Body: Pilih **form-data** *(Wajib form-data karena menyertakan lampiran file screenshot bukti kendala)*
     * `customer_name` *(Text)*: `Pak Budi`
     * `customer_phone` *(Text)*: `081234567890` *(Hanya angka 9 - 14 digit)*
     * `customer_address` *(Text)*: `Jl. Soekarno Hatta No. 10`
     * `area` *(Text)*: `Lowokwaru (Kota Malang)`
     * `category` *(Text)*: `no_signal`
     * `priority` *(Text)*: `high`
     * `subject` *(Text)*: `Internet LOS Merah`
     * `description` *(Text)*: `Lampu LOS berkedip merah sejak pagi`
     * `attachments[]` *(File - Wajib)*: Pilih file gambar/screenshot (`.png`, `.jpg`, `.pdf`, maks 5MB, 1 s/d 5 file)
   * Simpan `id` respon ke variabel `complaint_id`.

2. **Admin Assign Tim (Round Robin Otomatis):**
   * `POST {{base_url}}/admin/complaints/{{complaint_id}}/assign`
   * Header: `Authorization: Bearer {{token_admin}}`
   * Body: `{ "notes": "Penugasan otomatis sistem" }`

3. **Teknisi Cek Tugas Tim & Mulai Kerjakan:**
   * `GET {{base_url}}/teknisi/complaints`
   * `POST {{base_url}}/teknisi/complaints/{{complaint_id}}/start`
   * Header: `Authorization: Bearer {{token_teknisi}}`

4. **Teknisi Selesaikan Tiket & Upload Bukti:**
   * `POST {{base_url}}/teknisi/complaints/{{complaint_id}}/resolve`
   * Header: `Authorization: Bearer {{token_teknisi}}`
   * Body Form-Data:
     * `photos[]`: [Pilih file foto redaman OPM]
     * `resolution_category`: `splitter_odp_issue`
     * `description`: `Splicing ulang konektor di ODP, redaman sekarang -18.5 dBm`

5. **Admin Verifikasi Bukti & Tutup Tiket:**
   * `PUT {{base_url}}/admin/complaints/{{complaint_id}}/verify-close`
   * Header: `Authorization: Bearer {{token_admin}}`
   * Body:
     ```json
     {
       "evidence_verified": true,
       "notes": "Redaman bagus, tiket selesai."
     }
     ```

---

## 4. Contoh Uji Export & Import Excel Pelanggan

### A. Download Excel Pelanggan
* `GET {{base_url}}/admin/customers/export`
* Header: `Authorization: Bearer {{token_admin}}`
* Di Postman: Klik tombol **"Send and Download"** untuk menyimpan berkas `.xlsx`.

### B. Import Excel Pelanggan
* `POST {{base_url}}/admin/customers/import`
* Header: `Authorization: Bearer {{token_admin}}`
* Body Form-Data:
  * Key: `file` (Pilih tipe *File*)
  * Value: [Pilih file template `.xlsx` yang telah diisi]
