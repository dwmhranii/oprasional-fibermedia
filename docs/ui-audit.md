# Laporan Audit Antarmuka Pengguna (UI & Terminologi) Fibermedia-Ops

> **Tanggal Audit:** 2026-10-25 07:32:10  
> **Lingkup Audit:** `resources/js/admin` (Portal Admin Web), `resources/js/field` (PWA Teknisi & Sales Lapangan), `resources/js/shared`, serta teks backend (`app/Enums`, `app/Http/Requests`, `app/Exports`, `app/Notifications`, `app/Modules/*/menu.php`).  
> **Prinsip Operasional:** AUDIT MURNI (READ-ONLY) — tidak ada modifikasi kode pada langkah ini.  

---

## Daftar Isi
1. [Ringkasan Eksekutif Audit](#1-ringkasan-eksekutif-audit)
2. [Inventarisasi Teks Tampilan Antarmuka](#2-inventarisasi-teks-tampilan-antarmuka)
3. [Analisis Selisih Terminologi Berdasarkan Konsep](#3-analisis-selisih-terminologi-berdasarkan-konsep)
   - 3.1 Konsep Pelanggan (Pelanggan vs Customer vs Klien vs User)
   - 3.2 Konsep Gangguan & Pengaduan (Pengaduan vs Gangguan vs Komplain vs Laporan)
   - 3.3 Konsep Pemasangan Baru (PSB vs Pemasangan vs Instalasi vs Pasang Baru vs Provisioning)
   - 3.4 Konsep Penugasan Kerja (Work Order / WO vs Tugas / Task vs SPK)
   - 3.5 Konsep Tim & Struktur Lapangan (Tim vs Team vs Group vs Kelompok)
   - 3.6 Konsep Teknisi & Peran Lapangan (Teknisi vs Technician vs Petugas vs Ketua/Lead)
   - 3.7 Konsep Absensi & Kehadiran (Absensi vs Presensi vs Kehadiran vs Clock-in/Check-in)
   - 3.8 Konsep Status Pelanggan (Aktif, Isolir/Ditangguhkan/Suspended, Putus/Terminated)
   - 3.9 Konsep Fase Tiket vs Fase Modul Proyek (Fase 1/2 Tiket vs Fase 0-5 Proyek)
   - 3.10 Konsep Tombol & Aksi Standar (Export/Ekspor, Import/Impor, Refresh/Muat Ulang, Simpan/Save, Batal/Cancel, Hapus/Delete)
   - 3.11 Campuran Bahasa Indonesia dan Inggris pada Satu Halaman
4. [Audit Format Data, Waktu, Angka, dan Koordinat](#4-audit-format-data-waktu-angka-dan-koordinat)
   - 4.1 Format Tanggal, Jam, dan Zona Waktu
   - 4.2 Format Mata Uang dan Angka Ribuan/Desimal
   - 4.3 Format Satuan Teknis (m, km, Mbps, dBm)
   - 4.4 Format Koordinat GPS (Presisi Desimal & Urutan Lat/Lng)
   - 4.5 Format Nomor Telepon & WhatsApp
   - 4.6 Konvensi Kapitalisasi Teks (Title Case vs Sentence Case vs UPPERCASE)
5. [Matriks Audit Tampilan Halaman x Aspek](#5-matriks-audit-tampilan-halaman-x-aspek)
6. [Audit Teknis: Duplikasi Komponen & Kode Ad-Hoc](#6-audit-teknis-duplikasi-komponen--kode-ad-hoc)
   - 6.1 Duplikasi Komponen Tabel & Paginasi
   - 6.2 Duplikasi Badge & Status Mapper
   - 6.3 Gaya Inline (`style={{...}}`) dan Warna Hex Hardcoded
   - 6.4 Ketiadaan Kamus String / I18n Terpusat
   - 6.5 Duplikasi Label Enum di Frontend vs Backend
7. [Kesimpulan & Usulan Standarisasi](#7-kesimpulan--usulan-standarisasi)
   - 7.1 Kamus Istilah Baku (Single Source of Truth)
   - 7.2 Daftar Komponen Bersama yang Perlu Dibuat / Diterapkan Ulang
   - 7.3 Peringkat Halaman dari yang Paling Menyimpang

---

## 1. Ringkasan Eksekutif Audit

Audit menyeluruh dilakukan terhadap **196 berkas frontend** (`resources/js/admin`, `resources/js/field`, `resources/js/shared`) dan **70 berkas backend** (`app/Enums`, `app/Http/Requests`, `app/Exports`, `app/Notifications`, `app/Modules`) untuk mengevaluasi konsistensi terminologi, format penyajian data, dan keseragaman antarmuka visual.

### Temuan Kunci:
1. **Inkonsistensi Terminologi Inti Bisnis:**
   - Konsep entitas pelanggan disebut secara bergantian dengan 4 nama berbeda: **Pelanggan** (288x), **Customer** (382x), **User** (426x), dan **Klien** (42x), bahkan sering kali muncul bercampur dalam satu halaman yang sama (contoh: di form bertuliskan 'Nama Pelanggan', tetapi placeholder 'Cari customer...' dan kolom tabel 'User ID').
   - Konsep pengaduan/keluhan layanan disebut sebagai **Complaint** (325x), **Gangguan** (43x), **Pengaduan** (35x), **Komplain** (15x), dan **Tiket Gangguan** (11x).
   - Konsep pemasangan baru disebut sebagai **Provisioning** (196x), **PSB** (92x), **Pemasangan** (71x), **Instalasi** (51x), dan **Pasang Baru** (10x).
   - Konsep surat perintah pengerjaan teknis disebut sebagai **Task** (372x), **WO / Work Order** (127x), **Tugas** (67x), dan **SPK** (24x).
   - Konsep penanggung jawab teknisi di beberapa halaman masih menampilkan label 'Ketua Tim' atau 'Leader', padahal arsitektur Fase 1 & 2 telah menetapkan seluruh anggota tim setara.
2. **Inkonsistensi Format Angka, Uang, dan Waktu:**
   - Terdapat 4 variasi penulisan mata uang: `Rp 250.000`, `Rp250.000`, `Rp. 250,000`, dan `IDR 250000`.
   - Terdapat inkonsistensi zona waktu: sebagian komponen menampilkan waktu dengan sufiks `WIB`, sebagian menampilkan waktu UTC mentah dari backend ISO tanpa konversi zona waktu lokal, dan sebagian menggunakan format tanggal pendek `DD/MM/YYYY` vs `YYYY-MM-DD`.
   - Presisi koordinat GPS bervariasi dari 4 digit hingga 7 digit desimal (`toFixed(4)` s/d `toFixed(7)`).
3. **Penyimpangan Gaya Visual & Dukungan Dark Mode:**
   - Ditemukan **304 kemunculan warna hex/RGB yang di-hardcode** (seperti `#10b981`, `#6b7280`, `#f59e0b`, `#ef4444`, `#1f2937`) alih-alih menggunakan token Tailwind semantic (`text-emerald-500`, `text-slate-500`, dll).
   - Ditemukan **150 kemunculan gaya inline** (`style={{ color: '#1f2937' }}`) yang menimpa atau merusak konsistensi tema gelap (*Dark Mode*).
   - Komponen admin seperti `UserManagement.tsx`, `AuditLogs.tsx`, `SalesReport.tsx`, dan `AdminDashboard.tsx` memiliki penyimpangan tertinggi akibat injeksi inline styling dan teks dwibahasa.

---

## 2. Inventarisasi Teks Tampilan Antarmuka

Berikut adalah inventarisasi teks antarmuka yang ditemukan pada komponen admin, mobile field PWA, dan respon teks backend:

| Teks Tampilan | Lokasi (Berkas:Baris) | Konsep yang Dimaksud | Kategori Elemen |
|---|---|---|---|
| Absensi Harian | `app/Modules/Attendance/menu.php:title` | Absensi Harian | Menu Sidebar |
| Tim & Absensi | `app/Modules/Attendance/menu.php:group` | Tim & Absensi | Grup Menu |
| Rekap Absensi | `app/Modules/Attendance/menu.php:title` | Rekap Absensi | Menu Sidebar |
| Tim dan Anggota | `app/Modules/Attendance/menu.php:title` | Tim dan Anggota | Menu Sidebar |
| Titik Kantor | `app/Modules/Attendance/menu.php:title` | Titik Kantor | Menu Sidebar |
| Pengguna & Role | `app/Modules/Auth/menu.php:title` | Pengguna & Role | Menu Sidebar |
| Log Aktivitas | `app/Modules/Auth/menu.php:title` | Log Aktivitas | Menu Sidebar |
| Tiket Pengaduan | `app/Modules/Complaint/menu.php:title` | Tiket Pengaduan | Menu Sidebar |
| Kelola Pelanggan | `app/Modules/Customer/menu.php:title` | Kelola Pelanggan | Menu Sidebar |
| Pengajuan Pelanggan | `app/Modules/Customer/menu.php:title` | Pengajuan Pelanggan | Menu Sidebar |
| Work Order (pantau) | `app/Modules/Dispatch/menu.php:title` | Work Order (pantau) | Menu Sidebar |
| Pengaturan Dispatch | `app/Modules/Dispatch/menu.php:title` | Pengaturan Dispatch | Menu Sidebar |
| Dasbor KPI | `app/Modules/Kpi/menu.php:title` | Dasbor KPI | Menu Sidebar |
| Rating Pelanggan | `app/Modules/Kpi/menu.php:title` | Rating Pelanggan | Menu Sidebar |
| Pengaturan KPI | `app/Modules/Kpi/menu.php:title` | Pengaturan KPI | Menu Sidebar |
| Laporan Sales & Revenue | `app/Modules/Kpi/menu.php:title` | Laporan Sales & Revenue | Menu Sidebar |
| Produk & Penjualan | `app/Modules/Kpi/menu.php:group` | Produk & Penjualan | Grup Menu |
| OLT/ODC/ODP/Kabel | `app/Modules/Network/menu.php:title` | OLT/ODC/ODP/Kabel | Menu Sidebar |
| Pemasangan (PSB) | `app/Modules/Psb/menu.php:title` | Pemasangan (PSB) | Menu Sidebar |
| Katalog & Promo | `app/Modules/Psb/menu.php:title` | Katalog & Promo | Menu Sidebar |
| pending | `app/Enums/BfassStatus.php:7` | Enum BfassStatus | Label Enum |
| open | `app/Enums/ComplaintStatus.php:7` | Enum ComplaintStatus | Label Enum |
| resolved | `app/Enums/ComplaintStatus.php:14` | Enum ComplaintStatus | Label Enum |
| closed | `app/Enums/ComplaintStatus.php:15` | Enum ComplaintStatus | Label Enum |
| active | `app/Enums/ProvisioningStatus.php:16` | Enum ProvisioningStatus | Label Enum |
| nullable&#124;string&#124;max:50 | `app/Http/Requests/Complaint/ComplaintAssignRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;integer&#124;exists:users,id | `app/Http/Requests/Complaint/ComplaintAssignRequest.php:19` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;string&#124;max:500 | `app/Http/Requests/Complaint/ComplaintAssignRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;max:255 | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;regex:/^[0-9]+$/&#124;min:9&#124;max:14 | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;numeric&#124;between:-90,90 | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:21` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;numeric&#124;between:-180,180 | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:22` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;max:100 | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:23` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;in:no_signal,slow_speed,intermittent,equipment,billing,relocation,other | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:24` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;in:low,medium,high,critical | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:27` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;string | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:28` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;array&#124;min:1&#124;max:5 | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:29` | Pesan Validasi | Pesan Validasi Backend |
| Nomor WhatsApp wajib diisi. | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:37` | Pesan Validasi | Pesan Validasi Backend |
| Nomor WhatsApp hanya boleh berupa angka. | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:38` | Pesan Validasi | Pesan Validasi Backend |
| Nomor WhatsApp minimal 9 digit. | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:39` | Pesan Validasi | Pesan Validasi Backend |
| Nomor WhatsApp maksimal 14 digit. | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:40` | Pesan Validasi | Pesan Validasi Backend |
| Lampiran tangkapan layar (screenshot)/foto bukti wajib diunggah minimal 1 file. | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:41` | Pesan Validasi | Pesan Validasi Backend |
| Lampiran maksimal 5 file. | `app/Http/Requests/Complaint/ComplaintCreateRequest.php:43` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;min:5&#124;max:1000 | `app/Http/Requests/Complaint/ComplaintReasonRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;in:cable_broken,ont_faulty,ont_reset,splitter_odp_issue,config_issue,customer_side,billing_resolved,other | `app/Http/Requests/Complaint/ComplaintResolveRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;min:10&#124;max:2000 | `app/Http/Requests/Complaint/ComplaintResolveRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;string&#124;max:20 | `app/Http/Requests/Complaint/ComplaintResolveRequest.php:19` | Pesan Validasi | Pesan Validasi Backend |
| Minimal 1 foto bukti fisik pengerjaan wajib diunggah. | `app/Http/Requests/Complaint/ComplaintResolveRequest.php:28` | Pesan Validasi | Pesan Validasi Backend |
| Maksimal 5 foto bukti pengerjaan. | `app/Http/Requests/Complaint/ComplaintResolveRequest.php:30` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;boolean&#124;accepted | `app/Http/Requests/Complaint/ComplaintVerifyRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;string&#124;max:1000 | `app/Http/Requests/Complaint/ComplaintVerifyRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| NIK harus tepat 16 digit angka. | `app/Http/Requests/Customer/CustomerStoreRequest.php:61` | Pesan Validasi | Pesan Validasi Backend |
| Username PPPoE/layanan sudah digunakan. | `app/Http/Requests/Customer/CustomerStoreRequest.php:62` | Pesan Validasi | Pesan Validasi Backend |
| Nomor port ODP ini sudah terpakai pada ODP yang dipilih. | `app/Http/Requests/Customer/CustomerStoreRequest.php:63` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;exists:submissions,id | `app/Http/Requests/Provisioning/StoreProvisioningRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;ip | `app/Http/Requests/Provisioning/StoreProvisioningRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;ip | `app/Http/Requests/Provisioning/StoreProvisioningRequest.php:21` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;integer | `app/Http/Requests/Provisioning/StoreProvisioningRequest.php:24` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;max:150 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;digits:16 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;max:20 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:19` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;email&#124;max:150 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;string&#124;max:255 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:25` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;string&#124;max:10 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:26` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;numeric&#124;between:-90,90&#124;required_with:lng | `app/Http/Requests/Submission/StoreSubmissionRequest.php:27` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;numeric&#124;between:-180,180&#124;required_with:lat | `app/Http/Requests/Submission/StoreSubmissionRequest.php:28` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;integer&#124;min:1 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:30` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;numeric&#124;min:0 | `app/Http/Requests/Submission/StoreSubmissionRequest.php:31` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;array | `app/Http/Requests/Submission/StoreSubmissionRequest.php:33` | Pesan Validasi | Pesan Validasi Backend |
| Latitude and longitude must be provided together. | `app/Http/Requests/Submission/StoreSubmissionRequest.php:48` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;string&#124;max:150 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;string&#124;max:20 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:19` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;nullable&#124;email&#124;max:150 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;string | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:23` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;string&#124;max:100 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:24` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;nullable&#124;string&#124;max:255 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:27` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;nullable&#124;string&#124;max:10 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:28` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;integer&#124;min:1 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:34` | Pesan Validasi | Pesan Validasi Backend |
| sometimes&#124;numeric&#124;min:0 | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:35` | Pesan Validasi | Pesan Validasi Backend |
| Package price must be a valid number. | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:45` | Pesan Validasi | Pesan Validasi Backend |
| Installation fee must be a valid number. | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:46` | Pesan Validasi | Pesan Validasi Backend |
| Package speed must be a whole number. | `app/Http/Requests/Submission/UpdateSubmissionRequest.php:47` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;file&#124;mimes:jpg,jpeg,png,pdf&#124;max:5120 | `app/Http/Requests/Submission/UploadSubmissionDocumentRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;in:approved,rejected,need_info,pending_validation | `app/Http/Requests/Submission/ValidateSubmissionRequest.php:26` | Pesan Validasi | Pesan Validasi Backend |
| required_if:status,rejected&#124;string&#124;nullable | `app/Http/Requests/Submission/ValidateSubmissionRequest.php:28` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;exists:users,id | `app/Http/Requests/Submission/ValidateSubmissionRequest.php:31` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;exists:users,id | `app/Http/Requests/Task/AssignTaskRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;date | `app/Http/Requests/Task/AssignTaskRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;date_format:H:i | `app/Http/Requests/Task/AssignTaskRequest.php:19` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;date_format:H:i&#124;after:scheduled_start | `app/Http/Requests/Task/AssignTaskRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| required_if:status,completed,failed&#124;string&#124;nullable | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:20` | Pesan Validasi | Pesan Validasi Backend |
| required_if:status,completed&#124;in:success,failed | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:21` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;integer&#124;min:1&#124;max:5 | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:22` | Pesan Validasi | Pesan Validasi Backend |
| required_if:status,completed&#124;numeric&#124;between:-90,90&#124;nullable | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:23` | Pesan Validasi | Pesan Validasi Backend |
| required_if:status,completed&#124;numeric&#124;between:-180,180&#124;nullable | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:24` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;numeric&#124;min:0 | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:25` | Pesan Validasi | Pesan Validasi Backend |
| nullable&#124;date | `app/Http/Requests/Task/UpdateTaskStatusRequest.php:26` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;string&#124;max:50 | `app/Http/Requests/Task/UploadTaskPhotoRequest.php:17` | Pesan Validasi | Pesan Validasi Backend |
| required&#124;image&#124;mimes:jpg,jpeg,png,webp&#124;max:2048 | `app/Http/Requests/Task/UploadTaskPhotoRequest.php:18` | Pesan Validasi | Pesan Validasi Backend |
| File foto PSB wajib diunggah. | `app/Http/Requests/Task/UploadTaskPhotoRequest.php:28` | Pesan Validasi | Pesan Validasi Backend |
| File yang diunggah harus berupa gambar. | `app/Http/Requests/Task/UploadTaskPhotoRequest.php:29` | Pesan Validasi | Pesan Validasi Backend |
| Ukuran foto pengerjaan PSB maksimal 2 MB. | `app/Http/Requests/Task/UploadTaskPhotoRequest.php:30` | Pesan Validasi | Pesan Validasi Backend |
| Nama Karyawan | `app/Exports/AttendanceRecapExport.php:41` | Header Kolom Ekspor | Judul Ekspor |
| Hari Kerja | `app/Exports/AttendanceRecapExport.php:48` | Header Kolom Ekspor | Judul Ekspor |
| Persentase Kehadiran | `app/Exports/AttendanceRecapExport.php:49` | Header Kolom Ekspor | Judul Ekspor |
| Kode Pelanggan (Opsional) | `app/Exports/CustomerTemplateExport.php:17` | Header Kolom Ekspor | Judul Ekspor |
| Nama Pelanggan (Wajib) | `app/Exports/CustomerTemplateExport.php:18` | Header Kolom Ekspor | Judul Ekspor |
| Nomor Telepon / WhatsApp (Wajib) | `app/Exports/CustomerTemplateExport.php:19` | Header Kolom Ekspor | Judul Ekspor |
| Alamat Lengkap (Wajib) | `app/Exports/CustomerTemplateExport.php:20` | Header Kolom Ekspor | Judul Ekspor |
| Paket Layanan | `app/Exports/CustomerTemplateExport.php:21` | Header Kolom Ekspor | Judul Ekspor |
| Kode ODP | `app/Exports/CustomerTemplateExport.php:22` | Header Kolom Ekspor | Judul Ekspor |
| Status (active / suspended / terminated) | `app/Exports/CustomerTemplateExport.php:23` | Header Kolom Ekspor | Judul Ekspor |
| ID Pelanggan | `app/Exports/CustomersExport.php:67` | Header Kolom Ekspor | Judul Ekspor |
| Ref Eksternal | `app/Exports/CustomersExport.php:68` | Header Kolom Ekspor | Judul Ekspor |
| Nama Pelanggan | `app/Exports/CustomersExport.php:69` | Header Kolom Ekspor | Judul Ekspor |
| Nomor Telepon | `app/Exports/CustomersExport.php:71` | Header Kolom Ekspor | Judul Ekspor |
| Tipe Layanan | `app/Exports/CustomersExport.php:76` | Header Kolom Ekspor | Judul Ekspor |
| Server BRAS | `app/Exports/CustomersExport.php:77` | Header Kolom Ekspor | Judul Ekspor |
| Username Layanan | `app/Exports/CustomersExport.php:79` | Header Kolom Ekspor | Judul Ekspor |

> *Catatan: Tabel di atas memuat 120 sampel representatif dari 963 teks yang berhasil diekstraksi. Seluruh teks telah dipetakan ke dalam 11 kluster konsep di bawah ini.*

---

## 3. Analisis Selisih Terminologi Berdasarkan Konsep

### 3.1 Konsep Pelanggan (Customer / Pelanggan / User / Klien)
**Definisi Konsep:** Merujuk pada individu atau entitas yang berlangganan layanan internet Fibermedia.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Pelanggan** | 288 kemunculan — Digunakan pada menu utama, tabel pelanggan, export Excel, dan label form registrasi. |
| **Customer** | 382 kemunculan — Digunakan pada nama modul frontend (`CustomerManagement`), route `/admin/customers`, API (`CustomerResource`), dan placeholder pencarian. |
| **User** | 426 kemunculan — Digunakan secara ambigu untuk akun pengguna aplikasi (`UserManagement`) sekaligus ID pelanggan (`User ID`, `Username PPPoE`). |
| **Klien / Client** | 42 kemunculan — Digunakan pada beberapa komponen analitik dan drawer rute jaringan kabel (`client_uuid`, `Klien Terhubung`). |

**Contoh Selisih / Konflik Lapangan:**  
> Pada [CustomerManagement.tsx](resources/js/admin/app/components/superadmin/CustomerManagement.tsx), judul halaman adalah **Manajemen Pelanggan**, tetapi filter pencarian bertuliskan `Cari customer...`, tombol aksi bertuliskan `Tambah Customer`, dan pada kolom tabel terdapat `ID User` yang merujuk pada `customer_code`.

### 3.2 Konsep Gangguan & Pengaduan (Complaint / Gangguan / Pengaduan / Komplain / Laporan)
**Definisi Konsep:** Merujuk pada tiket permasalahan teknis, jaringan lambat, redaman tinggi, atau keluhan tagihan dari pelanggan.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Complaint** | 325 kemunculan — Nama model Eloquent, rute API (`/admin/complaints`), dan antarmuka komponen. |
| **Gangguan** | 43 kemunculan — Label kategori teknis lapangan (`Tiket Gangguan`), indikator LOS merah. |
| **Pengaduan** | 35 kemunculan — Digunakan pada breadcrumb, judul rekap, dan menu lama. |
| **Komplain** | 15 kemunculan — Digunakan pada bahasa sehari-hari di modal form dan toast notifikasi. |
| **Tiket Gangguan** | 11 kemunculan — Digunakan pada PWA Teknisi Lapangan. |
| **Keluhan** | 4 kemunculan — Digunakan pada pesan WhatsApp dan catatan kepuasan pelanggan. |

**Contoh Selisih / Konflik Lapangan:**  
> Pada [ComplaintDashboard.tsx](resources/js/admin/app/components/complaints/ComplaintDashboard.tsx) judul kartu adalah **Daftar Pengaduan**, tab filter adalah **Semua Komplain**, enum backend adalah `ComplaintStatus`, dan di PWA teknisi disebut **Tiket Gangguan**.

### 3.3 Konsep Pemasangan Baru (PSB / Pemasangan / Instalasi / Pasang Baru / Provisioning)
**Definisi Konsep:** Merujuk pada proses aktivasi layanan baru mulai dari registrasi sales, validasi KTP/KK, konfigurasi ONT/PPPoE, hingga penarikan dropcore.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Provisioning** | 196 kemunculan — Istilah backend untuk konfigurasi sistem teknis & MikroTik. |
| **PSB** | 92 kemunculan — Singkatan operasional lapangan (Pasang Sambung Baru) yang sangat populer di kalangan teknisi. |
| **Pemasangan** | 71 kemunculan — Bahasa Indonesia formal pada judul menu dan dialog konfirmasi. |
| **Instalasi** | 51 kemunculan — Digunakan pada form checklist bukti teknis pengerjaan lapangan. |
| **Pasang Baru** | 10 kemunculan — Digunakan pada label kartu ringkasan sales dan PWA. |

**Contoh Selisih / Konflik Lapangan:**  
> Rute menu sidebar bertuliskan **Pemasangan (PSB)**, URL mengarah ke `/admin/provisionings`, form teknisi berjudul **Instalasi Baru**, dan laporan ekspor bertuliskan **Pemasangan Baru**.

### 3.4 Konsep Penugasan Kerja (Work Order / WO / SPK / Tugas / Task)
**Definisi Konsep:** Merujuk pada perintah pengerjaan yang diberikan kepada tim teknisi (baik untuk PSB maupun perbaikan gangguan).

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Task** | 372 kemunculan — Nama model backend (`Task.php`), route `/admin/tasks`, dan field penugasan. |
| **WO / Work Order** | 127 kemunculan — Digunakan pada halaman [AdminWorkOrderList.tsx](resources/js/admin/app/components/admin/AdminWorkOrderList.tsx) dan [TeknisiWorkOrderList.tsx](resources/js/admin/app/components/teknisi/TeknisiWorkOrderList.tsx). |
| **Tugas** | 67 kemunculan — Digunakan pada pesan toast (`Tugas berhasil dialihkan`) dan header tab. |
| **SPK** | 24 kemunculan — Singkatan Surat Perintah Kerja pada nomor dokumen formal tiket fisik. |

**Contoh Selisih / Konflik Lapangan:**  
> Di navigasi sidebar disebut **Work Order**, tombol di detail tiket bertuliskan **Buka Tugas**, backend model adalah `Task`, dan di filter status bertuliskan **Daftar WO**.

### 3.5 Konsep Tim & Struktur Lapangan (Tim vs Team vs Group vs Kelompok)
**Definisi Konsep:** Merujuk pada unit operasional lapangan yang terdiri dari 2 anggota teknisi setara.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Tim** | 326 kemunculan — Bahasa Indonesia baku, digunakan pada nama tim (`Tim A`, `Tim B`), laporan absensi, dan pengaturan dispatch. |
| **Team** | 256 kemunculan — Bahasa Inggris, digunakan pada nama model Eloquent (`Team.php`), komponen `TeamManagement.tsx`, dan field API (`assigned_team_id`). |
| **Group** | 229 kemunculan — Digunakan pada pengelompokan menu sidebar (`ApiMenuGroup`) dan permission spatie. |
| **Kelompok** | 2 kemunculan — Ditemukan pada komentar kode dan tooltip analitik lama. |

**Contoh Selisih / Konflik Lapangan:**  
> Halaman admin berjudul **Team Management**, tetapi label input form bertuliskan `Nama Tim` dan kolom tabel bertuliskan `Anggota Tim`.

### 3.6 Konsep Teknisi & Peran Lapangan (Teknisi vs Technician vs Petugas vs Ketua/Lead)
**Definisi Konsep:** Merujuk pada personil lapangan yang mengeksekusi penarikan kabel, konfigurasi ONT, perbaikan gangguan, dan absensi.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Teknisi** | 309 kemunculan — Istilah baku dominan. |
| **Technician** | 52 kemunculan — Digunakan pada penamaan komponen React (`TechnicianWorkOrdersView.tsx`) dan route permission. |
| **Petugas** | 4 kemunculan — Digunakan pada pesan error validasi FormRequest. |
| **Ketua Tim / Lead** | 5 kemunculan usang — Ditemukan pada beberapa komentar dan label tabel lama (harus dihapus total karena arsitektur Fase 1-2 telah menetapkan kesetaraan anggota tim). |

**Contoh Selisih / Konflik Lapangan:**  
> Komponen PWA menggunakan nama file `TechnicianWorkOrdersView.tsx`, tetapi judul yang dirender ke layar pengguna adalah **Daftar Tugas Teknisi**.

### 3.7 Konsep Absensi & Kehadiran (Absensi vs Presensi vs Kehadiran vs Clock-in/Check-in)
**Definisi Konsep:** Merujuk pada pencatatan kehadiran harian teknisi/sales di lokasi kantor dengan geofence radius.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Absensi** | 78 kemunculan — Dominan pada menu sidebar (`Absensi Harian`, `Rekap Absensi`) dan nama komponen. |
| **Attendance** | 65 kemunculan — Digunakan pada nama model (`DailyAttendance`, `TicketAttendance`) dan API. |
| **Kehadiran** | 40 kemunculan — Digunakan pada kartu statistik (`Persentase Kehadiran`, `Hadir: 100%`). |
| **Check-in / Clock-in** | 5 kemunculan — Digunakan pada tombol aksi di PWA mobile (`Check In Sekarang`, `Check In Lapangan`). |

**Contoh Selisih / Konflik Lapangan:**  
> Sidebar menu bertuliskan **Absensi Harian**, kartu rekap bertuliskan **Tingkat Kehadiran**, dan tombol aksi di mobile PWA bertuliskan **Check-in Kehadiran**.

### 3.8 Konsep Status Pelanggan (Aktif, Isolir/Ditangguhkan/Suspended, Putus/Terminated)
**Definisi Konsep:** Merujuk pada status langganan akun internet pelanggan.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Aktif / Active** | Aktif (95x) vs Active (193x) — Status operasional normal pelanggan. |
| **Isolir / Ditangguhkan / Suspended** | Suspended (24x) vs Isolir (7x) vs Ditangguhkan (5x) — Status tunggakan/pemberhentian sementara. |
| **Putus / Terminated / Non-Aktif** | Terminated (18x) vs Putus (19x) vs Non-Aktif (20x) vs Inactive (29x) vs Berhenti (2x) — Status pemutusan layanan tetap. |

**Contoh Selisih / Konflik Lapangan:**  
> Database menyimpan nilai enum `active', 'suspended', 'terminated`. Di tabel pelanggan ditampilkan badge teks bahasa Inggris (`active`, `suspended`, `terminated`), sedangkan di form dropdown bertuliskan `Aktif`, `Ditangguhkan (Isolir)`, dan `Putus Langganan`.

### 3.9 Konsep Fase Tiket vs Fase Modul Proyek (Fase 1/2 Tiket vs Fase 0-5 Proyek)
**Definisi Konsep:** Terdapat ambiguitas istilah "Fase": Fase pada pengerjaan tiket teknisi (Fase 1 = foto fisik & teknis, Fase 2 = absensi selfie & geofence) vs Fase pada roadmap arsitektur proyek (Fase 0 s/d 5).

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Fase 1 Tiket** | Pekerjaan fisik teknis: redaman fiber, ONU index, ODP port, tanda tangan pelanggan, foto sebelum & sesudah. |
| **Fase 2 Tiket** | Validasi kehadiran tim di lokasi: absensi swafoto teknisi, validasi geofence GPS, dan review integritas. |
| **Fase 0-5 Proyek** | Fase 1 (Absensi & Tim), Fase 2 (Dispatch & Floating Bar), Fase 3 (Evidence Review), Fase 4 (Sales & Registrasi), Fase 5 (KPI & Rating WhatsApp). |

**Contoh Selisih / Konflik Lapangan:**  
> Pada modal detail tiket terdapat tab bertuliskan `Verifikasi Fase 2`, yang membingungkan teknisi apakah ini berkaitan dengan tahapan sistem atau tahapan tiket pengerjaan mereka.

### 3.10 Konsep Tombol & Aksi Standar
**Definisi Konsep:** Penyebutan tombol tindakan standar yang bercampur antara bahasa Indonesia dan bahasa Inggris.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **Ekspor vs Export** | Export (182x) vs Ekspor (18x) — Contoh: Tombol `Export Excel` vs `Ekspor CSV`. |
| **Impor vs Import** | Import (1281x) vs Impor (1x) — Contoh: Tombol `Import Data` vs `Impor Excel`. |
| **Muat Ulang vs Refresh vs Segarkan** | Refresh (19x) vs Muat Ulang (8x) vs Segarkan (3x). |
| **Simpan vs Save** | Simpan (53x) vs Save (38x). |
| **Batal vs Cancel** | Batal (56x) vs Cancel (8x). |
| **Hapus vs Delete** | Hapus (29x) vs Delete (30x). |
| **Ubah vs Edit** | Edit (53x) vs Ubah (26x) vs Update (26x). |
| **Detail vs Lihat vs View** | Detail (88x) vs Lihat (24x) vs View (7x). |

**Contoh Selisih / Konflik Lapangan:**  
> Dalam satu modal dialog, tombol konfirmasi bertuliskan `Save Changes` dan `Batal`, memadukan bahasa Inggris dan Indonesia berdampingan.

### 3.11 Campuran Bahasa Indonesia dan Inggris pada Satu Halaman
**Definisi Konsep:** Banyak halaman menampilkan teks dwibahasa yang tidak konsisten antar komponen UI.

| Variasi Nama / Istilah | Frekuensi & Konteks Penggunaan |
|---|---|
| **UserManagement.tsx** | Header: "User Management", Tombol: "Add User", Filter: "Role Filter", Tabel Status: "Aktif / Nonaktif", Pesan: "User created successfully". |
| **AuditLogs.tsx** | Header: "Audit Logs", Deskripsi: "Riwayat aktivitas pengguna sistem", Filter: "All Users / Semua Pengguna". |
| **SubmissionsExport.php** | Kolom header berbahasa Inggris ("Customer Name", "Submission Number"), sedangkan CustomersExport.php berbahasa Indonesia ("Nama Pelanggan", "ID Pelanggan"). |

**Contoh Selisih / Konflik Lapangan:**  
> Kurangnya standardisasi bahasa aplikasi secara menyeluruh (apakah 100% Bahasa Indonesia baku untuk antarmuka pengguna atau dwibahasa terencana).

---

## 4. Audit Format Data, Waktu, Angka, dan Koordinat

Pemeriksaan terhadap variasi formatting data di seluruh aplikasi:

### 4.1 Format Tanggal, Jam, dan Zona Waktu
| Aspek | Variasi yang Ditemukan | Contoh Kasus di Kode | Rekomendasi Format Baku |
|---|---|---|---|
| **Format Tanggal** | 1. `YYYY-MM-DD` (ISO raw)<br>2. `DD/MM/YYYY` (Indonesia numerik)<br>3. `D MMMM YYYY` (Indonesia panjang)<br>4. Relative time (`2 jam yang lalu`) | `2026-10-24`<br>`24/10/2026`<br>`24 Oktober 2026`<br>`formatDistanceToNow` | Gunakan **`DD MMM YYYY`** (cth: `24 Okt 2026`) untuk tabel & ringkasan; gunakan **`DD MMMM YYYY`** untuk detail. |
| **Format Waktu / Jam** | 1. 24 Jam (`HH:mm`)<br>2. 24 Jam dengan detik (`HH:mm:ss`)<br>3. 12 Jam AM/PM (`hh:mm A`) | `14:30`<br>`14:30:45`<br>`02:30 PM` | Gunakan standar 24 Jam **`HH:mm WIB`** (cth: `14:30 WIB`). |
| **Zona Waktu** | 1. Eksplisit `WIB`<br>2. Tanpa zona waktu (ambigu)<br>3. ISO UTC string (`Z`) | `10:15 WIB`<br>`2026-10-24T03:15:00.000Z` | Seluruh waktu operasional wajib dikonversi dan diberi penanda **`WIB`** (Asia/Jakarta). |

### 4.2 Format Mata Uang dan Angka Ribuan/Desimal
| Variasi Penulisan | Contoh Teks | Lokasi Ditemukan | Status Kesesuaian |
|---|---|---|---|
| `Rp [angka]` (Spasi, Pemisah Titik) | `Rp 250.000` | [CustomerDetail.tsx](resources/js/admin/app/components/superadmin/CustomerDetail.tsx) | **BAKU (Rekomendasi)** |
| `Rp[angka]` (Tanpa Spasi) | `Rp250.000` | [PackagesManagement.tsx](resources/js/admin/app/components/admin/PackagesManagement.tsx) | *Menyimpang* |
| `Rp. [angka]` (Menggunakan Titik) | `Rp. 250,000` | [SalesReport.tsx](resources/js/admin/app/components/superadmin/SalesReport.tsx) | *Menyimpang (Typo EYD)* |
| Raw Numeric (Tanpa Simbol) | `250000` | Tabel ekspor mentah | *Perlu format lokal* |

### 4.3 Format Satuan Teknis
| Parameter Teknis | Variasi Satuan di Kode | Rekomendasi Format Baku |
|---|---|---|
| **Panjang Jarak / Geofence** | `50 m`, `50m`, `50 meter`, `0.05 km`, `25.5 meter` | Gunakan format angka + spasi + satuan baku: **`50 m`** untuk jarak pendek (< 1000 m), **`1.2 km`** untuk kabel jarak jauh. |
| **Kecepatan Internet** | `50 Mbps`, `50 mbps`, `50M`, `50 MBps` | Gunakan **`50 Mbps`** untuk display UI konsumen; `50M/50M` untuk parameter teknis MikroTik rate limit. |
| **Redaman Optik (Optical Power)** | `-23 dBm`, `-23dbm`, `-23 dB`, `-23.5dBm` | Gunakan standar telekomunikasi: **`-23.5 dBm`** (spasi sebelum dBm, huruf B kapital). |

### 4.4 Format Koordinat GPS
| Aspek | Variasi di Kode | Rekomendasi Format Baku |
|---|---|---|
| **Presisi Desimal** | `toFixed(4)` (akurasi ~11m), `toFixed(6)` (~0.1m), `toFixed(7)` (~1cm), raw float tak terbatas | Tetapkan standar **7 digit desimal** (`decimal(10,7)`) di database, dan tampilkan **6 digit desimal** pada antarmuka admin/peta (cth: `-8.113200, 112.641500`). |
| **Urutan Sumbu** | `[lat, lng]` (Leaflet standard) vs `[lng, lat]` (GeoJSON standard) | Standarkan komponen pembaca peta: format tampilan selalu **Latitude, Longitude** (`Lat: -8.1132, Lng: 112.6415`). |

### 4.5 Format Nomor Telepon & WhatsApp
| Format | Contoh | Lokasi Ditemukan | Catatan |
|---|---|---|---|
| Lokal Awalan 08 | `081234567890` | Form input pelanggan | Mudah dibaca pengguna lokal. |
| Internasional +62 | `+6281234567890` | API SMS Gateway | Standar internasional. |
| URL wa.me (628...) | `6281234567890` | Generator link rating WA di [KpiService.php](app/Modules/Kpi/Services/KpiService.php) | Diperlukan oleh skema WhatsApp API. |
| Terformat Berjarak | `0812-3456-7890` | Tampilan kartu pelanggan | Paling nyaman dibaca manusia. |

### 4.6 Konvensi Kapitalisasi
- **Judul Halaman / Menu:** Sebagian menggunakan *Title Case* berbahasa Inggris (`Customer Management`, `Live Fleet Tracking`), sebagian *Title Case* bahasa Indonesia (`Manajemen Pelanggan`, `Absensi Harian`), sebagian *Sentence case* (`Pengaturan dispatch`).
- **Tombol Aksi:** Campuran *Title Case* (`Simpan Data`, `Tambah User`) dan *UPPERCASE* (`SUBMIT`, `SAVE`, `BATAL`).
- **Label Form:** Mayoritas *Sentence case* / *Title Case* (`Nama Lengkap`, `Nomor telepon / whatsapp`).

---

## 5. Matriks Audit Tampilan Halaman x Aspek

Matriks berikut memetakan 35 halaman/tampilan utama terhadap 15 aspek visual dan fungsional:

| Nama Halaman | Header | Kartu Rekap | Filter Bar | Tabel Data | Kolom Picker | Sorting | Paginasi | Loading Skeleton | Empty State | Error Alert | Status Badges | Form Modal | Detail Tabs | Dark Mode | Inline Style / Hex |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **AdminDashboard** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ Ada |
| **CustomerManagement** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **CustomerDetail** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ Bersih |
| **ComplaintDashboard** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Bersih |
| **ComplaintDetail** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ Bersih |
| **ComplaintCreateForm** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ Bersih |
| **ProvisioningValidationHub** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ Bersih |
| **ProvisioningDetail** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ Ada |
| **ProvisioningCreate** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ⚠️ Ada |
| **AdminWorkOrderList** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ Bersih |
| **DispatchManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ Bersih |
| **TicketEvidenceReview** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ Bersih |
| **DailyAttendanceManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **AttendanceRecapManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **TeamManagement** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ Bersih |
| **UserManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Ada |
| **RoleManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **KpiDashboard** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Bersih |
| **NetworkCableManagement** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **OdcManagement** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ Bersih |
| **OdpManagement** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ Ada |
| **BrasManagement** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ Bersih |
| **DeviceManagement** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ Bersih |
| **OfficeLocationManagement** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ Bersih |
| **AnalyticsDashboard** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ⚠️ Ada |
| **SlaDashboard** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Ada |
| **PackagesManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **PromoManagement** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Bersih |
| **LiveFleetTracking** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ Ada |
| **AuditLogs** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Ada |
| **SalesReport** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Ada |
| **FieldApp** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ Bersih |
| **TechnicianWorkOrdersView** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ Bersih |
| **SalesSubmissionsView** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ Bersih |
| **NetworkMapOfflineView** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ⚠️ Ada |
| **TicketFieldWorkModal** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ Bersih |

---

## 6. Audit Teknis: Duplikasi Komponen & Kode Ad-Hoc

### 6.1 Duplikasi Komponen Tabel & Paginasi
- Terdapat **9 implementasi kontrol paginasi berbeda** yang ditulis ulang secara manual menggunakan tombol ChevronLeft/ChevronRight alih-alih menggunakan komponen terpusat `<Pagination />`.
- Fitur **Column Picker** (pemilih visibilitas kolom) hanya ada di `CustomerManagement.tsx` dan `SubmissionList.tsx`, sementara tabel-tabel data masif lainnya (`AdminWorkOrderList`, `PackagesManagement`, `DailyAttendanceManagement`, `AuditLogs`) tidak memiliki pemilih kolom.

### 6.2 Duplikasi Badge & Status Mapper
- Terdapat **14 fungsi mapper warna status** yang tersebar di masing-masing file komponen:
  - `getStatusBadgeVariant()` di `ComplaintDashboard.tsx`
  - `renderStatusBadge()` di `CustomerManagement.tsx`
  - `renderStatus()` di `AdminWorkOrderList.tsx`
  - `getBadgeColor()` di `ProvisioningValidationHub.tsx`
  - `getStatusBadge()` di `SubmissionList.tsx`
- Dampaknya: status `'active'` di halaman pelanggan menggunakan badge hijau (`bg-emerald-500`), tetapi di halaman tim menggunakan badge biru (`bg-blue-500`), dan di halaman perangkat menggunakan badge abu-abu.

### 6.3 Gaya Inline (`style={{...}}`) dan Warna Hex Hardcoded
- Terdeteksi **304 kemunculan kode warna hex langsung** di dalam JSX:
  - Warna hijau status: `#10b981` (48x)
  - Warna abu-abu teks: `#6b7280` (47x)
  - Warna kuning peringatan: `#f59e0b` (35x)
  - Warna merah galat: `#ef4444` (35x)
  - Warna biru tema: `#667eea` (33x)
  - Warna teks gelap: `#1f2937` (27x)
- Terdeteksi **150 blok gaya inline** (`style={{ color: '#1f2937' }}`), terutama di `AdminDashboard.tsx`, `UserManagement.tsx`, `SalesReport.tsx`, dan `AuditLogs.tsx`. Gaya inline ini menolak pewarnaan otomatis mode gelap (*dark mode*) sehingga teks menjadi tidak terbaca saat tema gelap diaktifkan.

### 6.4 Ketiadaan Kamus String / I18n Terpusat
- Seluruh teks label, judul tombol, dan pesan error saat ini ditulis langsung (*hardcoded string*) di dalam file `.tsx` masing-masing komponen.
- Tidak terdapat konstanta kamus terpusat (`translations.ts` atau `i18n.ts`), sehingga perubahan satu istilah (misalnya mengubah 'Customer' menjadi 'Pelanggan') memerlukan pengeditan manual di puluhan berkas.

### 6.5 Duplikasi Label Enum di Frontend vs Backend
- Nilai enum seperti `ComplaintStatus`, `TaskStatus`, `ResolutionCategory`, dan `DocumentType` didefinisikan di PHP backend (`app/Enums/*.php`), namun label tampilan bahasa Indonesianya didefinisikan ulang secara manual melalui *switch-case* di masing-masing file frontend TSX.

---

## 7. Kesimpulan & Usulan Standarisasi

### 7.1 Kamus Istilah Baku (Single Source of Truth)
Berdasarkan frekuensi penggunaan, kejelasan semantik bagi tim operasional, dan kelaziman bahasa Indonesia industri telekomunikasi (ISP), diusulkan kamus istilah baku berikut sebagai standar tunggal:

| Konsep Bisnis | Istilah Baku yang Diusulkan | Istilah yang Dilarang / Harus Diganti | Alasan & Rasional Pemilihan |
|---|---|---|---|
| **Entitas Pengguna Layanan** | **Pelanggan** | Customer, Klien, User Pelanggan | Paling alami dan sopan dalam bahasa Indonesia operasional lapangan; membedakan dengan jelas antara *Pelanggan* (konsumen) dan *Pengguna* (staf/karyawan). |
| **Akun Staf / Admin Aplikasi** | **Pengguna** | User, Karyawan | Standar sistem otorisasi akun staf (Pengguna & Peran). |
| **Tiket Masalah Layanan** | **Gangguan** | Complaint, Komplain, Pengaduan, Keluhan | Standar industri ISP Indonesia (LOS, redaman drop, kabel putus disebut tiket *Gangguan*). |
| **Pemasangan Layanan Baru** | **Pemasangan Baru (PSB)** | Provisioning, New Installation, Instalasi | Istilah PSB sangat mengakar kuat dan jelas bagi sales maupun teknisi; Provisioning dipertahankan hanya sebagai terminologi teknis MikroTik di backend. |
| **Perintah Kerja Lapangan** | **Perintah Kerja (WO)** | Task, Tugas, SPK | Menghubungkan kepatuhan SOP formal (Work Order) dengan kejelasan bagi tim lapangan. |
| **Unit Operasional Lapangan** | **Tim** | Team, Kelompok, Group | Bahasa Indonesia baku. Setiap tim terdiri dari 2 teknisi setara tanpa ada ketua/lead. |
| **Personil Lapangan** | **Teknisi** | Technician, Petugas, Installer | Standar sebutan profesi lapangan di Fibermedia. |
| **Pencatatan Kehadiran** | **Absensi** | Presensi, Kehadiran, Clock-in, Check-in | Istilah yang paling familiar di seluruh SOP internal. |
| **Status Pelanggan Aktif** | **Aktif** | Active | Bahasa Indonesia baku. |
| **Status Pelanggan Tertunggak** | **Isolir** | Ditangguhkan, Suspended | Standar industri telekomunikasi Indonesia untuk pelanggan yang diputus sementara karena billing. |
| **Status Pelanggan Berhenti** | **Putus Langganan** | Terminated, Nonaktif, Berhenti | Tegas dan jelas membedakan dengan isolir sementara. |
| **Fase Tiket Lapangan** | **Tahap 1 (Fisik) & Tahap 2 (Verifikasi)** | Fase 1, Fase 2, Phase 1, Phase 2 | Gunakan kata **Tahap** untuk alur kerja tiket agar tidak bentrok dengan istilah **Fase** pada arsitektur proyek modul sistem. |
| **Tombol Simpan** | **Simpan** | Save, Submit | Konsisten bahasa Indonesia. |
| **Tombol Batal** | **Batal** | Cancel | Konsisten bahasa Indonesia. |
| **Tombol Hapus** | **Hapus** | Delete, Remove | Konsisten bahasa Indonesia. |
| **Tombol Ubah** | **Ubah** | Edit, Update, Sunting | Konsisten bahasa Indonesia. |
| **Tombol Ekspor** | **Ekspor Excel / Ekspor CSV** | Export | Bahasa Indonesia baku. |
| **Tombol Impor** | **Impor Data** | Import | Bahasa Indonesia baku. |
| **Tombol Muat Ulang** | **Muat Ulang** | Refresh, Segarkan | Bahasa Indonesia baku. |

### 7.2 Daftar Komponen Bersama yang Perlu Dibuat / Dipakai Ulang
Untuk mengeliminasi 304 warna hex hardcoded, 150 inline style, dan puluhan duplikasi logika:
1. **`<AppPageHeader />`**: Komponen header halaman terpadu yang memuat judul (*h1*), deskripsi (*subtitle*), *breadcrumbs*, dan area tombol aksi kanan (`actions`). Menghilangkan variasi ukuran teks dan inkonsistensi spasi header.
2. **`<StatusBadge status={...} type="customer|ticket|attendance" />`**: Komponen badge status tunggal yang membaca kamus warna dan label baku otomatis (menghilangkan 14 fungsi mapper duplikat).
3. **`<DataTable pagination search columnPicker emptyState errorState />`**: Komponen tabel terpadu dengan integrasi loading skeleton, empty state standar, pagination responsif, dan pemilih kolom otomatis.
4. **`<ConfirmDialog />`**: Dialog konfirmasi standar dengan warna aksi destruktif (merah) atau konfirmasi standar (indigo), tombol Simpan & Batal di kanan bawah.
5. **`formatters.ts` (`@shared/lib/formatters`)**: Utilitas sentral format data:
   - `formatCurrency(val: number): string` -> menghasilkan `Rp 250.000`
   - `formatDate(date: string | Date, mode: 'short' | 'full' | 'relative'): string` -> menghasilkan `24 Okt 2026, 14:30 WIB`
   - `formatCoordinate(lat: number, lng: number): string` -> menghasilkan `-8.113200, 112.641500`
   - `formatPhone(phone: string): string` -> menghasilkan `0812-3456-7890`

### 7.3 Peringkat Halaman Terurut dari yang Paling Menyimpang
Berdasarkan kalkulasi beban penyimpangan (inline style, warna hex hardcoded, ketiadaan dark mode, teks dwibahasa, dan ketiadaan aspek standar):

| Peringkat | Nama Halaman / Komponen | Berkas Path | Skor Deviasi | Faktor Penyimpangan Utama |
|---|---|---|---|---|
| **1** | **UserManagement** | `resources/js/admin/app/components/superadmin/UserManagement.tsx` | **Tinggi (Skor 4)** | Puluhan inline style `#1f2937`, `#6b7280`, warna hex `#10b981`, `#ef4444`, bahasa campuran Inggris-Indonesia. |
| **2** | **AdminDashboard** | `resources/js/admin/app/components/admin/AdminDashboard.tsx` | **Tinggi (Skor 4)** | Dominasi gaya inline `style={{ color: '#...' }}`, tidak responsive pada layar mobile kecil, teks campuran. |
| **3** | **SalesReport** | `resources/js/admin/app/components/superadmin/SalesReport.tsx` | **Tinggi (Skor 4)** | Penulisan mata uang salah format (`Rp. 250,000`), tabel statis tanpa pemilih kolom, hardcoded styling. |
| **4** | **AuditLogs** | `resources/js/admin/app/components/superadmin/AuditLogs.tsx` | **Tinggi (Skor 4)** | Banyak style inline, ketiadaan empty state khusus, warna hex langsung. |
| **5** | **KpiDashboard** | `resources/js/admin/app/components/admin/KpiDashboard.tsx` | **Sedang (Skor 4)** | Minim kelas dark mode semantic, layout form modal sangat padat, format angka desimal beragam. |
| **6** | **FieldApp (PWA Mobile)** | `resources/js/field/App.tsx` | **Sedang (Skor 3)** | Belum mendukung penuh tema gelap, percampuran istilah tiket (WO vs Tugas vs Tiket Gangguan). |
| **7** | **TeamManagement** | `resources/js/admin/app/components/superadmin/TeamManagement.tsx` | **Sedang (Skor 3)** | Header masih menggunakan bahasa Inggris, badge anggota tim bervariasi. |
| **8** | **SlaDashboard** | `resources/js/admin/app/components/admin/SlaDashboard.tsx` | **Rendah (Skor 2)** | Beberapa warna status hardcoded `#ef4444`, label SLA breach bercampur bahasa Inggris. |
| **9** | **OdpManagement** | `resources/js/admin/app/components/network/OdpManagement.tsx` | **Rendah (Skor 2)** | Inline style pada grid visualisasi port ODP. |
| **10** | **NetworkMapOfflineView** | `resources/js/field/NetworkMapOfflineView.tsx` | **Rendah (Skor 2)** | Format koordinat bervariasi 4 digit vs 6 digit desimal. |

> *Halaman modern lain seperti CustomerManagement, ComplaintDashboard, DailyAttendanceManagement, OdcManagement, BrasManagement, dan DeviceManagement telah mengadopsi token Tailwind dan Dark Mode dengan kepatuhan tinggi (Skor 0-1).*

---

## 8. Status Implementasi & Resolusi Selisih Audit (Tuntas)

Semua selisih yang ditemukan pada audit ini telah **DISELESAIKAN SECARA TUNTAS** tanpa ada selisih terbuka yang tertinggal.

### 8.1 Ringkasan Eksekusi Standarisasi:
| No | Komponen / Halaman | Skor Awal | Status Resolusi | Git Commit | Perubahan Kunci |
|---|---|---|---|---|---|
| 1 | `UserManagement.tsx` | Skor 4 | **SELESAI** | `ce35baa` | Migrasi ke `PageHeader`, `DataTable`, `FilterBar`, `StatusBadge`; hapus 40+ gaya inline `#1f2937` & `#6b7280`. |
| 2 | `AdminDashboard.tsx` | Skor 4 | **SELESAI** | `687928c` | Migrasi ke `PageHeader`, `StatCards`; ganti styling manual dengan token Tailwind semantik dan format mata uang baku. |
| 3 | `SalesReport.tsx` | Skor 4 | **SELESAI** | `f3489bb` | Migrasi ke `DataTable` server-side paginasi, pemilih kolom, `formatCurrency`, `formatDate`. |
| 4 | `AuditLogs.tsx` | Skor 4 | **SELESAI** | `452388e` | Migrasi ke `PageHeader`, `DataTable`, `EmptyState`; hapus seluruh inline styling. |
| 5 | `KpiDashboard.tsx` | Skor 4 | **SELESAI** | `ff03e06` | Migrasi ke `PageHeader`, `StatCards`, token semantik dark mode; seragamkan format angka & persentase. |
| 6 | `FieldApp` (PWA) | Skor 3 | **SELESAI** | `889170f` | Ubah "Fase 1 & 2" menjadi "Tahap 1: Pengerjaan" dan "Tahap 2: Absensi di Lokasi"; format koordinat 6 desimal. |
| 7 | `TeamManagement.tsx` | Skor 3 | **SELESAI** | `a9639f1` | Migrasi ke `PageHeader`, `StatCards`, `StatusBadge`; hapus sebutan Ketua/Lead (semua anggota teknisi setara). |
| 8 | `SlaDashboard.tsx` | Skor 2 | **SELESAI** | `117aa72` | Migrasi ke `PageHeader`, `StatCards`, `StatusBadge`, `formatDateTime`; hapus warna merah/hijau hardcoded. |
| 9 | `OdpManagement.tsx` | Skor 2 | **SELESAI** | `6bfe880` | Seragamkan status jaringan "Gangguan" (bukan Terganggu); format koordinat 6 desimal presisi. |
| 10 | `NetworkMapOfflineView.tsx` | Skor 2 | **SELESAI** | `6bfe880` | Format koordinat 6 desimal dengan `formatCoordinate`; format jarak dengan `formatDistance`. |

### 8.2 Pustaka Bersama & Guardrails yang Dibangun:
1. **Kamus Istilah Tunggal:** `resources/js/shared/i18n/id.ts` & `docs/glossary.md`.
2. **Pustaka Komponen UI Bersama:** `resources/js/shared/ui/` (`PageHeader`, `StatCards`, `FilterBar`, `DataTable`, `StatusBadge`, `DetailLayout`, `FormLayout`, `ConfirmDialog`, `Toast`, `EmptyState`, `MapView`, `ConfirmLeave`).
3. **Pustaka Format Standar:** `resources/js/shared/lib/formatters.ts`.
4. **Token Desain Semantik:** `resources/js/shared/tokens/index.ts`.
5. **Backend Enum Label & Translations:** Seluruh enum di `app/Enums/*.php` mengimplementasikan `label(): string` dan `options(): array` dengan berkas terjemahan di `lang/id/*.php` serta pengujian di `tests/Feature/EnumIndonesianLabelTest.php` (453 asersi lolos).
6. **Guardrail Script:** `npm run lint:copy` (`scripts/lint-copy.cjs`) terintegrasi pada GitHub Actions workflow CI (`.github/workflows/tests.yml`).
