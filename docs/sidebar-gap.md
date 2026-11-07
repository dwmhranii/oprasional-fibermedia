# Laporan Audit Gap & Hasil Rekonstruksi Sidebar Admin (14 Menu Satu Pintu)

> **Dokumen:** `docs/sidebar-gap.md`  
> **Status:** SELESAI & TERVERIFIKASI  
> **Tanggal Pembaruan:** 26 Oktober 2026  
> **Target Acuan:** 14 Menu Satu Pintu Superadmin (Acuan Revisi 25 Okt 2026), Rute Tanpa Path Role, Tab dan Aksi Melekat, Registri Berbasis Modul, Tree Dinamis via API, Badge Reaktif, Command Palette Ctrl+K, Mobile Drawer, Aksesibilitas Penuh, dan Redirection Rute Lama.

---

## 1. Ringkasan Eksekutif & Prinsip Satu Pintu

Sesuai penetapan arsitektur 25 Oktober 2026, struktur sidebar Superadmin disederhanakan dari format 23 menu lama menjadi tepat **14 Menu Satu Pintu**:
1. **Satu Pintu Entitas:** Seluruh fungsi turunan melekat sebagai **tab atau aksi di kepala halaman entitas terkait**, bukan menu terpisah:
   - Aksi Impor / Ekspor KMZ menjadi tombol aksi di halaman OLT, ODC, ODP & Kabel (`/network/odp?action=import-kmz`).
   - BRAS dan Persetujuan Perubahan menjadi tab di halaman OLT, ODC, ODP & Kabel (`/network/bras`, `/network/approvals`).
   - Rekap Absensi dan Titik Kantor menjadi tab di halaman Absensi (`/attendance/recap`, `/attendance/offices`).
   - Perangkat menjadi tab di halaman Pengguna & Hak Akses (`/access/devices`).
   - Rating Pelanggan dan Pengaturan KPI menjadi tab di halaman KPI (`/kpi/ratings`, `/kpi/settings`).
   - Pengaturan Dispatch, Peta, dan Log Aktivitas menjadi tab di halaman Pengaturan Sistem (`/settings/dispatch`, `/settings/map`, `/settings/activity-log`).
   - Pengajuan Pelanggan menjadi tab di halaman Pelanggan (`/customers/submissions`).
2. **Rute Tanpa Path Role:** URL tidak memuat kata `superadmin`, `admin`, `teknisi`, atau `sales`. Akses dikendalikan oleh izin (*permissions*).
3. **PWA Lapangan di `/pwa/*`:** Menu staf lapangan hanya berada di domain utama jalur `/pwa/`.

---

## 2. Pemetaan Lengkap Menu Lama ke 14 Menu Baru

