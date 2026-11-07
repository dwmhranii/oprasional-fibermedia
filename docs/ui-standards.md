# Standar Antarmuka Pengguna & Aturan Umum Tampilan (UI/UX Guidelines)

> **Dokumen:** `docs/ui-standards.md`  
> **Status:** AKTIF & WAJIB DIPATUHI  
> **Lingkup:** Portal Admin Web (`resources/js/admin`) dan PWA Lapangan (`resources/js/field`)  
> **Referensi Tambahan:** [`AGENTS.md`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/AGENTS.md), [`docs/glossary.md`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/docs/glossary.md), [`resources/js/shared/i18n/id.ts`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/i18n/id.ts).

---

## 1. Identitas Visual & Konsistensi Desain

1. **Komponen Bersama & Token Semantik:**
   - Seluruh halaman **wajib menggunakan komponen bersama** di `resources/js/shared/ui/`:
     - [`PageHeader`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/PageHeader.tsx)
     - [`StatCards`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/StatCards.tsx)
     - [`FilterBar`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/FilterBar.tsx)
     - [`DataTable`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/DataTable.tsx)
     - [`StatusBadge`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/StatusBadge.tsx)
     - [`DetailLayout`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/DetailLayout.tsx)
     - [`FormLayout`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/FormLayout.tsx)
     - [`ConfirmDialog`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/ConfirmDialog.tsx)
     - [`EmptyState`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/EmptyState.tsx)
     - [`PageLoadingSkeleton`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/PageLoadingSkeleton.tsx)
     - [`PageErrorState`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/PageErrorState.tsx)
     - [`ConfirmLeave`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/shared/ui/ConfirmLeave.tsx)
   - Gunakan token semantik Tailwind (`bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`).
   - **Dilarang keras:** Menulis warna hex/RGB langsung atau style inline ad-hoc di komponen.
2. **Kamus Istilah Tunggal:**
   - Semua teks tampilan diambil dari kamus bahasa `resources/js/shared/i18n/id.ts`.
   - Tidak boleh ada hardcoded string teks bebas pada komponen.

---

## 2. Empat Keadaan Wajib Antarmuka (The 4 UI States)

Setiap halaman dan segmen data wajib dirancang untuk menangani 4 keadaan, bukan hanya keadaan normal:

| Keadaan | Standar Implementasi | Komponen yang Dipakai |
|---|---|---|
| **1. Memuat (Loading)** | Menggunakan skeleton loader yang bentuk dan proporsinya menyerupai konten aslinya (bukan spinner layar penuh). | `PageLoadingSkeleton`, `SkeletonLoaders`, skeleton tabel. |
| **2. Kosong (Empty)** | Menampilkan ilustrasi ikon yang relevan, kalimat penjelas mengapa data kosong, dan tombol tindakan utama yang relevan (mis. "Tambah Pelanggan Baru"). | `EmptyState` |
| **3. Galat (Error)** | Menampilkan pesan kegagalan yang manusiawi dan tombol aksi "Muat Ulang" (*Retry*) untuk mencoba mengambil data kembali tanpa perlu refresh browser. | `PageErrorState` |
| **4. Tanpa Izin (403)** | Menampilkan halaman penolakan akses yang rapi dan elegan yang menyebutkan kebutuhan hak akses, bukan layar putih atau galat konsol. | `AccessDenied` |

---

## 3. Standar Halaman Daftar (Data Tables & Lists)

1. **Paginasi & Pencarian:**
   - Wajib diproses di sisi server (*server-side pagination, searching, and sorting*).
2. **Sinkronisasi State dengan URL:**
   - Parameter pencarian, tab aktif, filter status/wilayah, dan halaman saat ini **wajib disimpan di query parameter URL** (`?search=...&page=...&status=...`).
   - Memungkinkan tautan dibagikan langsung (*deep-linking*) dan tombol browser back/forward berfungsi sempurna tanpa mereset filter.
3. **Fitur Pelengkap:**
   - Penampil jumlah hasil aktif (mis. *"Menampilkan 1-15 dari 142 data"*).
   - Pengurutan kolom (sorting ascending/descending) dengan indikator visual panah.
   - Aksi massal (*bulk actions*) hanya disediakan jika alur operasional benar-benar membutuhkannya (mis. eskalasi massal).

---

## 4. Standar Formulir (Forms & Inputs)

1. **Validasi & Penanganan Galat:**
   - Validasi sisi klien (*client-side*) saat pengguna berinteraksi.
   - Galat validasi server (HTTP 422) **wajib ditampilkan tepat di bawah kolom input bersangkutan** dengan teks warna semantik `text-destructive`.
2. **Bilah Aksi Tetap (Action Bar):**
   - Tombol "Simpan" dan "Batal" berada di posisi tetap yang mudah dijangkau.
   - Saat proses submit berlangsung, tombol Simpan **wajib dinonaktifkan** (*disabled*) dan memunculkan animasi putar (*spinner*) untuk mencegah pengiriman data ganda (*double-submit*).
