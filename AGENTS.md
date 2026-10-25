# ATURAN PERMANEN PENGEMBANGAN FIBERMEDIA-OPS

Dokumen ini memuat aturan permanen operasional yang wajib dipatuhi oleh seluruh agent, developer, dan kontributor kode pada repositori Fibermedia-Ops.

---

## 1. ATURAN SINKRONISASI PERMANEN

Setiap perubahan skema database (berkas migrasi) **hanya dianggap SELESAI** bila seluruh lapisan di atasnya ikut diperbarui dalam perubahan yang sama:
1. **Model Eloquent**: `$fillable`, `$casts`, `$hidden`, relasi (`belongsTo`, `hasMany`, dll).
2. **FormRequest**: Pesan validasi Bahasa Indonesia, aturan validasi kolom baru/diubah.
3. **API Resource**: Pemetaan respons JSON (`toArray($request)`).
4. **Tipe TypeScript**: Dihasilkan ulang secara otomatis melalui `composer types` dan `npm run types` (atau `php artisan types:generate`).
5. **Halaman Frontend Terdampak**: Daftar (*list*), Detail, dan Formulir (*form*).
6. **Impor / Ekspor**: Header Excel, pemetaan data impor/ekspor.
7. **Seeder & Factory**: Data *dummy* dan *factory definition*.
8. **Pengujian (Tests)**: Unit & Feature test yang memvalidasi kontrak API.

### Kebersihan Kode & Penghapusan Kolom:
- Kolom yang dihapus atau diganti nama **DILARANG TERSISA** di codebase. Selalu lakukan `grep` sebelum menyelesaikan tugas.
- Di akhir setiap fase pekerjaan, laporkan secara eksplisit:  
  **"Selisih skema vs tampilan: 0"** beserta bukti (keluaran grep dan hasil langkah CI deteksi drift `npm run types:check`).
- Bila tabel belum memiliki halaman frontend karena jadwal fasenya belum tiba, wajib dicatat sebagai **DITUNDA** dengan alasan jelas di `docs/sync-audit.md`.

---

## 2. ATURAN ISTILAH DAN TAMPILAN PERMANEN

Setiap halaman atau komponen baru **wajib menggunakan**:
1. **Templat Halaman & Komponen Bersama**: Berada di `resources/js/shared/ui` (`PageHeader`, `StatCards`, `FilterBar`, `DataTable`, `StatusBadge`, `DetailLayout`, `FormLayout`, `ConfirmDialog`, `Toast`, `EmptyState`, `MapView`, `ConfirmLeave`).
2. **Token Desain Semantik**: Berada di `resources/js/shared/tokens/index.ts` (menggunakan kelas semantic Tailwind seperti `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, dll).
3. **Kamus Istilah Tunggal**:
   - Berkas kode: `resources/js/shared/i18n/id.ts` (`TERMS`, `ACTIONS`, `STATUS_LABELS`, `CUSTOMER_COLUMNS`, `MESSAGES`).
   - Berkas dokumentasi: `docs/glossary.md`.

### Larangan Keras Tampilan:
- **Dilarang** menulis string teks tampilan langsung (*hardcoded string*) di dalam komponen. Seluruh teks diambil dari kamus `id.ts`.
- **Dilarang** menulis warna hex atau RGB langsung di luar berkas token.
- **Dilarang** memakai istilah di luar kamus baku (misal: dilarang Customer, Complaint, SPK, Ketua/Lead, Presensi, Fase pada tiket). Istilah baru wajib didiskusikan dan dimasukkan ke kamus terlebih dahulu.
- **Label Enum**: Selalu berasal dari backend melalui metode `label()` pada enum PHP dan dikirim sebagai pasangan `{ value, label }` melalui API (misalnya endpoint `/api/enums`).

---

## 3. CHECKLIST PRA-SELESAI (PRE-COMPLETION CHECKLIST)

Sebelum menandai pekerjaan selesai, wajib menjalankan dan melampirkan hasil dari pagar pengaman berikut:
1. `npm run lint:copy` -> Harus HIJAU (0 pelanggaran istilah terlarang).
2. `npm run types:check` -> Harus HIJAU ("TIDAK ADA DRIFT (SINKRON)").
3. `php artisan test --filter=EnumIndonesianLabelTest` -> Harus LULUS.
4. `npm run build` -> Harus SUKSES tanpa galat kompilasi TypeScript/Vite.
5. Jalankan pengujian visual / konsol Playwright pada mode Terang, Gelap, Desktop, dan Mobile.
