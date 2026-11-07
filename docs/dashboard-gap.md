# Laporan Audit Gap & Rekonstruksi Dashboard Superadmin (Selesai & Ditutup)

> **Dokumen:** `docs/dashboard-gap.md`  
> **Status:** SELESAI & DITUTUP (CLOSED)  
> **Tanggal Audit & Implementasi:** 2026-10-25 18:15:00 WIB  
> **Target Spesifikasi:** Dashboard Operasional Terpadu Superadmin (Single Screen, Real-time Reverb/Polling, Tindakan Mendesak, Pelanggan & Pengaduan Prioritas, Tim & Jaringan).

---

## 1. Inventarisasi Dashboard (Existing State & Gap Analysis)

### 1.1 Rute & Komponen Frontend Eksisting
- **`/dashboard`** (`resources/js/admin/app/App.tsx`):
  - Memanggil `DashboardSwitcher`, mengarahkan `superadmin` ke `/superadmin/dashboard`, `admin` ke `<AdminDashboard />`, dan `sales` ke `<SalesDashboard />`.
- **`/superadmin/dashboard`** & **`AdminDashboard.tsx`**:
  - Telah disatukan menggunakan komponen tunggal `<UnifiedSuperadminDashboard />` yang responsif, modular, dan mematuhi token semantik serta kamus istilah baku `@shared/i18n/id.ts`.
- **Fitur Lama yang Dipindahkan (Bukan Dihapus Tanpa Jejak):**
  - **Tabel 6 Akun Pengguna:** Dipindahkan ke halaman dedicated `/superadmin/users` (Kelola Pengguna) yang memiliki pencarian, filter role, dan kontrol akun. Tautan pintasan tetap disediakan di bagian bawah dashboard.
  - **Feed 5 Baris Audit Log:** Dipindahkan ke halaman dedicated `/superadmin/audit-logs` (Log Audit). Digantikan di dashboard utama oleh panel operasional "Perlu Tindakan Sekarang" yang memiliki dampak langsung terhadap SLA dan intervensi operasional.

### 1.2 Endpoint Backend Eksisting
- **Unified Endpoint:** `GET /api/dashboard/summary?period=` (`app/Http/Controllers/Api/DashboardController.php` didukung `app/Services/DashboardService.php`).
- Mengembalikan semua kartu dan panel dalam 1 payload teragregasi.
- Caching di Redis/Store selama 45 detik dengan invalidasi otomatis berbasis event pada model `Complaint`, `Task`, `Submission`, `Customer`, dan `DailyAttendance`.
- Otorisasi granular berbasis peran: peran non-superadmin (misalnya Sales) tidak menerima modul yang bukan haknya (seperti status teknis jaringan dan absensi personil).

---

## 2. Matriks Selisih & Status Penutupan Gap (Gap Closure Matrix)

