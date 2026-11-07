# AUDIT RUTE TANPA AWALAN PERAN & JALUR /PWA (ROLE-AGNOSTIC ROUTE & PWA AUDIT)
**Dokumen Referensi Perubahan Arsitektur Rute, Satu Pintu, dan Jalur /pwa Fibermedia-Ops**  
*Tanggal: 25 Oktober 2026 (Revisi Terpadu R1)*

---

## 1. PENDAHULUAN & PRINSIP UTAMA ARSITEKTUR

Pembaruan ini menegakkan prinsip arsitektur baku:
1. **Rute Berbasis Sumber Daya Bersih (*Resource-Based*)**:
   - Seluruh nama role (`superadmin`, `admin`, `teknisi`, `sales`) **dihapus** dari URL di Frontend Admin, Frontend PWA, dan API.
   - Hak akses diatur sepenuhnya oleh **IZIN (*Permission*)**, bukan oleh awalan atau segmen path role.
2. **Jalur Tunggal Aplikasi Lapangan (`/pwa`) pada Origin yang Sama**:
   - PWA lapangan dilayani secara eksklusif di jalur `/pwa/*`.
   - Tidak ada subdomain (`admin.localhost` atau `app.localhost` dihapus; variabel `ADMIN_HOST` dan `FIELD_HOST` ditiadakan).
   - Akses ke `/pwa` diatur oleh izin khusus `pwa.access` ("Buka aplikasi lapangan").
3. **Konsep Satu Pintu (14 Menu Utama)**:
   - Fitur turunan melekat sebagai **tab atau aksi di kepala halaman entitas terkait**, bukan menu terpisah.
   - Sidebar Superadmin terdiri atas tepat **14 menu**. Admin melihat 3 menu inti: Dashboard, Pelanggan (tab Daftar dan Pengajuan), dan Tiket Pengaduan.

---

## 2. ACUAN STRUKTUR: 14 MENU SATU PINTU & PEMETAAN TAB FE ADMIN

| # | Grup | Menu | Tab & Rute Alamat | Izin Pelindung | Konsumen / Aksi Terintegrasi |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | *(tanpa grup)* | **Dashboard** | `/dashboard` | `dashboard.view` | Dashboard operasional adaptif (lengkap vs ringkas) |
| **2** | Pelanggan | **Pelanggan** | - Daftar: `/customers`<br>- Pengajuan: `/customers/submissions`<br>- Detail: `/customers/submissions/:id` | `customers.view`<br>`submissions.view` | Validasi PSB, penugasan, ekspor/impor pelanggan. Badge: Pengajuan PSB menunggu validasi |
| **3** | Operasional | **Tiket Pengaduan** | `/complaints`<br>Detail: `/complaints/:id` | `complaints.view` atau `complaints.view_own` | Filter status: Semua, Belum Ditugaskan, Perlu Ditinjau, Massal. Badge: Pengaduan butuh tindakan |
| **4** | Operasional | **Pemasangan (PSB)** | `/psb`<br>Detail: `/psb/:id` | `psb.view` | Filter status: Semua, Belum Ditugaskan, Perlu Ditinjau. Badge: PSB butuh tindakan |
| **5** | Operasional | **Work Order** | `/work-orders`<br>Detail: `/work-orders/:id` | `workorders.view` | Halaman pantau pelaksanaan teknisi terpadu. Badge: Tiket perlu ditinjau |
| **6** | Jaringan | **Peta Jaringan** | `/network/map` | `network.view` | Peta live monitoring MapLibre & PMTiles |
| **7** | Jaringan | **OLT, ODC, ODP & Kabel** | - OLT: `/network/olt`<br>- ODC: `/network/odc`<br>- ODP: `/network/odp`<br>- Kabel: `/network/cable`<br>- BRAS: `/network/bras`<br>- Persetujuan: `/network/approvals`<br>Detail: `/network/:tipe/:id` | `network.view`<br>`network.manage` (ubah & impor KMZ)<br>`network.approve` (tab persetujuan)<br>`bras.manage` (ubah BRAS) | **Aksi Kepala Halaman**: Tombol "Impor KMZ" dan "Ekspor KMZ".<br>Rute lama `/network/kmz` dialihkan ke `/network/odp?action=import-kmz`.<br>Badge: Perubahan jaringan menunggu persetujuan |
| **8** | Absensi & Tim | **Absensi** | - Hari Ini: `/attendance/today`<br>- Rekap: `/attendance/recap`<br>- Titik Kantor: `/attendance/offices` | `attendance.view`<br>`settings.manage` (Titik Kantor) | Absensi harian, rekapitulasi kehadiran, dan radius geofence kantor |
| **9** | Absensi & Tim | **Tim dan Anggota** | `/teams` | `teams.view` | Manajemen regu teknisi, sales, dan kesiapan regu |
| **10** | KPI | **KPI** | - Dasbor: `/kpi`<br>- Rating: `/kpi/ratings`<br>- Pengaturan: `/kpi/settings` | `kpi.view`<br>`kpi.manage` (Pengaturan) | Monitoring target, penilaian pelanggan, dan bobot SLA/KPI |
| **11** | Produk & Penjualan | **Katalog & Promo** | `/catalog` | `catalog.view` | Daftar paket internet dan kode promo |
| **12** | Produk & Penjualan | **Laporan Sales & Revenue** | `/reports` | `reports.view` | Rekapitulasi akuisisi sales dan performa omzet |
| **13** | Pengaturan | **Pengguna & Hak Akses** | - Pengguna: `/access/users`<br>- Role: `/access/roles`<br>- Matriks Izin: `/access/matrix`<br>- Perangkat: `/access/devices`<br>- Riwayat: `/access/history` | `users.view`<br>`access.manage`<br>`devices.view` | Kelola akun, matriks izin role, persetujuan perangkat lapangan, dan log audit akses |
| **14** | Pengaturan | **Pengaturan Sistem** | - Dispatch: `/settings/dispatch`<br>- Peta: `/settings/map`<br>- Log Aktivitas: `/settings/activity-log` | `settings.manage`<br>`audit.view` | Konfigurasi antrean putar otomatis, penyedia peta/rute, dan jejak audit aktivitas |