| # | Menu Lama | Grup Lama | Menu Baru (14 Menu) | Grup Baru | Rute Utama & Tab | Izin Pelindung | Status & Transformasi |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Dashboard | (tanpa grup) | **Dashboard** | *(tanpa grup)* | `/dashboard` | `dashboard.view` | **Dipertahankan**. Rute `/admin` dan `/superadmin/dashboard` dialihkan ke `/dashboard`. |
| **2** | Kelola Pelanggan | Pelanggan | **Pelanggan** | Pelanggan | `/customers`<br>• Tab Daftar: `/customers`<br>• Tab Pengajuan: `/customers/submissions` | `customers.view`<br>`submissions.view` | **Satu Pintu**. Menggabungkan Kelola Pelanggan dan Pengajuan Pelanggan. Badge: `pending_submissions`. |
| - | Pengajuan Pelanggan | Pelanggan | *(Menjadi Tab)* | Pelanggan | `/customers/submissions` | `submissions.view` | **Dipindah ke Tab**. Rute `/submissions` dialihkan ke `/customers/submissions`. |
| **3** | Tiket Pengaduan | Operasional | **Tiket Pengaduan** | Operasional | `/complaints`<br>Detail: `/complaints/:id` | `complaints.view` | **Dipertahankan**. Badge: `complaints_action_needed`. |
| **4** | Pemasangan (PSB) | Operasional | **Pemasangan (PSB)** | Operasional | `/psb`<br>Detail: `/psb/:id` | `psb.view` | **Dipertahankan**. Badge: `psb_action_needed`. |
| **5** | Work Order | Operasional | **Work Order** | Operasional | `/work-orders`<br>Detail: `/work-orders/:id` | `workorders.view` | **Dipertahankan**. Halaman pantau pelaksanaan teknisi. Badge: `workorders_review`. |
| **6** | Peta Jaringan | Jaringan | **Peta Jaringan** | Jaringan | `/network/map` | `network.view` | **Dipertahankan**. Monitoring visual MapLibre & PMTiles. |
| **7** | OLT/ODC/ODP/Kabel | Jaringan | **OLT, ODC, ODP & Kabel** | Jaringan | `/network/odp`<br>• Tab OLT: `/network/olt`<br>• Tab ODC: `/network/odc`<br>• Tab ODP: `/network/odp`<br>• Tab Kabel: `/network/cable`<br>• Tab BRAS: `/network/bras`<br>• Tab Persetujuan: `/network/approvals` | `network.view`<br>`network.manage`<br>`network.approve` | **Satu Pintu**. BRAS dan Persetujuan Perubahan menjadi tab. Impor/Ekspor KMZ menjadi aksi kepala halaman (`/network/odp?action=import-kmz`). Badge: `network_approvals`. |
| - | BRAS | Jaringan | *(Menjadi Tab)* | Jaringan | `/network/bras` | `network.view` | **Dipindah ke Tab** pada hub OLT, ODC, ODP & Kabel. |
| - | Persetujuan Perubahan | Jaringan | *(Menjadi Tab)* | Jaringan | `/network/approvals` | `network.approve` | **Dipindah ke Tab** pada hub OLT, ODC, ODP & Kabel. Badge dialihkan ke induk. |
| - | Impor / Ekspor KMZ | Jaringan | *(Menjadi Aksi)* | Jaringan | `/network/odp?action=import-kmz` | `network.manage` | **Dipindah ke Aksi** tombol di kepala halaman ODP. Rute `/network/kmz` dialihkan ke `/network/odp?action=import-kmz`. |
| **8** | Absensi Harian | Tim & Absensi | **Absensi** | Tim & Absensi | `/attendance/today`<br>• Tab Hari Ini: `/attendance/today`<br>• Tab Rekap: `/attendance/recap`<br>• Tab Titik Kantor: `/attendance/offices` | `attendance.view`<br>`settings.manage` | **Satu Pintu**. Menggabungkan Absensi Harian, Rekap, dan Titik Kantor dalam satu hub. |
| - | Rekap Absensi | Tim & Absensi | *(Menjadi Tab)* | Tim & Absensi | `/attendance/recap` | `attendance.view` | **Dipindah ke Tab** pada hub Absensi. |
| - | Titik Kantor | Tim & Absensi | *(Menjadi Tab)* | Tim & Absensi | `/attendance/offices` | `settings.manage` | **Dipindah ke Tab** pada hub Absensi. Rute `/office-locations` dialihkan ke `/attendance/offices`. |
| **9** | Tim dan Anggota | Tim & Absensi | **Tim dan Anggota** | Tim & Absensi | `/teams` | `teams.view` | **Dipertahankan**. Manajemen regu teknisi dan sales. |
| - | Perangkat | Tim & Absensi | *(Menjadi Tab)* | Pengaturan | `/access/devices` | `devices.view` | **Dipindah ke Tab** pada hub Pengguna & Hak Akses. Rute `/devices` dialihkan ke `/access/devices`. |
| **10** | Dasbor KPI | KPI | **KPI** | KPI | `/kpi`<br>• Tab Dasbor: `/kpi`<br>• Tab Rating: `/kpi/ratings`<br>• Tab Pengaturan: `/kpi/settings` | `kpi.view`<br>`kpi.manage` | **Satu Pintu**. Menggabungkan Dasbor KPI, Rating Pelanggan, dan Pengaturan KPI. |
| - | Rating Pelanggan | KPI | *(Menjadi Tab)* | KPI | `/kpi/ratings` | `kpi.view` | **Dipindah ke Tab** pada hub KPI. |
| - | Pengaturan KPI | KPI | *(Menjadi Tab)* | KPI | `/kpi/settings` | `kpi.manage` | **Dipindah ke Tab** pada hub KPI. |
| **11** | Katalog & Promo | Produk & Penjualan | **Katalog & Promo** | Produk & Penjualan | `/catalog`<br>• Tab Paket: `/catalog`<br>• Tab Promo: `/catalog?tab=promo` | `catalog.view` | **Dipertahankan**. Rute `/packages` dan `/promos` dialihkan ke `/catalog`. |
| **12** | Laporan Sales & Revenue | Produk & Penjualan | **Laporan Sales & Revenue** | Produk & Penjualan | `/reports` | `reports.view` | **Dipertahankan**. Rute `/sales-report` dan `/analytics` dialihkan ke `/reports`. |
| **13** | Pengguna & Role | Pengaturan | **Pengguna & Hak Akses** | Pengaturan | `/access/users`<br>• Tab Pengguna: `/access/users`<br>• Tab Role: `/access/roles`<br>• Tab Matriks: `/access/matrix`<br>• Tab Perangkat: `/access/devices`<br>• Tab Riwayat: `/access/history` | `users.view`<br>`access.manage`<br>`devices.view`<br>`audit.view` | **Satu Pintu**. Hub terpadu wewenang sistem. Rute `/users`, `/admin/hak-akses`, `/devices` dialihkan ke hub ini. |
| - | Hak Akses (Lama) | Pengaturan | *(Menjadi Tab)* | Pengaturan | `/access/roles` & `/access/matrix` | `access.manage` | **Dipindah ke Tab** pada hub Pengguna & Hak Akses. |
| **14** | Pengaturan Dispatch | Pengaturan | **Pengaturan Sistem** | Pengaturan | `/settings/dispatch`<br>• Tab Dispatch: `/settings/dispatch`<br>• Tab Peta: `/settings/map`<br>• Tab Log Aktivitas: `/settings/activity-log` | `settings.manage`<br>`audit.view` | **Satu Pintu**. Menggabungkan pengaturan dispatch, peta, dan audit log sistem. |
| - | Log Aktivitas | Pengaturan | *(Menjadi Tab)* | Pengaturan | `/settings/activity-log` | `audit.view` | **Dipindah ke Tab** pada hub Pengaturan Sistem. Rute `/activity-log` dialihkan ke `/settings/activity-log`. |
| - | Antrean Dispatch | Operasional | *(Dihapus)* | - | - | - | **DIHAPUS**: Menjadi tab status ("Belum Ditugaskan") pada daftar tiket. |
| - | Tinjau Bukti | Operasional | *(Dihapus)* | - | - | - | **DIHAPUS**: Menjadi tab status ("Perlu Ditinjau") pada daftar tiket. |
| - | SPK | - | *(Dihapus)* | - | - | - | **TIDAK ADA SPK**: Istilah terlarang sesuai kamus baku `AGENTS.md`. |