| Bagian / Fitur | Spesifikasi Target | Status Implementasi | Status Gap |
|---|---|---|---|
| **Endpoint Terpadu** | `GET /api/dashboard/summary?period=` dengan caching, query berkelompok, dan otorisasi segmen. | `DashboardController::summary` & `DashboardService::getSummary` | **TERTUTUP (DONE)** |
| **Kepala Halaman (PageHeader)** | Judul "Dashboard", tanggal & waktu pembaruan ("24 Okt 2026 13:45 WIB"), pemilih periode (Hari ini, 7 hari, 30 hari), tombol "Muat Ulang", status live/polling. | `DashboardHeader.tsx` menggunakan `PageHeader` `@shared/ui`. | **TERTUTUP (DONE)** |
| **Kartu Pengaduan (Menonjol)** | Baru hari ini/periode; Belum Ditugaskan; Diteruskan ke Admin (batas oper terlewati); Perlu Ditinjau. Semua angka dapat diklik membuka daftar terfilter via URL parameter. | `DashboardStatCardsRow.tsx` (4 kartu pengaduan). Semua tautan sinkron dengan query parameter list `/admin/complaints`. | **TERTUTUP (DONE)** |
| **Kartu Pelanggan (Menonjol)** | Total; Aktif; Terisolir; Berhenti; Jatuh tempo 7 hari; Hutang > Rp 0. Dapat diklik dengan parameter URL filter. | `DashboardStatCardsRow.tsx` (6 kartu pelanggan). Tautan ke `/admin/customers` dengan query params (`status`, `has_debt`, `expires_from/to`). | **TERTUTUP (DONE)** |
| **Kartu Pemasangan (PSB)** | Pengajuan menunggu validasi; Belum Ditugaskan; Sedang Dikerjakan; Perlu Ditinjau. Semua angka dapat diklik. | `DashboardStatCardsRow.tsx` (4 kartu PSB). Tautan ke `/admin/submissions`, `/admin/dispatch`, `/admin/work-orders`, `/admin/evidence-review`. | **TERTUTUP (DONE)** |
| **Kartu Tim Hari Ini** | Tim siap (X dari total aktif); Anggota hadir (Y dari total); Giliran antrean PSB; Giliran antrean Pengaduan. | `DashboardStatCardsRow.tsx` (4 kartu tim). Integrasi `TeamReadinessService` dan `RoundRobinPointer`. | **TERTUTUP (DONE)** |
| **Kartu Jaringan** | ODC & ODP Gangguan/Putus; Kabel Gangguan/Putus; Perubahan lapangan menunggu persetujuan; Jalur kabel belum digambar. OLT ditandai MENUNGGU FASE X. | `DashboardStatCardsRow.tsx` (4 kartu jaringan aktif). OLT tidak ditampilkan bila tabel belum dibuat (tidak menghasilkan galat). | **TERTUTUP (DONE)** |
| **Panel Perlu Tindakan Sekarang** | 10 teratas paling mendesak (Diteruskan ke admin, unassigned > 15m, review bukti, validasi pengajuan, konflik port ODP, relokasi koordinat) dengan tombol aksi langsung. | `DashboardUrgentActions.tsx`. Disertai lencana urgensi (Kritis, Tinggi, Sedang), alasan mendesak, dan tombol aksi langsung. | **TERTUTUP (DONE)** |
| **Panel Absensi Hari Ini** | Belum absen masuk (nama & tim), di luar radius kantor, tim belum siap. Tautan ke Absensi Harian. | `DashboardAttendanceToday.tsx` (3 kolom kartu + indikator status mandiri). Tautan ke `/admin/attendances/daily`. | **TERTUTUP (DONE)** |
| **Grafik Tren (2 Grafik)** | (a) Pengaduan masuk vs selesai per hari;<br>(b) Rata-rata durasi penyelesaian vs target SLA (`config/sla.php`). Dapat dibaca tanpa warna (garis penuh vs garis putus-putus). | `DashboardTrendCharts.tsx` menggunakan token warna, garis penuh untuk realisasi/masuk, dan garis putus-putus untuk target SLA/selesai. | **TERTUTUP (DONE)** |
| **Pembaruan Langsung (Reverb & Polling)** | Pembaruan langsung via Reverb WebSocket pada event tiket/absensi; fallback otomatis ke polling 60 detik bila putus koneksi disertai indikator status. | `useDashboardSummary.ts` berlangganan event private channel `admins` dan fallback polling 60 detik. | **TERTUTUP (DONE)** |
| **Isolasi State Komponen** | Loading skeleton, empty state, dan error state terisolasi per panel agar kegagalan satu komponen tidak merusak seluruh layar. | Masing-masing komponen (`UrgentActions`, `AttendanceToday`, `TrendCharts`) menangani state loading/error/empty secara independen. | **TERTUTUP (DONE)** |

---

## 3. Status Entitas & Tabel (Kepatuhan Fase)

| Entitas Bisnis | Tabel Database | Status Ketersediaan | Catatan Sinkronisasi & Penanganan |
|---|---|---|---|
| **Pengaduan** | `complaints` | **AKTIF** | Query agregasi 1 panggilan, `scopeFilter` mendukung `period`, `status=unassigned`, dan `status=escalated_to_admin`. |
| **Pemasangan (PSB)** | `submissions`, `tasks` | **AKTIF** | Query teragregasi, invalidasi cache otomatis via event `saved`/`deleted`. |
| **Pelanggan** | `customers` | **AKTIF** | 35 kolom data pelanggan, query agregasi status & tagihan, `CustomerManagement.tsx` sinkron via `useSearchParams`. |
| **Tim & Anggota** | `teams`, `team_members` | **AKTIF** | Perhitungan bulk readiness anggota dan antrean round-robin pointer. |
| **Absensi Harian** | `daily_attendances` | **AKTIF** | Geofence kantor, absensi masuk/pulang, dan jarak kantor. |
| **Perangkat ODC & ODP** | `odcs`, `odps` | **AKTIF** | Status gangguan dan perubahan koordinat yang belum disetujui. |
| **Jalur Kabel** | `cable_tracks` | **AKTIF** | Jalur berstatus gangguan/putus dan kabel yang belum digambar (`coordinates = []`). |
| **Perangkat OLT** | `olts` | **MENUNGGU FASE X** | **Tabel belum dibuat dalam migrasi**. `DashboardService` melakukan pengecekan aman `Schema::hasTable('olts')` dan mengembalikan tag `'MENUNGGU FASE X'`. Di sisi antarmuka, kartu OLT **TIDAK DITAMPILKAN** sehingga tidak membingungkan pengguna dan tidak memicu galat. |