---

## 3. AUDIT RUTE FRONTEND PWA LAPANGAN (`/pwa/*`)

PWA lapangan disajikan khusus pada awalan path `/pwa/`:

| Rute PWA | Padanan Rute Lama (Host App) | Izin Pelindung | Keterangan & Konsumen |
| :--- | :--- | :--- | :--- |
| `/pwa` | `/` | `pwa.access` | Beranda PWA, otomatis mengarahkan ke `/pwa/work-orders` |
| `/pwa/login` | `/login` | Publik | Halaman login bertema PWA lapangan |
| `/pwa/work-orders` | `/work-orders` (atau `/teknisi/tasks`) | `pwa.access`, `tasks.view_assigned` | Daftar penugasan kerja regu (PSB & Gangguan) |
| `/pwa/work-orders/:id` | `/work-orders/:id` | `pwa.access`, `tasks.view_assigned` | Pelaksanaan tiket lapangan (Tahap 1, Tahap 2, checklist) |
| `/pwa/attendance` | `/attendance` | `pwa.access`, `attendance.self` | Absensi swafoto & koordinat GPS teknisi/sales/admin |
| `/pwa/map` | `/map` | `pwa.access`, `network.view` | Peta offline PMTiles & pencarian ODP terdekat |
| `/pwa/submissions` | `/submissions` | `pwa.access`, `submissions.view_own` | Riwayat pengajuan pemasangan baru oleh sales |
| `/pwa/submissions/new` | `/submissions/new` | `pwa.access`, `submissions.create` | Formulir survei & pengajuan PSB baru |
| `/pwa/outbox` | `/outbox` | `pwa.access` | Antrean sinkronisasi offline (IndexedDB `fm_pwa`) |
| `/pwa/me` | `/me` | `pwa.access` | Profil teknisi/sales, status kesiapan tim, keluar |

---

## 4. AUDIT PENYAJIAN MULTI-APLIKASI DALAM SATU ORIGIN