---

## 3. Struktur Registri Modul Backend (`app/Modules/<Modul>/menu.php`)

Registri menu backend membaca berkas per modul dan memetakan tepat 14 menu:

1. **`app/Modules/Auth/menu.php`**:
   - `Dashboard` (`/dashboard`, order 1, tanpa grup)
   - `Pengguna & Hak Akses` (`/access/users`, order 1, grup `Pengaturan`)
2. **`app/Modules/Customer/menu.php`**:
   - `Pelanggan` (`/customers`, order 1, grup `Pelanggan`, badge `pending_submissions`)
3. **`app/Modules/Complaint/menu.php`**:
   - `Tiket Pengaduan` (`/complaints`, order 1, grup `Operasional`, badge `complaints_action_needed`)
4. **`app/Modules/Psb/menu.php`**:
   - `Pemasangan (PSB)` (`/psb`, order 2, grup `Operasional`, badge `psb_action_needed`)
   - `Katalog & Promo` (`/catalog`, order 1, grup `Produk & Penjualan`)
5. **`app/Modules/Dispatch/menu.php`**:
   - `Work Order` (`/work-orders`, order 3, grup `Operasional`, badge `workorders_review`)
   - `Pengaturan Sistem` (`/settings/dispatch`, order 2, grup `Pengaturan`)
6. **`app/Modules/Network/menu.php`**:
   - `Peta Jaringan` (`/network/map`, order 1, grup `Jaringan`)
   - `OLT, ODC, ODP & Kabel` (`/network/odp`, order 2, grup `Jaringan`, badge `network_approvals`)
7. **`app/Modules/Attendance/menu.php`**:
   - `Absensi` (`/attendance/today`, order 1, grup `Tim & Absensi`)
   - `Tim dan Anggota` (`/teams`, order 2, grup `Tim & Absensi`)
8. **`app/Modules/Kpi/menu.php`**:
   - `KPI` (`/kpi`, order 1, grup `KPI`)
   - `Laporan Sales & Revenue` (`/reports`, order 2, grup `Produk & Penjualan`)