3. **Pencegahan Kehilangan Data (Dirty State):**
   - Wajib menggunakan pelindung perubahan data yang belum tersimpan (`ConfirmLeave` / `useBlocker`): memunculkan dialog konfirmasi bila pengguna berniat meninggalkan halaman sebelum menyimpan.
4. **Umpan Balik:**
   - Menampilkan notifikasi sukses atau peringatan lewat `toast` (Sonner).

---

## 5. Tindakan Kritis & Masking Data Sensitif

1. **Konfirmasi Tindakan Merusak:**
   - Tindakan yang bersifat merusak, permanen, atau membatalkan data (mis. Hapus, Batalkan Tiket, Isolir Layanan) wajib menggunakan `ConfirmDialog`.
   - Dialog wajib merinci apa yang terjadi, apa dampaknya, dan menyediakan input alasan wajib (*reason field*) bila dipersyaratkan oleh audit.
2. **Perlindungan Data Sensitif:**
   - Nomor Induk Kependudukan (NIK), kata sandi, dan foto identitas (KTP/KK) **wajib bertopeng secara bawaan** (mis. `3507************`).
   - Hanya dapat dibuka (*unmasking*) oleh pengguna dengan izin khusus (`customers.view_secret`), dan setiap aktivitas pembukaan topeng dicatat ke log audit sistem.

---

## 6. Kinerja & Pemecahan Kode (Code Splitting Benchmark)

### Kebijakan Pemuatan Malas (Route-Based Lazy Loading)
- Seluruh rute halaman admin dan PWA wajib menggunakan `React.lazy()` dan dibungkus `Suspense` dengan `PageLoadingSkeleton`.
- Pustaka berat hanya dimuat saat rute terkait dibuka:
  - Pustaka Peta (Leaflet) hanya dimuat di halaman Peta Jaringan (`LiveFleetTracking`).
  - Pustaka Grafik (Chart.js) hanya dimuat di Dasbor KPI & Laporan Penjualan (`SalesReport`).
- Gambar wajib menggunakan thumbnail dan atribut `loading="lazy"`.

### Hasil Benchmark Ukuran Bundle Awal (Sebelum vs Sesudah):
| Berkas Bundle | Sebelum Code Splitting | Setelah Code Splitting | Penghematan |
|---|---|---|---|
| **Entry Point Admin (`admin-*.js`)** | **1.585,86 kB** (gzip: 375,43 kB) | **290,31 kB** (gzip: 87,15 kB) | **-1.295,55 kB (-81,7%)** |
| **Vendor Maps Chunk (`vendor-maps-*.js`)** | Di-bundle di main script | 155,28 kB (On-demand) | Terpisah dari initial load |
| **Vendor Charts Chunk (`vendor-charts-*.js`)**| Di-bundle di main script | 444,27 kB (On-demand) | Terpisah dari initial load |
| **Status Peringatan Rollup Chunk Size** | Muncul warning `> 1000 kB` | **0 Warning (Bersih)** | Beban awal browser sangat ringan |

---

## 7. Responsivitas & Desain PWA Mobile-First

1. **Portal Admin Desktop:**
   - Optimal pada resolusi 1366 px (laptop standar) hingga monitor lebar, serta tetap adaptif pada tablet landscape/portrait.
2. **PWA Lapangan (Mobile Handheld):**
   - Dirancang khusus untuk operasional satu tangan di perangkat seluler.
   - **Target Sentuh Minimum:** 44 x 44 piksel pada seluruh tombol, toggle, dan item navigasi.
   - **Ukuran Font Input:** Minimal 16 piksel (`text-base` / `text-[16px]`) untuk mencegah browser iOS/Safari melakukan auto-zoom otomatis saat pengguna mengetik.
   - Tombol aksi utama (seperti *Check-in*, *Selesaikan Pekerjaan*, *Ambil Foto*) diletakkan di bagian bawah layar dalam jangkauan ibu jari (*thumb zone*).

---

## 8. Aksesibilitas (a11y) & Validasi Pengujian

1. **Aksesibilitas:**
   - Navigasi keyboard yang konsisten dengan urutan fokus logis (`Tab` / `Shift+Tab`).
   - Setiap elemen formulir memiliki atribut `<label>` yang terhubung atau `aria-label`.
   - Rasio kontras teks memenuhi standar WCAG AA di mode terang dan gelap.
   - Status (seperti Normal, Waspada, Kritis) **tidak boleh hanya dibedakan lewat warna**, tetapi wajib disertai teks status dan ikon penanda.
2. **Checklist Pengujian:**
   - `npm run lint:copy` -> 0 pelanggaran.
   - `npm run types:check` -> Bebas drift.
   - `php artisan test` -> Seluruh feature & label test lulus.
   - `npm run build` -> Berhasil tanpa galat kompilasi.