Karena Admin SPA dan Field PWA berbagi satu origin (`http://localhost:8000` atau domain produksi), audit isolasi lingkungan adalah sebagai berikut:

| Aspek | Admin SPA (`/`) | Field PWA (`/pwa`) | Mitigasi Tabrakan & Kebocoran |
| :--- | :--- | :--- | :--- |
| **Penyajian Laravel Web** | `Route::get('/{any?}')` menyajikan `index.html` (mengecualikan `/pwa/*`, `/api/*`, `/docs/*`, `/storage/*`) | `Route::get('/pwa{any?}')` menyajikan `field.html` | Terpisah bersih via regex rute `routes/web.php` |
| **Vite Entry & Base** | Base `'/'`, entry `index.html` | Base `'/pwa/'`, entry `field.html` | Menggunakan multi-input Rollup dengan path bersih |
| **Manifest Web** | Tidak mendaftarkan manifest | `/pwa/manifest.webmanifest`<br>`start_url: '/pwa/'`<br>`scope: '/pwa/'` | PWA hanya di-install dari `/pwa/` |
| **Service Worker** | **TIDAK mendaftarkan SW**.<br>Saat startup, unregister semua SW lama di scope `'/'` dan bersihkan cache lama. | Mendaftarkan `/pwa/sw.js` dengan scope strictly `'/pwa/'`. | Admin bebas dari intervensi cache SW luring. |
| **Cache Storage** | Menghapus cache non-pwa | Berawalan `fm-pwa-*` | Tidak ada tabrakan cache aset |
| **Basis Data IndexedDB** | Menggunakan penyimpanan memori / React Query | Berbasis Dexie bernama `fm_pwa` | Admin tidak pernah membuka DB PWA |
| **Kunci LocalStorage** | Seluruh kunci berawalan `fm-admin:*`<br>(mis: `fm-admin:auth_token`, `fm-admin:theme`) | Seluruh kunci berawalan `fm-pwa:*`<br>(mis: `fm-pwa:auth_token`, `fm-pwa:user`, `fm-pwa:device_uuid`) | Ditegakkan aturan lint dan isolasi prefix |
| **Keamanan CSP** | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...` | Menolak script inline pihak ketiga di seluruh origin |

---

## 5. AUDIT ALIRAN LOGIN & PENGALIHAN ROOT (`/`)

1. **Akses ke Akar Domain (`/`)**:
   - Jika belum login: Arahkan ke `/login`.
   - Jika sudah login:
     - Jika memiliki izin `dashboard.view` (atau `is_superadmin`): Arahkan ke `/dashboard`.
     - Jika hanya memiliki izin `pwa.access` (tanpa `dashboard.view`, misal Sales/Teknisi murni): Arahkan ke `/pwa`.
     - Jika tidak memiliki keduanya: Tampilkan halaman `403 Akses Ditolak`.

2. **Login di `/login`**:
   - Setelah sukses login, jika ada state `from`, arahkan ke halaman tujuan semula.
   - Jika tidak ada `from`, gunakan logika pengalihan di atas (`/dashboard` bila punya izin, atau `/pwa` bila hanya punya `pwa.access`).

3. **Login di `/pwa/login`**:
   - Dikhususkan untuk tampilan mobile PWA.
   - Setelah sukses login, arahkan ke `/pwa` (bila memiliki `pwa.access`). Bila tidak memiliki `pwa.access`, tampilkan peringatan 403.

---

## 6. AUDIT KONSUMEN & TITIK PEMBANGUNAN URL

Seluruh tempat pembangun URL di sistem telah diaudit:
1. **Notifikasi Push & Pesan WhatsApp**:
   - Tiket lapangan: Diarahkan ke `/pwa/work-orders/:id`.
   - Penugasan & validasi admin: Diarahkan ke `/complaints/:id` atau `/psb/:id` atau `/customers/submissions/:id`.
2. **Tombol "Buka Aplikasi Lapangan" di Admin**:
   - Mengarahkan admin (misal untuk absensi harian) langsung ke `/pwa`.
3. **Ekspor & Unduhan**:
   - Menggunakan endpoint `/api/customers/export`, `/api/reports/submissions/excel`, dll.
