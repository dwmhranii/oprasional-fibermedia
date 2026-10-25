# Aturan Sinkronisasi, Istilah, dan Tampilan Permanen Fibermedia-Ops

## 1. Aturan Sinkronisasi Skema Permanen
- Setiap perubahan skema (migrasi) hanya dianggap SELESAI jika lapisan di atasnya diperbarui dalam perubahan yang sama:
  - Model Eloquent ($fillable, $casts, $hidden, relasi)
  - FormRequest (pesan Bahasa Indonesia & aturan validasi)
  - API Resource
  - Tipe TypeScript tergenerate (`composer types` dan `npm run types` / `php artisan types:generate`)
  - Halaman FE terdampak (daftar, detail, form)
  - Impor / ekspor Excel
  - Seeder / factory
  - Tes PHPUnit / Feature test
- Kolom yang dihapus atau diganti nama tidak boleh tersisa di kode (lakukan grep sebelum selesai).
- Di akhir fase, laporkan "Selisih skema vs tampilan: 0" beserta bukti grep dan keluaran `npm run types:check`.
- Bila tabel belum punya halaman karena fasenya belum tiba, catat sebagai DITUNDA di `docs/sync-audit.md`.

## 2. Aturan Istilah dan Tampilan Permanen
- Setiap halaman/komponen baru wajib memakai templat halaman dan komponen bersama di `resources/js/shared/ui`, token desain (`resources/js/shared/tokens/index.ts`), dan kamus istilah (`resources/js/shared/i18n/id.ts` & `docs/glossary.md`).
- Dilarang menulis string tampilan langsung di komponen (ambil dari kamus `id.ts`).
- Dilarang menulis warna hex/RGB langsung di luar berkas token.
- Dilarang memakai istilah di luar kamus (misal: dilarang Customer, Complaint, SPK, Ketua/Lead, Presensi, Fase pada tiket). Istilah baru harus ditambahkan ke kamus terlebih dahulu.
- Label enum datang dari backend (value dan label) melalui metode `label()` pada enum PHP.
- Sebelum selesai jalankan `npm run lint:copy`, ESLint, dan tes Playwright/konsol visual, dan laporkan hasilnya.