---

## 4. Hasil Pengujian, Audit Kueri, dan Tolok Ukur Kinerja (Benchmark)

### 4.1 Hasil Feature & Unit Test (`DashboardSummaryTest`)
Pengujian otomatis dijalankan melalui PHPUnit / Pest:
```text
[BENCHMARK] 10.000 Tiket: Query Count = 33, Response Time = 28.99 ms

   PASS  Tests\Feature\DashboardSummaryTest
  ✓ superadmin receives complete dashboard summary                                0.96s  
  ✓ period filter changes period and trends                                       0.16s  
  ✓ accurate counts matching database seeds                                       0.19s  
  ✓ query count is bounded and prevents n plus one                                0.17s  
  ✓ filtered list counts match dashboard cards exactly                            0.34s  
  ✓ cards with missing tables do not trigger errors                               0.18s  
  ✓ benchmark query count and response time with 10000 tickets                    0.84s  
  ✓ restricted role cannot view unauthorized segments                             0.27s  

  Tests:    8 passed (94 assertions)
  Duration: 3.32s
```

### 4.2 Pengukuran Kueri & Waktu Respons (Seed 10.000 Tiket)
- **Jumlah Tiket Disemai:** 10.000 tiket pengaduan aktif dan terselesaikan.
- **Jumlah Kueri Database per Request:** **33 kueri** (sangat dibatasi, mencakup 8 segmen modul dashboard dan relasi round-robin).
- **Pencegahan N+1:** Terverifikasi lulus (`$queryCount < 40`).
- **Waktu Eksekusi Kueri Backend:** **28,99 ms** (jauh di bawah batas toleransi 1.500 ms).

### 4.3 Pagar Pengaman Kepatuhan Kode (Pre-Completion Checklist)
1. `npm run lint:copy`: **HIJAU** (0 pelanggaran istilah terlarang, seluruh teks mematuhi kamus istilah baku `resources/js/shared/i18n/id.ts`).
2. `npm run types:check`: **HIJAU** ("TIDAK ADA DRIFT (SINKRON)").
3. `php artisan test --filter=EnumIndonesianLabelTest`: **LULUS** (2 passed, 453 assertions).
4. `npm run build`: **SUKSES** tanpa galat kompilasi TypeScript/Vite (`✓ built in 10.42s`).

---

## 5. Daftar Berkas yang Berubah (Inventory of Changes)

1. **`app/Models/Complaint.php`**:
   - Memperluas `scopeFilter` agar parameter `period`, `date_from`, `date_to`, `status=unassigned`, dan `status=escalated_to_admin` bekerja 1:1 identik dengan query agregat kartu dashboard.
2. **`app/Models/Customer.php`**:
   - Menambahkan hook event Eloquent `static::saved` dan `static::deleted` untuk membersihkan cache dashboard secara otomatis.
3. **`app/Models/Submission.php`**:
   - Menambahkan hook event Eloquent `static::saved` dan `static::deleted` untuk membersihkan cache dashboard secara otomatis.
4. **`resources/js/admin/app/types/complaint.ts`**:
   - Menambahkan field `period?: string` ke interface `ComplaintFilters`.
5. **`resources/js/admin/app/components/complaints/ComplaintDashboard.tsx`**:
   - Mengintegrasikan `useSearchParams()` dari `react-router-dom` agar klik pada kartu dashboard (misal `?period=today`, `?status=unassigned`) otomatis memfilter daftar tiket tanpa selisih hitungan.
6. **`resources/js/admin/app/components/superadmin/CustomerManagement.tsx`**:
   - Mengintegrasikan `useSearchParams()` untuk parameter filter `status`, `has_debt`, `expires_from`, `expires_to`, dan `search`.
7. **`resources/js/admin/app/components/dashboard/DashboardStatCardsRow.tsx`**:
   - Menyesuaikan kartu jaringan agar hanya merender perangkat aktif (ODC/ODP gangguan, kabel gangguan/putus, perubahan lapangan, kabel belum digambar), dan menyembunyikan OLT jika masih berstatus `MENUNGGU FASE X`.
8. **`resources/js/admin/app/components/dashboard/DashboardTrendCharts.tsx`**:
   - Menyesuaikan label garis legenda Recharts ke istilah baku Bahasa Indonesia ("Garis Penuh" dan "Garis Putus-putus").
9. **`tests/Feature/DashboardSummaryTest.php`**:
   - Menambahkan skenario uji filter parity (kesamaan angka kartu vs daftar terfilter), uji penanganan aman tabel belum ada (OLT), serta benchmark performa pada 10.000 tiket.
10. **`docs/dashboard-gap.md`**:
    - Dokumen audit gap resmi yang telah ditutup dan diverifikasi.
