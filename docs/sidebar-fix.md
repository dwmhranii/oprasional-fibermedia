# Laporan Perbaikan Sidebar Admin & Optimasi Tata Letak Superadmin

> **Dokumen:** `docs/sidebar-fix.md`  
> **Status:** SELESAI & TERVERIFIKASI  
> **Tanggal Selesai:** 2026-10-25 19:05:00 WIB  
> **Tujuan:** Memperbaiki sidebar admin agar superadmin langsung melihat semua modul tanpa terpotong, mendukung mode "Segera" (upcoming module phase), akordeon responsif di layar 1366x768 & 1920x1080, serta penyatuan rute dashboard.

---

## 1. LANGKAH 1 — DIAGNOSIS

### a. Asal Daftar Menu & Mekanisme Penyaringan Izin vs Role
- **Asal Daftar Menu:**
  - Di Frontend: [`DashboardLayout.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/layout/DashboardLayout.tsx#L165-L171) memanggil API dinamis `GET /api/menu` melalui React Query (`['dynamicMenu']`). Frontend tidak menulis konstanta daftar menu sendiri.
  - Di Backend: `routes/api.php` mengarahkan rute `/menu` ke `App\Http\Controllers\Api\MenuController::index()`, yang mendelegasikan ke [`app/Services/MenuService.php`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/app/Services/MenuService.php#L24-L79).
  - Sumber Konfigurasi: `MenuService` membaca secara modular berkas `app/Modules/<Modul>/menu.php` dari 8 modul yang ada (`Auth`, `Customer`, `Complaint`, `Psb`, `Dispatch`, `Network`, `Attendance`, `Kpi`).
- **Penyaringan Role vs Izin:**
  - Menu **tidak disaring per nama role** di frontend.
  - Di backend (`MenuService.php` baris 26 dan 84-95), pemeriksaan dilakukan berbasis **izin Spatie** (`$user->hasPermissionTo(...) || $user->can(...)`).
  - **Superadmin Bypass:** Pada baris 26 & 86:
    ```php
    $isSuperadmin = $user->hasRole('Superadmin') || $user->hasRole('superadmin');
    if ($isSuperadmin || empty($permission)) {
        return true;
    }
    ```
    Superadmin memiliki izin bypass penuh sehingga lolos seluruh filter izin.
- **Penyembunyian karena Rute / RoleRoute:**
  - Di [`App.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/App.tsx), komponen `RoleRoute` memvalidasi role. Casing nama role ('superadmin' vs 'Superadmin') kini dinormalisasi (`user.role?.toLowerCase() === 'superadmin'`).
  - Sebelumnya terdapat pemisahan rute `/superadmin/dashboard` dan `/dashboard` di `DashboardSwitcher`. Keduanya kini telah dialihkan ke `/admin`.

---

### b. Menu yang Ada di Kode tetapi Tidak Tampil untuk Superadmin
1. **Impor / Ekspor KMZ (`/admin/network/kmz`):**
   - *Penyebab:* Modul KMZ geospasial belum selesai dibangun (Fase 4). Pada implementasi sebelumnya, menu ini dilarang muncul ("menu yang modulnya belum ada tidak ditampilkan").
   - *Solusi Baru:* Menu yang modulnya belum selesai tetap tampil untuk Superadmin dalam keadaan **"Segera"** (teks pudar, kursor `not-allowed`, label kecil "Segera", dan tooltip "Tersedia setelah Fase 4"). Pengguna non-superadmin tidak melihat menu ini.