---

## 4. Perilaku Tampilan & Fitur Sidebar Terpadu

1. **Penyorotan Menu Aktif & Penanganan Tab Tunggal (`isItemActive`):**
   - Berada di `DashboardLayout.tsx`.
   - Menggunakan deteksi cerdas sub-path: saat pengguna membuka tab anak (misalnya `/network/bras`, `/attendance/recap`, `/access/matrix`, `/settings/activity-log`, `/customers/submissions`), menu induk di sidebar **tetap tersorot aktif** (`aria-current="page"`) dan grup akordeon yang menaunginya **otomatis terbuka**.
2. **Mode Diperkecil (*Collapsed* / "Perkecil Menu"):**
   - Menampilkan ikon semantik berukuran seragam.
   - Angka badge bertransformasi menjadi dot indikator dengan nomor kecil (`w-3.5 h-3.5`).
   - Kartu "Peran Saat Ini" beralih ke bentuk ringkas (avatar inisial + indikator titik hijau aktif).
   - Status tersimpan persisten di `localStorage` (`fm-admin:sidebar_collapsed`).
3. **Badge Reaktif (`GET /api/menu/badges`):**
   - Di-cache selama 30 detik di backend dan dapat di-refresh instan lewat event broadcast.
   - Badge angka sama persis dengan jumlah baris yang terbuka saat menu diklik:
     - `pending_submissions`: Pengajuan status `pending` + `pending_validation`.
     - `complaints_action_needed`: Pengaduan `unassigned` + `escalated_to_admin` + `phase_1_completed`.
     - `psb_action_needed`: PSB `unassigned` + `escalated_to_admin` + `phase_1_submitted`.
     - `workorders_review`: Tiket perlu ditinjau (`needs_review`).
     - `network_approvals`: Titik ODP belum disetujui + usulan kabel (`proposed`).
   - Angka di atas 99 diformat menjadi `"99+"`.
   - Disertai teks tersembunyi ramah pembaca layar (`<span className="sr-only">tindakan diperlukan</span>`).
4. **Command Palette Cepat (Ctrl+K):**
   - Komponen `CommandPalette.tsx` menyajikan pencarian instan:
     - Seluruh menu yang dapat diakses pengguna.
     - Pencarian data pelanggan secara langsung (`/customers?search=...`).
     - Pencarian tiket pengaduan (`/complaints?search=...`).
   - Navigasi keyboard penuh (`↑` `↓` `Enter` `ESC`).
5. **Mobile Drawer:**
   - Navigasi responsif layar kecil (laci bergerak masuk dari kiri dengan backdrop semi-transparan).
   - Menutup otomatis ketika rute dipilih.

---

## 5. Bukti Checklist Pra-Selesai (Pre-Completion Checklist)

1. `npm run lint:copy` -> **HIJAU** (0 pelanggaran istilah terlarang, mematuhi Kamus Baku).
2. `npm run types:check` -> **HIJAU** (`TIDAK ADA DRIFT (SINKRON)`).
3. `php artisan test --filter=MenuTreeAndBadgesTest` -> **LULUS** (4 passed, 32 assertions):
   - Superadmin menerima tepat 14 menu satu pintu dalam urutan presisi.
   - Admin CS hanya melihat 3 menu inti yang diizinkan (Dashboard, Pelanggan, Tiket Pengaduan).
   - Endpoint badge mengembalikan angka tindakan yang akurat.
   - Cache badge terhapus dengan benar saat terjadi pembaruan data.
4. `php artisan test --filter=EnumIndonesianLabelTest` -> **LULUS** (2 passed, 453 assertions).
5. `npm run build` -> **SUKSES** (Vite build produksi selesai tanpa galat).
6. **Selisih skema vs tampilan: 0** (Semua rute lama dialihkan ke rute baru tanpa 404).

---

## 6. Status Modul yang Menunggu Fase Berikutnya (Phase X)

- **Impor / Ekspor KMZ:** Tombol aksi terpasang di kepala halaman ODP (`/network/odp?action=import-kmz`). Pemrosesan file biner geospasial KMZ/KML ditandai siap diintegrasikan pada Fase N (Perluasan Jaringan).
- **Tab OLT:** Menampilkan status tab informatif di `/network/olt` menunggu modul integrasi perangkat fisik OLT.