2. **Menu Lama yang Memiliki Halaman di Codebase namun Tidak Masuk di 23 Menu Utama:**
   - `/admin/analytics` ([`AnalyticsDashboard.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/admin/AnalyticsDashboard.tsx)) -> dipetakan sebagai tab di **Dasbor KPI** (`/admin/kpi`).
   - `/admin/sla-breaches` ([`SlaDashboard.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/admin/SlaDashboard.tsx)) -> dipetakan sebagai tab di **Dasbor KPI** (`/admin/kpi`).
   - `/admin/promos` ([`PromoManagement.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/admin/PromoManagement.tsx)) -> dipetakan sebagai tab di **Katalog & Promo** (`/admin/packages`).
   - `/superadmin/roles` ([`RoleManagement.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/superadmin/RoleManagement.tsx)) -> dipetakan sebagai tab di **Pengguna & Role** (`/admin/users`).
   - `/maintenance` ([`MaintenanceManagement.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/admin/MaintenanceManagement.tsx)) -> dipetakan ke Pengaturan Sistem.
   - Rute lama tetap memiliki alias pengalihan (*redirect*) tanpa 404.

---

### c. Analisis Penyebab Area Menu Terpotong
1. **Ketiadaan `min-h-0` pada Flex Container Tengah:**
   - Di `DashboardLayout.tsx`: kontainer navigasi dibungkus oleh item `flex-1`. Secara default, flex item memiliki `min-height: auto`. Tanpa deklarasi `min-h-0`, elemen anak yang tinggi menolak menyusut, sehingga `overflow-y-auto` diabaikan dan bagian bawah terpotong. Penambahan `min-h-0` telah dipasang.
2. **Ruang yang Dihabiskan Bagian Kaki (Footer):**
   - Kartu "Peran Saat Ini" sebelumnya memakan tinggi ~110 px dan tombol "Perkecil Menu" ~36 px (total footer ~146 px). Ditambah header 64 px, ruang tersisa pada laptop 1366x768 (viewport browser ~630 px) hanya tersisa ~420 px.
   - *Solusi Baru:* Tombol "Perkecil Menu" dipindahkan ke **Kepala Sidebar** di samping logo. Kartu "Peran Saat Ini" dirancang **ringkas satu baris** (avatar inisial, nama, badge peran, titik status aktif) setinggi ~44 px.
3. **Kerapatan Menu & Perilaku Akordeon:**
   - Tinggi baris menu dirapatkan menjadi 36 px (`h-9 py-1 px-2.5`).
   - Akordeon otomatis: hanya grup aktif yang terbuka secara default; semua 8 header grup selalu tampak di layar; disediakan tombol "Buka semua" dan "Tutup semua".
   - Total tinggi saat 1 grup aktif terbuka adalah ~352 px, muat sempurna di dalam ruang pandang 556 px tanpa perlu menggulir pada layar 1366x768 maupun 1920x1080.

---

### d. Status & Penyatuan Rute Dashboard
- **Perbedaan `/superadmin/dashboard` vs `/admin/dashboard`:**
  - Sebelumnya: `/superadmin/dashboard` menampilkan metrik sistem teknis (pengguna, peran, log audit).
  - Sekarang: Keduanya diarahkan ke `UnifiedSuperadminDashboard` di rute utama **`/admin`**.
- **Rencana Penyatuan Rute:**
  - Satu rute utama terpadu: **`/admin`** (izin: `dashboard.view`).
  - Seluruh rute lama (`/dashboard`, `/superadmin/dashboard`) dialihkan (*redirect*) ke `/admin`.
  - Metrik "Pusat Kontrol Sistem" lama dipindahkan ke halaman **Pengguna & Role** (`/admin/users`) dan **Log Aktivitas** (`/admin/activity-log`).

---

## 2. ATURAN TAMPIL SUPERADMIN (LANGKAH 2)

1. **Superadmin Bypass:**
   - Superadmin memiliki semua izin dan melihat semua 8 grup dan 24 menu.
2. **Menu "Segera" (Upcoming Feature):**
   - Atribut `is_available` dan `available_from_phase` diterapkan pada registri menu backend `app/Modules/*/menu.php` dan `MenuService.php`.
   - Menu berstatus `is_available: false`:
     - Tampil dengan teks pudar (`opacity-60`),
     - Kursor `cursor-not-allowed`,
     - Badge kecil "Segera" bertema amber semantik,
     - Tooltip: *"Tersedia setelah <nama fase>"*,
     - Saat diklik tidak berpindah halaman dan memunculkan toast informasi.
   - Pengguna non-Superadmin tidak menerima dan tidak melihat menu "Segera".
   - Disediakan sakelar **"Segera"** (bawaan hidup) di bilah kontrol sidebar Superadmin untuk menyembunyikan/menampilkannya.
3. **Grup & Urutan:**
   - Sesuai persis spesifikasi:
     1. `(tanpa grup)`: Dashboard (`/admin`)
     2. `Pelanggan`: Kelola Pelanggan (`/admin/customers`), Pengajuan Pelanggan (`/admin/submissions`)
     3. `Operasional`: Tiket Pengaduan (`/admin/complaints`), Pemasangan (PSB) (`/admin/psb`), Work Order (`/admin/work-orders`)
     4. `Jaringan`: Peta Jaringan (`/admin/network/map`), OLT, ODC, ODP & Kabel (`/admin/network/nodes`), BRAS (`/admin/network/bras`), Persetujuan Perubahan (`/admin/network/approvals`), Impor / Ekspor KMZ (`/admin/network/kmz` - *Segera / Fase 4*)
     5. `Tim & Absensi`: Absensi Harian (`/admin/attendance/today`), Rekap Absensi (`/admin/attendance/recap`), Tim dan Anggota (`/admin/teams`), Perangkat (`/admin/devices`), Titik Kantor (`/admin/office-locations`)
     6. `KPI`: Dasbor KPI (`/admin/kpi`), Rating Pelanggan (`/admin/kpi/ratings`), Pengaturan KPI (`/admin/kpi/settings`)
     7. `Produk & Penjualan`: Katalog & Promo (`/admin/packages`), Laporan Sales & Revenue (`/admin/sales-report`)
     8. `Pengaturan`: Pengaturan Dispatch (`/admin/settings/dispatch`), Pengguna & Role (`/admin/users`), Log Aktivitas (`/admin/activity-log`)

---

## 3. TATA LETAK & PERILAKU INTERAKTIF (LANGKAH 3)

1. **Sidebar 100dvh dengan 3 Bagian:**
   - **Kepala:** Logo Fibermedia + tombol "Perkecil Menu" (`PanelLeftClose` / `PanelLeft`) di kepala.
   - **Tengah:** Area scroll dengan `flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin`.
   - **Kaki:** Kartu "Peran Saat Ini" ringkas 1 baris (Avatar inisial, Nama, Badge peran, Titik status aktif) setinggi ~44 px.
2. **Kerapatan & Visibilitas 1366x768 & 1920x1080:**
   - Tinggi baris menu 36 px (`h-9`).
   - Semua 8 judul grup SELALU terlihat di layar tanpa perlu menggulir.
3. **Akordeon & Pengguliran Otomatis:**
   - Grup menu aktif otomatis terbuka saat navigasi.
   - Tersedia tombol "Buka semua" dan "Tutup semua".
   - Status lipat tersimpan di `localStorage` (`sidebar_collapsed_groups`) dengan penanganan `try/catch`.
   - Menu aktif disorot dengan `bg-primary text-primary-foreground` dan otomatis digulir ke area pandang (`scrollIntoView({ block: 'nearest' })`).
4. **Penanda Gulir (Scroll Shadows):**
   - Efek gradien bayangan atas halus aktif saat `scrollTop > 4`.
   - Efek gradien bayangan bawah halus aktif saat area bawah masih dapat digulir.
5. **Mode Diperkecil & Mobile Drawer:**
   - Mode diperkecil menampilkan ikon dengan tooltip judul & fase, badge titik angka, dan avatar peran ringkas.
   - Layar kecil: laci navigasi dengan backdrop semi-transparan yang otomatis menutup setelah item menu diklik.

---

## 4. DAFTAR MENU BERSTATUS "SEGERA" BESERTA FASENYA

| Menu | Grup | Rute | Status | Keterangan Fase |
|---|---|---|---|---|
| **Impor / Ekspor KMZ** | Jaringan | `/admin/network/kmz` | Segera | Tersedia setelah Fase 4 (Modul KMZ Parser & Geospasial) |
| **Modul OLT** | Jaringan | `/admin/network/nodes?tab=olt` | Segera | Tab OLT di simpul jaringan, tersedia setelah integrasi SNMP/CLI OLT |

---

## 5. HASIL PENGUJIAN & CHECKLIST PRA-SELESAI

1. **Feature Tests:**
   - `php artisan test --filter=MenuTreeAndBadgesTest` -> **PASS (4 passed, 32 assertions)**.
     - Memvalidasi Superadmin melihat seluruh 8 grup dan menu KMZ "Segera".
     - Memvalidasi pengguna non-superadmin tidak melihat menu "Segera" dan tidak ada grup kosong.
     - Memvalidasi angka badge aksi sesuai seed.
     - Memvalidasi pembersihan cache badge.
2. **`npm run lint:copy`:** -> **HIJAU** (0 pelanggaran istilah terlarang, 225 berkas lolos uji).
3. **`npm run types:check`:** -> **HIJAU** ("TIDAK ADA DRIFT (SINKRON)").
4. **`npm run build`:** -> **SUKSES** (Ukuran entry point admin: 294,91 kB gzipped 88,25 kB, tanpa peringatan chunk besar).
5. **Selisih skema vs tampilan:** **0**.

---

## 6. DAFTAR BERKAS YANG DIUBAH

1. [`app/Modules/Network/menu.php`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/app/Modules/Network/menu.php) *(Menambahkan item KMZ dengan is_available false & available_from_phase Fase 4)*
2. [`app/Services/MenuService.php`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/app/Services/MenuService.php) *(Bypass superadmin untuk menu Segera, filter non-superadmin, atribut is_available & available_from_phase)*
3. [`resources/js/admin/app/components/layout/DashboardLayout.tsx`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/app/components/layout/DashboardLayout.tsx) *(Tata letak 3 zona 100dvh, flex min-h-0, akordeon, scroll shadows, kerapatan 36px, kartu peran 1 baris, sakelar menu Segera)*
4. [`tests/Feature/MenuTreeAndBadgesTest.php`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/tests/Feature/MenuTreeAndBadgesTest.php) *(Pengujian menu Segera untuk superadmin dan non-superadmin)*
5. [`docs/sidebar-fix.md`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/docs/sidebar-fix.md) *(Dokumentasi diagnosis dan hasil perbaikan)*
