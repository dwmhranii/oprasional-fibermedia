<USER_REQUEST>
# Prompt: Perluasan Jaringan, Menu Satu Pintu, Rute Tanpa Path Role, Jalur /pwa, dan Halaman Hak Akses

Tujuh prompt dalam satu file (revisi 25 Okt 2026). Dua penetapan baru yang berlaku untuk semuanya:

1. **Aplikasi lapangan (PWA) hanya di jalur `/pwa`.** Admin berada di akar domain yang sama; tidak ada subdomain dan tidak ada awalan role. Izin `pwa.access` mengatur siapa boleh membuka `/pwa`.
2. **Satu pintu.** Fungsi yang melekat pada sebuah entitas menjadi **tab atau aksi di halaman entitas itu**, bukan menu sendiri. Contoh: Impor/Ekspor KMZ adalah aksi di halaman OLT, ODC, ODP & Kabel; BRAS dan Persetujuan Perubahan adalah tab di halaman yang sama. Sidebar Superadmin menjadi **14 menu**.

| Urutan | Prompt | Isi |
| --- | --- | --- |
| 1 | R1 | Rute tanpa path role dan jalur `/pwa` (FE dan API) |
| 2 | R2 | Halaman Pengguna & Hak Akses oleh Superadmin |
| 3 | R3 | Sidebar satu pintu: 14 menu, tab, dan KMZ di halaman ODP |
| 4 | N1 | Gangguan massal |
| 5 | N2 | Status online/offline dari BRAS (tab BRAS) |
| 6 | N3 | Rute kabel otomatis sebagai bantuan |
| 7 | N4 | Lapisan satelit online |

R1 sampai R3 dikerjakan dulu karena N1 sampai N4 memakai izin, rute, dan menu yang dibentuk di sana. N1 sampai N4 adalah fase kecil dengan gerbang lulus dan tesnya sendiri; mulai yang berikutnya hanya setelah gerbangnya lulus. Prasyarat N1 sampai N4: Fase 1B (jaringan), Fase 2 (dispatch), dan prompt Peran dan Izin sudah berjalan. Tempel **Konteks Umum** dari `PROMPT_LENGKAP_Fibermedia.md` lebih dulu bila sesi baru.

**Prompt ini menggantikan** tabel struktur menu di `PROMPT_Sidebar_Superadmin.md` (24 baris) dan aturan alamat/host di Konteks Umum nomor 25. Aturan perilaku sidebar lain di `PROMPT_Sidebar_Superadmin.md` dan `PROMPT_Perbaikan_Sidebar_Superadmin.md` (badge, akordeon, mode diperkecil, Ctrl+K, laci, status "Segera") tetap berlaku.

---

## Acuan Struktur: 14 Menu Satu Pintu

Tabel ini adalah sumber kebenaran untuk R1, R2, R3, dan semua fase N. Setiap tab punya alamat sendiri (agar dapat dibagikan dan tombol kembali berfungsi). Menu tampil bila pengguna boleh melihat minimal satu tabnya; tab yang tidak diizinkan disembunyikan.

| # | Grup | Menu | Tab (alamat) | Izin | Badge |
| --- | --- | --- | --- | --- | --- |
| 1 | (tanpa grup) | Dashboard | tanpa tab (/dashboard) | dashboard.view | tidak |
| 2 | Pelanggan | Pelanggan | Daftar (/customers), Pengajuan (/customers/submissions) | customers.view, submissions.view | pengajuan menunggu validasi |
| 3 | Operasional | Tiket Pengaduan | Semua, Belum Ditugaskan, Perlu Ditinjau, Massal (filter status di /complaints) | complaints.view atau complaints.view_own | pengaduan butuh tindakan |
| 4 | Operasional | Pemasangan (PSB) | Semua, Belum Ditugaskan, Perlu Ditinjau (/psb) | psb.view | PSB butuh tindakan |
| 5 | Operasional | Work Order | tanpa tab, halaman pantau (/work-orders) | workorders.view | tiket perlu ditinjau |
| 6 | Jaringan | Peta Jaringan | tanpa tab (/network/map) | network.view | tidak |
| 7 | Jaringan | OLT, ODC, ODP & Kabel | OLT (/network/olt), ODC (/network/odc), ODP (/network/odp), Kabel (/network/cable), BRAS (/network/bras), Persetujuan (/network/approvals). Aksi di kepala halaman: Impor KMZ dan Ekspor KMZ | network.view (tab), network.manage (ubah, impor KMZ), network.approve (tab Persetujuan), bras.manage (ubah BRAS) | perubahan menunggu persetujuan |
| 8 | Absensi & Tim | Absensi | Hari Ini (/attendance/today), Rekap (/attendance/recap), Titik Kantor (/attendance/offices) | attendance.view, settings.manage (Titik Kantor) | tidak |
| 9 | Absensi & Tim | Tim dan Anggota | tanpa tab (/teams) | teams.view | tidak |
| 10 | KPI | KPI | Dasbor (/kpi), Rating (/kpi/ratings), Pengaturan (/kpi/settings) | kpi.view, kpi.manage (Pengaturan) | tidak |
| 11 | Produk & Penjualan | Katalog & Promo | tanpa tab (/catalog) | catalog.view | tidak |
| 12 | Produk & Penjualan | Laporan Sales & Revenue | tanpa tab (/reports) | reports.view | tidak |
| 13 | Pengaturan | Pengguna & Hak Akses | Pengguna (/access/users), Role (/access/roles), Matriks Izin (/access/matrix), Perangkat (/access/devices), Riwayat (/access/history) | users.view, access.manage, devices.view | tidak |
| 14 | Pengaturan | Pengaturan Sistem | Dispatch (/settings/dispatch), Peta (/settings/map), Log Aktivitas (/settings/activity-log) | settings.manage, audit.view | tidak |

Catatan satu pintu:
- Tidak ada menu terpisah untuk: Impor/Ekspor KMZ, BRAS, Persetujuan Perubahan, Absensi Harian, Rekap Absensi, Titik Kantor, Perangkat, Rating Pelanggan, Pengaturan KPI, Pengaturan Dispatch, Log Aktivitas. Semuanya tab atau aksi seperti tabel di atas.
- Antrean Dispatch dan Tinjau Bukti tetap bukan menu: keduanya filter status pada daftar tiket (ketetapan sebelumnya).
- Alamat lama dialihkan ke alamat baru (mis. /network/kmz ke /network/odp dengan pembuka dialog impor, /network/nodes ke /network/odp, /attendance ke /attendance/today, /settings/access ke /access/roles, /users ke /access/users, /activity-log ke /settings/activity-log, /submissions ke /customers/submissions).
- Setiap tab adalah komponen halaman yang dapat dimuat malas; badge pada tab (mis. jumlah di tab Persetujuan) memakai kunci badge yang sama dengan menu induknya.
- Admin melihat hanya tiga menu: Dashboard, Pelanggan (tab Daftar dan Pengajuan), dan Tiket Pengaduan. Absen harian dibuka lewat tautan "Buka aplikasi lapangan" ke `/pwa`.

---

## R1 — Rute tanpa path role dan jalur /pwa

```
TUGAS: Hapus semua nama role dari alamat (URL) di FE admin, FE PWA, dan API. Alamat hanya menyebut sumber dayanya, hak akses ditentukan oleh IZIN, dan satu-satunya awalan khusus adalah /pwa untuk aplikasi lapangan. Mulai dengan AUDIT, tulis di docs/routes-audit.md, lalu kerjakan. Struktur menu, tab, dan alamat tab mengikuti tabel "Acuan Struktur: 14 Menu Satu Pintu".

LANGKAH 1 — AUDIT (jangan ubah kode dulu):
a. Daftar semua route FE (App.tsx dan berkas router) dan route backend (routes/*.php) yang mengandung awalan role atau nama role (mis. /superadmin/..., /admin/..., /teknisi/..., /sales/..., group prefix('superadmin'), middleware role:).
b. Untuk setiap route: padanan baru, izin yang melindunginya, dan konsumen yang memakainya (halaman FE, PWA, perintah, tes, tautan di notifikasi push, tautan di email atau pesan, ekspor).
c. Daftar redirect login (setelah login ke mana tiap role diarahkan) dan tempat yang membangun URL dari role (mis. `/${role}/dashboard`).
d. Cara PWA dan admin dilayani sekarang (Vite entry, host, manifest, service worker, scope, nama cache, nama basis data Dexie, kunci localStorage, tempat token disimpan), karena keduanya akan berbagi satu origin.

LANGKAH 2 — IMPLEMENTASI:
1. Pohon rute FE admin satu saja, tanpa awalan role, di akar domain. Alamat baku mengikuti Acuan Struktur: /dashboard; /customers, /customers/:id, /customers/submissions, /customers/submissions/:id; /complaints, /complaints/:id; /psb, /psb/:id; /work-orders; /network/map; /network/olt, /network/odc, /network/odp, /network/cable, /network/bras, /network/approvals (dan /network/:tipe/:id untuk detail); /attendance/today, /attendance/recap, /attendance/offices; /teams; /kpi, /kpi/ratings, /kpi/settings; /catalog; /reports; /access/users, /access/roles, /access/matrix, /access/devices, /access/history; /settings/dispatch, /settings/map, /settings/activity-log; /login. "/" mengarah ke /dashboard bila pengguna punya izin dashboard, ke /pwa bila hanya punya pwa.access, dan ke /login bila belum masuk. Isi /dashboard ditentukan oleh izin (lengkap atau ringkas), bukan oleh role.
2. PWA hanya di jalur /pwa pada domain yang sama, satu public/, tanpa subdomain:
   - Rute PWA: /pwa (beranda, mengarah ke /pwa/work-orders), /pwa/login, /pwa/work-orders, /pwa/work-orders/:id, /pwa/attendance, /pwa/map, /pwa/submissions, /pwa/submissions/new, /pwa/outbox, /pwa/me. Tidak ada /pwa/teknisi atau /pwa/sales: menu bawah PWA dibentuk dari izin dan keanggotaan tim, bukan nama role.
   - Laravel menyajikan shell PWA untuk semua alamat /pwa/* dan shell admin untuk alamat lain selain /api, /storage, /build, /up, dan berkas statis. Berkas statis yang ada di public/ (termasuk public/pwa/sw.js) dilayani server web lebih dulu.
   - Vite dua entry: admin dengan base '/' dan field dengan base '/pwa/'. Manifest di /pwa/manifest.webmanifest dengan start_url '/pwa/' dan scope '/pwa/'. Service worker di /pwa/sw.js dengan scope '/pwa/' (vite-plugin-pwa disetel ke scope dan base tersebut). Admin TIDAK mendaftarkan service worker; saat admin dimuat, batalkan pendaftaran service worker lama yang scope-nya mencakup akar (bila ada) dan hapus cache lama.
   - Satu origin berarti localStorage, IndexedDB, dan Cache Storage dipakai bersama. Maka: semua kunci localStorage diberi awalan ("fm-admin:" dan "fm-pwa:"); basis data Dexie bernama "fm_pwa" dan nama cache berawalan "fm-pwa-"; admin tidak pernah membaca atau menulis penyimpanan milik PWA dan sebaliknya (tambahkan aturan lint atau tes yang memeriksa awalan). Gunakan sesi cookie Sanctum SPA httpOnly (SameSite=Lax) untuk admin dan PWA bila memungkinkan; bila PWA memakai token pribadi, simpan di penyimpanan berawalan dan kirim hanya ke /api.
   - Karena satu origin, kebocoran XSS di satu sisi memengaruhi sisi lain: terapkan Content-Security-Policy yang ketat (tanpa inline script, sumber skrip hanya 'self'), pelindung dari skrip pihak ketiga, dan tulis risikonya di docs/pwa-path.md.
   - Tautan dan pengalihan: tautan "Buka aplikasi lapangan" di admin menuju /pwa; tautan push dan pesan untuk tiket lapangan memakai /pwa/work-orders/:id; tautan penugasan admin memakai /complaints/:id atau /psb/:id.
   - Pengembangan lokal: satu host (localhost) dengan /pwa; tidak perlu admin.localhost atau app.localhost. Hapus variabel ADMIN_HOST dan FIELD_HOST bila ada.
3. Izin pwa.access (label "Buka aplikasi lapangan"): tanpa izin ini /pwa/* menghasilkan halaman 403 yang rapi dan API lapangan menolak 403. Bawaan: admin (untuk absen harian), teknisi, dan sales; superadmin lewat Gate::before. Izin ini hanya pintu masuk; hak kerja lapangan (hanya tiket timnya, hanya pengajuan miliknya) tetap dibatasi policy. Izin ini TIDAK menggantikan attendance.self dan izin lain.
4. Login satu halaman /login (dan /pwa/login yang tampil dalam gaya PWA, memakai endpoint yang sama). Setelah login: jika datang dari /pwa/login, ke /pwa bila punya pwa.access; jika datang dari /login atau tautan dalam, ke alamat tujuan semula atau /dashboard bila punya dashboard.view, ke /pwa bila hanya punya pwa.access, dan ke halaman 403 bila tidak punya keduanya. Tidak ada pemilihan alamat menurut nama role.
5. API: hapus grup route berawalan role. Semua endpoint berbasis sumber daya: /api/customers, /api/submissions, /api/complaints, /api/psb, /api/work-orders, /api/network/*, /api/attendance/*, /api/teams, /api/kpi/*, /api/users, /api/roles, dan seterusnya; satu API untuk admin dan PWA (tanpa /api/pwa atau /api/admin). Data yang dikembalikan dibatasi izin dan policy (mis. GET /api/complaints mengembalikan semua untuk complaints.view, tiket timnya untuk anggota tim, dan yang diajukan sendiri untuk complaints.view_own). Beri nama route Laravel yang konsisten (customers.index, complaints.show, dan seterusnya).
6. Izin dibaca dari GET /api/me (daftar izin, menu yang boleh dilihat lengkap dengan tab, penanda is_superadmin). FE memakai satu fungsi can('izin') (true untuk superadmin) dan komponen <RequirePermission can="...">. Jangan menaruh izin di dalam token; periksa di server pada setiap permintaan. FE memuat ulang /api/me saat jendela kembali fokus, tiap 5 menit, dan setiap kali menerima 403, sehingga perubahan hak akses berlaku tanpa login ulang. Di PWA, hasil /api/me terakhir disimpan (berawalan) agar menu dasar tetap tampil saat offline.
7. Redirect: semua alamat lama (/superadmin/*, /admin/*, /teknisi/*, alamat tanpa awalan milik PWA lama di host app, /network/kmz, /network/nodes, /settings/access, /users, /activity-log, /submissions, dan sejenisnya) dialihkan ke alamat baru (301 untuk halaman FE). Karena belum ada data produksi, endpoint API lama dihapus langsung dan pemetaannya dicatat di docs/routes-map.md. Perbarui semua tempat yang membangun URL (notifikasi push, ekspor, pesan, tes, dokumentasi).
8. Dokumentasikan di docs/pwa-path.md: pembagian rute, scope service worker, awalan penyimpanan, CSP, cara menguji PWA di jalur /pwa, dan cara memasang ulang PWA bagi perangkat yang sebelumnya terpasang dari alamat lama.

LANGKAH 3 — TES:
- Tes otomatis yang memindai berkas route backend dan konfigurasi router FE dan GAGAL bila ada alamat yang memuat "superadmin", "admin", "teknisi", atau "sales" sebagai segmen path (daftar putih hanya nama paket). Satu-satunya awalan khusus yang diizinkan adalah "pwa" dan "api".
- Setiap alamat lama dialihkan ke alamat baru yang benar (tabel hasil dilampirkan).
- Pengguna dengan izin berbeda membuka alamat yang sama dan mendapat isi sesuai izin (dashboard lengkap versus ringkas; daftar pengaduan semua versus milik sendiri).
- Pengguna tanpa pwa.access membuka /pwa dan mendapat 403 (FE) dan 403 (API lapangan); pengguna dengan pwa.access tetapi tanpa dashboard.view diarahkan ke /pwa setelah login.
- Service worker terdaftar di scope /pwa/ saja; membuka halaman admin tidak mendaftarkan service worker dan tidak dilayani dari cache PWA (Playwright memeriksa navigator.serviceWorker.getRegistrations dan Cache Storage).
- Awalan penyimpanan: tes memastikan admin tidak menyentuh kunci "fm-pwa:" atau basis data "fm_pwa", dan sebaliknya.
- PWA tetap berfungsi offline di /pwa (muat shell, antrean outbox, peta offline) setelah pemindahan jalur.
- Perubahan izin di database berlaku pada permintaan berikutnya tanpa login ulang.
- Playwright: login lalu seluruh menu dan tab Superadmin bisa dibuka dengan alamat baru, tanpa 404 dan tanpa galat konsol; PWA dibuka di /pwa pada ukuran HP.

KELUARAN AKHIR: docs/routes-audit.md, docs/routes-map.md (lama -> baru), docs/pwa-path.md, daftar berkas yang berubah, hasil tes, dan daftar tempat yang masih memakai nama role atau host terpisah (harus kosong).
```

---

## R2 — Halaman Pengguna & Hak Akses (Superadmin)

```
TUGAS: Bangun halaman untuk Superadmin mengatur pengguna dan hak akses setiap role tanpa mengubah kode, sebagai menu "Pengguna & Hak Akses" (grup Pengaturan) di /access dengan lima tab: Pengguna (/access/users), Role (/access/roles), Matriks Izin (/access/matrix), Perangkat (/access/devices), Riwayat (/access/history). Mulai dengan AUDIT singkat (tabel role, izin, dan penugasan yang ada; di mana izin didefinisikan; cara menu memakai izin; halaman Pengguna dan Perangkat yang sudah ada), tulis di docs/access-audit.md, lalu kerjakan. Prasyarat: R1 selesai dan prompt Peran dan Izin sudah berjalan.

PRINSIP:
- Daftar izin dan penjelasannya tetap didefinisikan di KODE (registri izin), sedangkan siapa memegang izin apa diubah di DATABASE lewat halaman ini. Superadmin selalu memiliki semua izin lewat Gate::before dan tidak dapat diubah.
- Penetapan awal peran (Admin hanya: tambah pelanggan, absen harian, ajukan pengaduan, setujui PSB dari sales; Teknisi dan Sales sesuai PRD) adalah NILAI BAWAAN. Superadmin boleh mengubahnya dari halaman ini.
- Hak pekerjaan lapangan (terima tiket, Tahap 1, Tahap 2, hanya tiket timnya, hanya pengajuan miliknya) dibatasi oleh keanggotaan dan kepemilikan lewat policy dan TIDAK dapat dilepas lewat matriks izin.
- Izin pwa.access ("Buka aplikasi lapangan") ada di matriks dalam modul "Aplikasi Lapangan (/pwa)". Mencabutnya dari sebuah role menutup /pwa untuk role itu; ia hanya pintu masuk dan tidak memberi hak kerja apa pun.
- Satu pintu: Perangkat bukan menu sendiri melainkan tab di sini.

PEKERJAAN:
1. Registri izin per modul (mis. app/Modules/<Modul>/permissions.php): tiap izin punya key (customers.create), modul, label bahasa Indonesia, deskripsi satu kalimat, tanda "terkunci untuk Superadmin" (access.manage, users.manage, audit.view bila perlu), peran bawaan, dan izin prasyarat (customers.update mensyaratkan customers.view). Perintah `php artisan permissions:sync` membuat izin yang belum ada dan memperbarui label, serta memberikan peran bawaan HANYA untuk izin yang baru muncul; tidak pernah mencabut atau menimpa perubahan manual Superadmin. Perintah melaporkan izin baru dan yang usang. Jalankan juga di migrasi/seeder dan di CI.
2. Backend (permission access.manage, hanya Superadmin lewat Gate::before; izin ini terkunci dan tidak dapat diberikan ke role lain lewat UI atau API):
   - GET /api/roles (role, jumlah pengguna, status sistem), POST /api/roles (nama, deskripsi, opsi salin dari role lain), PATCH /api/roles/{id} (nama dan deskripsi; role sistem superadmin, admin, teknisi, sales tidak dapat diganti namanya atau dihapus), DELETE /api/roles/{id} (hanya role kustom tanpa pengguna).
   - GET /api/permissions (registri dikelompokkan per modul), GET /api/roles/{id}/permissions, PUT /api/roles/{id}/permissions (daftar izin lengkap; server memvalidasi prasyarat dan menolak izin terkunci untuk role selain superadmin).
   - GET /api/roles/{id}/menu-preview (menu sidebar beserta tab yang akan terlihat oleh role itu dengan izin yang diajukan, tanpa menyimpan).
   - POST /api/roles/{id}/reset (kembalikan ke bawaan registri, dengan konfirmasi).
   - PATCH /api/users/{id}/role (ubah role pengguna; satu role utama per pengguna).
   - Setiap perubahan menyimpan diff (ditambah dan dicabut) ke activitylog dan memanggil forgetCachedPermissions() sehingga berlaku pada permintaan berikutnya; kirim event Reverb "permissions.changed" ke pengguna terdampak agar FE memuat ulang /api/me dan sidebar.
   - Perubahan izin role memerlukan konfirmasi sandi Superadmin (dapat dimatikan lewat pengaturan, bawaan hidup).
3. FE /access dengan lima tab (komponen bersama, istilah baku; tiap tab punya alamat sendiri):
   - Pengguna: daftar pengguna (nama, role, tim, status, akses /pwa ya atau tidak) dengan pengubah role; larangan menurunkan atau menonaktifkan pengguna Superadmin terakhir; pencarian dan filter role; tambah dan nonaktifkan pengguna sesuai fungsi yang sudah ada (users.manage).
   - Role: tabel (nama, deskripsi, jumlah pengguna, penanda "Sistem"/"Kustom"), tombol Buat Role (nama, deskripsi, salin dari), Ubah, Hapus (dengan konfirmasi dan penjelasan bila ditolak karena masih ada pengguna).
   - Matriks Izin: pilih role; izin dikelompokkan per modul (Pelanggan, Pengajuan, Tiket, Jaringan, Absensi, KPI, Pengaturan, Aplikasi Lapangan, dan seterusnya) dengan label dan deskripsi; kotak centang per izin dan "pilih semua di modul"; izin prasyarat otomatis ikut aktif dan izin yang tergantung ikut mati bila prasyaratnya dicabut; izin terkunci tampil dengan ikon gembok dan tidak dapat dicentang; role Superadmin tampil semua tercentang dan terkunci. Panel samping menampilkan pratinjau menu sidebar dan tab untuk role itu. Tombol Simpan membuka dialog yang menampilkan diff dan meminta konfirmasi sandi; tombol "Kembalikan ke Bawaan". Peringatan bila perubahan memberi izin sensitif (hapus pelanggan, lihat NIK dan password, ekspor, ubah pengaturan).
   - Perangkat: daftar perangkat terdaftar per pengguna beserta aksi yang sudah ada pada halaman Perangkat lama (izin devices.view dan devices.manage); halaman lama dialihkan ke tab ini.
   - Riwayat: perubahan hak akses dari log aktivitas (siapa, kapan, role, diff) dengan filter.
   Menu "Pengguna & Hak Akses" tampil bila salah satu tabnya boleh dilihat; tab Role, Matriks Izin, dan Riwayat membutuhkan access.manage.
4. Perubahan hak akses harus langsung terlihat: sidebar, dashboard, tab, dan tombol aksi menyesuaikan tanpa login ulang; pengguna yang kehilangan akses ke halaman yang sedang dibuka diarahkan ke halaman 403 yang rapi; pengguna yang kehilangan pwa.access saat berada di /pwa melihat halaman 403 dan antrean luring yang belum terkirim tetap tersimpan (jangan dihapus diam-diam) dengan penjelasan.
5. Dokumentasikan di docs/access.md: cara menambah izin baru (tambah di registri, jalankan permissions:sync, pakai di policy dan menu) dan aturan bahwa tidak ada pemeriksaan nama role di kode.

TES (wajib):
- Superadmin dapat membuat role kustom, menyalin dari role lain, mengubah matriks, dan role itu berfungsi sesuai izin yang diberikan.
- Admin, Teknisi, dan Sales tidak dapat membuka tab Role, Matriks Izin, maupun API access.manage (403).
- Izin terkunci tidak dapat diberikan ke role selain superadmin (UI dan API menolak).
- Role sistem tidak dapat dihapus atau diganti namanya; role dengan pengguna tidak dapat dihapus; Superadmin terakhir tidak dapat diturunkan atau dinonaktifkan.
- Mencabut pwa.access dari role Sales: Sales mendapat 403 di /pwa pada permintaan berikutnya tanpa login ulang; memberikannya ke role kustom membuka /pwa untuk role itu.
- Pencabutan izin berlaku pada permintaan berikutnya tanpa login ulang (uji dengan dua sesi) dan sidebar pengguna itu berubah setelah event.
- permissions:sync tidak menimpa perubahan manual, hanya memberi bawaan untuk izin baru, dan melaporkan izin baru; dijalankan dua kali menghasilkan hasil sama.
- Prasyarat izin ditegakkan (tidak bisa memberi customers.update tanpa customers.view).
- Setiap perubahan tercatat di log dengan diff; konfirmasi sandi salah ditolak.
- Pratinjau menu sama dengan sidebar yang benar-benar tampil untuk pengguna role itu.
- Alamat lama (/settings/access, /users, /devices) dialihkan ke tab yang benar.
- Playwright: alur buat role, ubah matriks, simpan, dan lihat riwayat; mode terang dan gelap, desktop dan HP.

KELUARAN AKHIR: docs/access-audit.md dan docs/access.md, daftar berkas yang berubah, hasil tes, dan daftar izin beserta peran bawaannya.
```

---

## R3 — Sidebar satu pintu: 14 menu, tab, dan KMZ di halaman ODP

```
TUGAS: Pastikan SETIAP menu dan tab pada tabel "Acuan Struktur: 14 Menu Satu Pintu" muncul untuk Superadmin dan membuka halaman yang berfungsi, dan pindahkan semua fungsi turunan ke dalam halaman pemiliknya (satu pintu). Prasyarat: R1 selesai; prompt Perbaikan Sidebar sudah dijalankan atau dikerjakan bersama.

LANGKAH 1 — AUDIT per menu dan tab (tulis matriks di docs/menu-audit.md): untuk setiap menu dan tab pada tabel acuan, isi kolom: ada di registri menu? | izin terdaftar? | route FE terdaftar? | halaman FE ada dan terhubung? | endpoint backend ada? | tabel database ada? | tampil di sidebar Superadmin? | akar masalah bila tidak tampil. Catat juga menu atau halaman lama yang akan dilebur beserta pemetaannya: Impor / Ekspor KMZ, BRAS, Persetujuan Perubahan, Absensi Harian, Rekap Absensi, Titik Kantor, Perangkat, Rating Pelanggan, Pengaturan KPI, Pengaturan Dispatch, Log Aktivitas, Hak Akses, Pengguna & Role, Analitik & KPI, Work Order (SPK), Kontrol & Staf.

LANGKAH 2 — PERBAIKAN dan PELEBURAN:
1. Registri menu mendukung tab: tiap menu punya daftar tab (kunci, judul dari kamus istilah, rute, izin, kunci badge opsional) dan daftar aksi kepala halaman (kunci, judul, izin, perilaku). GET /api/menu dan GET /api/me mengembalikan menu lengkap dengan tab dan aksi yang boleh dilihat. Menu muncul bila minimal satu tab boleh dilihat dan rute menu mengarah ke tab pertama yang boleh dibuka.
2. Komponen halaman bertab bersama (judul halaman, aksi di kepala, bilah tab dengan badge, alamat tab, 403 per tab). Semua halaman bertab memakainya agar konsisten.
3. Impor / Ekspor KMZ di halaman "OLT, ODC, ODP & Kabel": tombol "Impor KMZ" dan "Ekspor KMZ" di kepala halaman, tampil pada semua tab jaringan (paling menonjol di tab ODP). Impor membuka wizard berlangkah: pilih berkas, pratinjau (dry-run: jumlah ditambah, dicocokkan, tidak cocok, anomali, ODP berkoordinat meragukan, pelanggan tak cocok), konfirmasi, dan hasil; riwayat impor dapat dibuka dari wizard ("Riwayat Impor"). Ekspor membuka dialog pilihan cakupan (semua atau yang terfilter, dengan atau tanpa jalur kabel) dan mengunduh KMZ dari basis data. Izin: impor memakai network.manage, ekspor memakai network.view (atau izin impor/ekspor khusus bila registri sudah punya). Tidak ada menu atau rute KMZ tersendiri; /network/kmz dialihkan ke /network/odp?aksi=impor-kmz yang langsung membuka wizard. Semua aturan impor yang sudah ditetapkan tetap berlaku (basis data adalah sumber kebenaran, KMZ hanya impor/ekspor, urutan lon,lat,alt, dry-run, tidak menimpa data tanpa konfirmasi).
4. Tab BRAS dan Persetujuan Perubahan pindah ke halaman yang sama (tab 5 dan 6). Absensi: Hari Ini, Rekap, Titik Kantor jadi tab satu menu. KPI: Dasbor, Rating, Pengaturan jadi tab. Pengaturan Sistem: Dispatch, Peta, Log Aktivitas. Pengguna & Hak Akses: lima tab dari R2 (Perangkat termasuk). Pelanggan: tab Daftar dan Pengajuan; Pengajuan menunggu validasi tampil sebagai badge di tab dan menu.
5. Tiap kegagalan ditangani menurut akar masalah:
   - Belum terdaftar di registri: tambahkan definisi menu atau tab di modulnya.
   - Izin tidak ada atau belum di-seed: tambahkan ke registri izin dan jalankan permissions:sync.
   - Disaring dengan nama role atau kondisi lain di FE: ganti dengan pemeriksaan izin lewat GET /api/me.
   - Route FE belum ada: daftarkan rute dan penjaga izin.
   - Halaman belum ada tetapi tabel dan endpoint sudah ada: bangun halaman sesuai PROMPT_Tampilan_FE.md.
   - Tabel atau endpoint belum ada karena fasenya belum dikerjakan: menu atau tab tetap tampil untuk Superadmin dalam keadaan "Segera" (pudar, tidak dapat diklik, tooltip "Tersedia setelah <fase>") dan menjadi aktif otomatis lewat penanda is_available di registri.
   - Menu atau tab aktif yang membuka halaman kosong atau galat dianggap rusak: perbaiki atau tandai "Segera".
6. Hapus menu lama yang sudah dilebur dari sidebar; jangan menghapus halaman yang masih dipakai tanpa melaporkannya, dan pasang pengalihan dari alamat lamanya.

LANGKAH 3 — TES:
- Tes otomatis memuat registri menu dan memastikan setiap menu dan tab punya izin yang terdaftar, rute FE yang ada, dan rute backend yang dilindungi, dan bahwa jumlah menu tingkat atas Superadmin tepat 14.
- Playwright masuk sebagai Superadmin, membuka sidebar, dan mengklik SETIAP menu lalu SETIAP tab: halaman harus tampil (bukan 404, bukan kosong, tanpa galat konsol); menu atau tab "Segera" tidak berpindah halaman. Tangkapan layar tiap halaman dilampirkan.
- KMZ: tombol Impor dan Ekspor KMZ muncul di setiap tab jaringan bagi yang berizin dan tidak ada menu KMZ di sidebar; wizard impor menjalankan dry-run tanpa mengubah data; /network/kmz dialihkan ke wizard.
- Masuk sebagai Admin: hanya tiga menu (Dashboard, Pelanggan dengan tab Daftar dan Pengajuan, Tiket Pengaduan), tidak ada menu atau tab "Segera", dan tidak ada tab yang bukan haknya.
- Pengguna yang hanya boleh melihat satu tab melihat menu itu dan hanya tab itu; pengguna tanpa satu pun tab tidak melihat menunya.
- Menambah entri registri baru (menu, tab, atau aksi) muncul di sidebar tanpa mengubah komponen sidebar.
- Badge pada tab sama dengan jumlah baris pada daftar tab itu.

KELUARAN AKHIR: docs/menu-audit.md yang sudah ditutup (setiap baris berstatus Aktif atau Segera dengan fasenya), pemetaan menu lama ke menu atau tab baru, tangkapan layar sidebar Superadmin dan Admin, dan daftar berkas yang berubah.
```

---

## N1 — Gangguan Massal

```
FASE N1: Gangguan massal. Gerbang lulus bila perubahan status ODC/ODP/kabel menjadi disrupted atau cut dapat dipraktikkan menjadi SATU tiket yang dibagikan sekali oleh dispatch, semua pelanggan terdampak tertaut ke tiket itu, dan pemulihan memulihkan semuanya.

Prasyarat: Fase 1B (olts, odcs, odps, network_cables, network_status_logs), Fase 2 (TeamDispatchService), Fase 3 (bukti Tahap 1 dan Tahap 2), prompt Peran dan Izin, R1 sampai R3. Satu pintu: tidak ada menu baru; semuanya berada di menu Peta Jaringan, OLT, ODC, ODP & Kabel, Tiket Pengaduan, dan Dashboard.

MODEL DATA (migrasi):
- incidents: id, code unik (INC-YYYYMM-XXXX lewat IdentifierGenerator), node_type (olt, odc, odp, cable), node_id, status (open, resolved, merged), severity (disrupted, cut), started_at, detected_at, resolved_at, merged_into_id nullable, source (manual, bras_suggestion), summary, created_by. Indeks unik parsial: satu incident berstatus open per (node_type, node_id).
- incident_customers: incident_id, customer_id, state (affected, restored, split), first_seen_at, restored_at, split_complaint_id nullable; unik (incident_id, customer_id).
- complaints: tambah incident_id nullable (unik: satu tiket utama per incident), is_mass boolean default false; customer_id boleh null untuk tiket massal. Pastikan seluruh kode yang mengasumsikan customer_id wajib (daftar, ekspor, KPI, rating, notifikasi) menangani tiket massal.
- dispatch_settings: incident_auto_create (bawaan false), incident_priority (bawaan tinggi).
- Izin baru di registri: incidents.view, incidents.manage (bawaan: hanya Superadmin lewat Gate::before; tidak diberikan ke Admin).

LOGIKA:
1. AffectedCustomersResolver: dari sebuah simpul atau kabel, hitung pelanggan terdampak, tidak termasuk status Berhenti (terminated) dan tanpa duplikat. Aturan: ODP -> pelanggan dengan odp_id itu; ODC -> semua ODP anaknya lalu pelanggannya; OLT -> semua ODC lalu ODP lalu pelanggan; kabel olt_odc -> ODC tujuan dan turunannya; kabel odc_odp -> ODP tujuan; kabel odp_customer -> pelanggan tujuan. Kembalikan juga hitungan per ODP dan penanda pelanggan berstatus Terisolir. Satu query berkelompok (CTE rekursif atau join bertingkat), tanpa N+1.
2. IncidentService::openFromStatusChange(node, status, reason): dipanggil dari POST /api/network/{type}/{id}/status saat status menjadi disrupted atau cut. Alur dua langkah: (a) pratinjau (dry run) mengembalikan jumlah pelanggan terdampak, daftar per ODP, dan incident terbuka yang berkaitan; (b) konfirmasi membuat incident. Bila incident_auto_create menyala, langkah (b) berjalan otomatis. Aturan penggabungan: bila ada incident terbuka pada simpul induk (leluhur), pelanggan baru ditautkan ke incident induk tanpa membuat incident baru; bila simpul ini adalah induk dari incident terbuka lain, incident anak digabung ke incident ini (status merged, merged_into_id terisi, pelanggan dipindah, tiket anak ditutup dengan alasan "digabung"). Operasi idempoten: mengulang perubahan status yang sama tidak membuat incident kedua.
3. Pembuatan tiket: satu baris complaints (is_mass = true, incident_id, judul otomatis "Gangguan {nama simpul}: {N} pelanggan", prioritas tinggi, SLA sesuai config/sla.php) yang masuk ke TeamDispatchService pada antrean pengaduan sehingga dibagi bergilir seperti tiket lain (satu tim, satu tiket). Tiket massal tidak menggandakan pembagian per pelanggan.
4. Target geofence tiket massal = koordinat simpul penyebab (bukan pelanggan); Tahap 2 absensi tiap anggota hadir di lokasi simpul; Tahap 1 berisi penyebab, tindakan, dan foto.
5. Pengaduan individual dari pelanggan yang terdampak (mis. diajukan Admin saat incident terbuka): saat membuat pengaduan, sistem memeriksa apakah odp_id pelanggan berada di bawah incident terbuka dan menawarkan "Tautkan ke tiket gangguan massal" (bawaan) sehingga tidak membuat tiket dan pembagian baru; admin dapat menolak dan membuat tiket sendiri.
6. Pemulihan: setelah tiket massal selesai dan, bila diperlukan, lolos peninjauan, Superadmin mengubah status simpul menjadi normal (konfirmasi menampilkan jumlah pelanggan). Incident menjadi resolved (resolved_at) dan semua incident_customers berstatus restored. Tindakan "Pisahkan ke tiket sendiri" per pelanggan (bila gangguan pelanggan tersebut berlanjut) membuat pengaduan individual tertaut dan menandai state = split.
7. Pemberitahuan manual: halaman pelanggan terdampak menyediakan tautan wa.me per pelanggan dengan templat pesan yang dapat diatur di pengaturan (teks disusun nanti; sediakan templat bawaan sederhana yang dapat diubah) dan tombol ekspor CSV daftar terdampak.
8. KPI: tiket massal dihitung SATU tiket untuk tim; jumlah pelanggan terdampak dicatat sebagai metrik terpisah (tidak menggandakan tiket); rating pelanggan hanya pada pengaduan individual.

ANTARMUKA (komponen bersama, istilah baku: "Gangguan" hanya untuk status jaringan; tiketnya tampil sebagai Pengaduan berlabel "Massal"):
- Peta Jaringan: simpul dan kabel dengan incident terbuka diberi penanda berteks; panel simpul menampilkan "Pelanggan terdampak: N" dan tombol "Buat Tiket Gangguan Massal" (membuka pratinjau lalu konfirmasi) yang hanya terlihat bila punya incidents.manage.
- Halaman OLT, ODC, ODP & Kabel: pada tab OLT, ODC, ODP, dan Kabel, baris dengan incident terbuka diberi penanda dan tombol aksi "Pratinjau Dampak"; dialog ubah status memakai alur yang sama dengan Peta.
- Dialog ubah status: saat memilih Gangguan atau Putus tampilkan pratinjau dampak sebelum disimpan.
- Daftar Tiket Pengaduan: badge "Massal (N pelanggan)" dan filter jenis; detail tiket mendapat tab "Pelanggan Terdampak" (daftar, filter per ODP, status terdampak/pulih/dipisah, tautkan WA, ekspor CSV, tombol Pisahkan).
- Dashboard: kartu "Gangguan massal aktif" (jumlah incident dan total pelanggan terdampak) yang membuka daftar terfilter.

TES:
- Resolver benar untuk setiap jenis simpul dan kabel pada topologi uji (1 OLT, 2 ODC, beberapa ODP, pelanggan campuran Aktif, Terisolir, Berhenti); pelanggan Berhenti tidak ikut; tanpa duplikat.
- Mengubah status dua kali tidak membuat incident kedua; indeks unik menahan balapan (uji paralel).
- Incident anak digabung ke induk dan tiket anak ditutup; pelanggan induk = gabungan tanpa duplikat.
- Hanya SATU tiket dibagikan oleh dispatch untuk satu incident dan sesuai giliran; pengaduan individual pelanggan terdampak menawarkan tautan dan tidak memicu pembagian baru bila ditautkan.
- Target geofence tiket massal adalah koordinat simpul.
- Pemulihan memulihkan semua pelanggan; "Pisahkan" membuat pengaduan individual tertaut.
- KPI menghitung tiket massal satu kali; ekspor, daftar, dan notifikasi tidak galat untuk tiket tanpa customer_id.
- Admin tidak dapat membuat atau mengubah incident (403); Superadmin dapat.
- Ukur waktu resolver untuk OLT dengan ±1.500 pelanggan dan laporkan.
```

---

## N2 — Status Online/Offline dari BRAS (MikroTik)

```
FASE N2: Status koneksi pelanggan dari BRAS. Gerbang lulus bila job terjadwal membaca sesi PPPoE aktif dari BRAS uji (atau driver tiruan), status koneksi tampil di pelanggan dan ODP, dan tidak ada yang mengubah status layanan pelanggan.

Prasyarat: bras_devices, customers.username dan customers.bras_id (Fase 1), Horizon, N1 (untuk saran gangguan). HANYA BACA: fase ini tidak memutus sesi, tidak membuat akun, tidak mengisolir.

KEAMANAN DAN KONEKSI:
- Kolom baru di bras_devices: api_driver (rest|api), api_host, api_port, use_tls, verify_tls, api_username, api_password (terenkripsi lewat cast 'encrypted', tidak pernah ada di respons JSON, log, atau ekspor), timeout_seconds, sync_enabled, sync_interval_seconds (bawaan 60), last_synced_at, last_success_at, last_error, reachability (reachable, unreachable, unknown).
- Dokumentasikan di docs/bras-setup.md: buat pengguna RouterOS khusus dengan hak minimal (baca dan API saja), batasi akses API ke alamat IP server aplikasi lewat firewall, jangan membuka API ke internet (gunakan jaringan privat atau VPN), pakai TLS bila memungkinkan.
- Antarmuka BrasDriver dengan dua implementasi: MikrotikRestDriver (RouterOS v7 REST, /rest/ppp/active) dan MikrotikApiDriver (API klasik; pakai paket PHP yang terawat setelah memeriksa lisensinya). Verifikasi sintaks dan endpoint terhadap dokumentasi RouterOS resmi sebelum menulis, jangan menebak. Sediakan FakeBrasDriver untuk tes.

DATA:
- pppoe_sessions_current: bras_id, username, customer_id nullable, address (IP), caller_id (MAC), uptime_seconds, session_started_at, last_seen_at; unik (bras_id, username). Baris yang tidak terlihat pada siklus terakhir dihapus.
- customers (kolom baru): connection_state (online, offline, unknown; bawaan unknown), last_online_at, last_offline_at, last_session_ip, connection_checked_at. TIDAK mengubah customers.status (Aktif, Terisolir, Berhenti) dan tidak mengubah kolom lain.
- connection_events: customer_id, bras_id, event (online, offline), occurred_at, source = 'bras'; hanya mencatat PERUBAHAN keadaan; job pemangkasan menghapus yang lebih tua dari 90 hari (dapat diatur).
- network_suggestions: id, type (odp_down, odc_down), node_type, node_id, online_count, total_count, offline_ratio, detected_at, status (open, accepted, dismissed), decided_by, decided_at. 

JOB:
1. bras:sync-sessions dijadwalkan tiap menit, satu job per BRAS di antrean "network" Horizon, dengan kunci agar tidak tumpang tindih (withoutOverlapping atau Cache::lock), timeout, percobaan ulang dengan backoff, dan pemutus sirkuit setelah N kegagalan beruntun.
2. Alur satu siklus: ambil daftar sesi aktif -> bangun himpunan username (huruf kecil) -> muat peta pelanggan untuk BRAS itu (id, username, bras_id) dari cache singkat -> upsert massal sesi -> hitung transisi.
3. PENTING: bila BRAS tidak dapat dihubungi atau responsnya galat, tandai reachability = unreachable, simpan last_error, dan JANGAN mengubah connection_state pelanggan menjadi offline (keadaan tidak diketahui, bukan offline).
4. Offline hanya ditetapkan setelah tidak terlihat pada N siklus beruntun (bawaan 2) untuk menghindari kedip; online ditetapkan seketika. Pelanggan yang bras_id-nya bukan BRAS yang sedang disinkronkan tidak disentuh. Sesi yang tidak cocok dengan pelanggan mana pun dicatat sebagai "tidak cocok" (dilaporkan, tidak dibuat otomatis).
5. Deteksi saran gangguan: setiap siklus, untuk tiap ODP dengan minimal M pelanggan terhubung, bila rasio offline >= X persen (bawaan 80) selama >= Y menit (bawaan 5) dan BRAS terjangkau, buat network_suggestions (bila belum ada yang terbuka); naik ke ODC bila semua ODP anaknya terkena. Saran TIDAK mengubah status jaringan dengan sendirinya. Superadmin menerimanya lewat tombol "Terapkan sebagai Gangguan", yang menulis network_status_logs dengan source = 'bras' dan memulai alur pratinjau dampak N1; "Abaikan" menutup saran.
6. Job pemangkasan harian untuk connection_events dan saran lama.

ANTARMUKA:
- Tab BRAS di halaman OLT, ODC, ODP & Kabel (/network/bras; bukan menu sendiri; izin bras.manage untuk mengubah): form koneksi (driver, host, port, TLS, kredensial; kata sandi tidak pernah ditampilkan kembali), tombol "Uji Koneksi" (menampilkan versi RouterOS, jumlah sesi aktif, latensi, atau pesan galat yang jelas), sakelar sinkron, interval, dan ambang saran; kolom status koneksi dan "terakhir tersinkron". Saran gangguan terbuka tampil sebagai daftar di tab ini dan sebagai penanda di Peta Jaringan.
- Pelanggan (tab Daftar di menu Pelanggan): lencana "Koneksi: Online/Offline/Tidak diketahui" dan "terakhir online", terpisah dari Status layanan; filter koneksi; kartu Dashboard "Pelanggan offline (dari BRAS)" yang menyertakan penanda bila data sudah lama atau BRAS tidak terjangkau.
- Tab ODP dan panel ODP di peta: "12 dari 16 online" dan penanda saran gangguan; Peta Jaringan menampilkan saran terbuka sebagai penanda dengan tombol Terapkan atau Abaikan.
- Izin baru: bras.manage dan connection.view (bawaan hanya Superadmin lewat Gate::before).

TES:
- FakeBrasDriver dengan skrip daftar sesi: online -> offline -> online; debounce 2 siklus; username berbeda huruf besar-kecil tetap cocok; sesi tak cocok dilaporkan; banyak BRAS tidak saling menimpa.
- BRAS tidak terjangkau tidak menjadikan siapa pun offline dan reachability berubah; pulih otomatis saat terjangkau lagi.
- customers.status tidak pernah berubah oleh job (tegaskan di tes).
- Kredensial tidak muncul di JSON, log, atau ekspor (tes snapshot).
- Saran muncul hanya saat ambang rasio dan durasi terpenuhi dan BRAS terjangkau; menerapkan saran menulis log dengan source = 'bras' dan membuka alur pratinjau N1; tidak ada perubahan status otomatis.
- Dua job BRAS yang sama tidak berjalan bersamaan (uji kunci).
- Ukur satu siklus untuk ±1.500 sesi dan laporkan waktunya; sasaran: beberapa detik, dengan satu query peta pelanggan dan upsert massal.
- Uji manual terhadap RouterOS nyata atau CHR; laporkan hasilnya.
```

---

## N3 — Rute Kabel Otomatis (bantuan menggambar)

```
FASE N3: Rute otomatis mengikuti jalan sebagai BANTUAN. Gerbang lulus bila tombol "Bantu Rute" menghasilkan usulan jalur yang bisa disunting, tidak pernah tersimpan sebelum disimpan oleh pengguna, dan tidak menimpa jalur gambar manual tanpa konfirmasi. Gambar manual tetap cara utama.

Prasyarat: Fase 1B (network_cables.route, alat gambar Terra Draw), R1 sampai R3. Tombol "Bantu Rute" berada di mode gambar pada Peta Jaringan dan tab Kabel; pengaturannya di Pengaturan Sistem, tab Peta.

KEPUTUSAN TEKNIS:
- Antarmuka RoutingProvider dengan implementasi OsrmProvider (OSRM milik sendiri dari data OpenStreetMap, URL dari konfigurasi) dan OpenRouteServiceProvider (kunci API, opsional). Penyedia dipilih lewat .env; bila tidak dikonfigurasi, tombol "Bantu Rute" tidak tampil. DILARANG memakai Google Directions atau Routes API untuk peta yang bukan peta Google, dan jangan memakai server demo publik OSRM untuk produksi.
- Profil rute: kabel mengikuti pinggir jalan, bukan lalu lintas kendaraan, sehingga gunakan profil pejalan kaki atau sepeda yang mengabaikan arah satu arah; profil dapat diatur. Tuliskan keterbatasannya di dokumentasi (jalur kabel udara tidak selalu sama dengan rute jalan).
- Panduan pasang OSRM di docs/routing-setup.md: unduh potongan OpenStreetMap untuk area (mis. ekstrak Geofabrik), jalankan osrm-extract, partition, customize lalu osrm-routed dalam Docker, kebutuhan memori, dan pembaruan data berkala. Verifikasi perintah terhadap dokumentasi OSRM resmi sebelum menuliskan; jangan menebak. Periksa ketentuan penyedia (atribusi, penyimpanan hasil) untuk ORS.

BACKEND:
- POST /api/network/routing/suggest {from:{lat,lng}, to:{lat,lng}, via?:[{lat,lng}]} mengembalikan GeoJSON LineString dan jarak penyedia. Berjalan di server (kunci API tidak sampai ke browser). Izin network.manage. Pembatasan laju per pengguna (mis. 20 per menit). Validasi koordinat berada dalam kotak area layanan. Timeout pendek, dan galat penyedia menghasilkan pesan "Rute otomatis tidak tersedia, gambar manual".
- Cache Redis berdasarkan hash koordinat yang dibulatkan, masa berlaku 7 hari, untuk mengurangi biaya dan beban.
- Sederhanakan hasil (Douglas-Peucker, toleransi sekitar 2 m). Panjang kabel SELALU dihitung ulang dari geometri akhir, bukan dari jarak penyedia.
- network_cables: tambah route_source (kmz, manual, gps_track, auto_assist) dan route_edited (boolean). Usulan otomatis tidak menyimpan apa pun; hanya mengembalikan geometri.
- Opsional "Rapikan Jalur GPS" (map matching) untuk jalur rekaman teknisi: usulan hasil snap ke jalan ditampilkan berdampingan dengan jalur asli; pengguna menerima atau menolak.

ANTARMUKA (admin):
- Pada mode gambar kabel: tombol "Bantu Rute" (aktif bila titik awal dan akhir sudah ada, tidak tampil bila penyedia belum dikonfigurasi, dinonaktifkan saat offline dengan tooltip). Hasilnya dimuat sebagai garis DRAF yang dapat disunting di Terra Draw dan diberi penanda "usulan otomatis"; jalur baru tersimpan hanya saat pengguna menekan Simpan.
- Bila kabel sudah punya jalur gambar manual, tombol meminta konfirmasi sebelum mengganti, dan menampilkan jalur lama sebagai bayangan sampai dikonfirmasi.
- Setelah pengguna menyunting titik, route_source tetap auto_assist dengan route_edited = true. Daftar kabel menampilkan sumber jalur (Manual, KMZ, GPS, Bantuan Otomatis).
- Sakelar "Aktifkan rute otomatis" dan penyedia terpilih berada di Pengaturan Sistem, tab Peta (/settings/map), izin settings.manage (Superadmin).

TES:
- Penyedia tiruan mengembalikan geometri tetap: usulan tampil sebagai draf dan tidak tersimpan sampai Simpan; Batal tidak mengubah database.
- Jalur manual tidak tertimpa tanpa konfirmasi; panjang kabel dihitung ulang dari geometri akhir dan sama dengan jumlah jarak antar titik.
- Cache: permintaan sama kedua kali tidak memanggil penyedia; galat atau timeout menghasilkan pesan yang benar dan tidak merusak data.
- Pembatasan laju bekerja; koordinat di luar area layanan ditolak; izin network.manage ditegakkan (Admin 403).
- Tombol tidak tampil bila penyedia tidak dikonfigurasi dan nonaktif saat offline (Playwright).
- Atribusi OpenStreetMap tetap tampil; tidak ada kunci API di bundel FE.
```

---

## N4 — Lapisan Satelit Online

```
FASE N4: Lapisan satelit online opsional. Gerbang lulus bila penyedia berlisensi sudah dipilih oleh saya berdasarkan dokumen perbandingan, lapisan satelit dapat dinyalakan di peta admin, tidak pernah disimpan untuk offline, dan dapat dimatikan sepenuhnya.

LANGKAH 1 — KEPUTUSAN (berhenti di akhir langkah ini dan tunggu persetujuan saya; jangan menulis kode):
Buat docs/satellite-provider-decision.md yang membandingkan 2 sampai 3 penyedia citra satelit (contoh yang perlu dinilai: MapTiler, Mapbox, Esri/ArcGIS, dan Google Map Tiles API) dengan merujuk dokumentasi dan ketentuan resmi masing-masing yang benar-benar dibuka (cantumkan tautan dan tanggal akses). Kriteria: (a) apakah lisensi mengizinkan pemakaian di MapLibre/pustaka non-milik-penyedia; (b) larangan atau batas caching dan penggunaan offline; (c) kuota gratis dan harga pada skala 5 sampai 10 pengguna admin; (d) kualitas dan kebaruan citra di area layanan (Bululawang, Malang), diperiksa dengan tangkapan layar atau contoh; (e) syarat atribusi; (f) cara pengamanan kunci (pembatasan domain, token berumur pendek); (g) risiko ketergantungan. Akhiri dengan rekomendasi dan pertanyaan keputusan untuk saya.

LANGKAH 2 — IMPLEMENTASI (setelah saya memilih penyedia):
1. Antarmuka SatelliteTileProvider dan konfigurasi .env (penyedia, kunci, tanggal). Kunci disimpan di .env dan hanya dikirim ke browser lewat endpoint konfigurasi untuk pengguna yang berhak; kunci HARUS dibatasi domain (referrer) di sisi penyedia dan dicatat di docs/satellite-setup.md beserta langkah memutar kunci.
2. Pengaturan Sistem, tab Peta (/settings/map; izin settings.manage): sakelar "Aktifkan lapisan satelit" (bawaan mati) dan batas pemakaian bulanan sebagai pengingat (aplikasi tidak dapat menghitung muat tile di sisi penyedia, jadi dokumentasikan cara memantau kuota di dasbor penyedia dan pasang peringatan di sana).
3. Peta Jaringan dan layar gambar kabel: pemilih lapisan "Peta | Satelit" (dengan atribusi penyedia yang wajib tampil), pilihan diingat per pengguna (try/catch pada localStorage). Mode gambar kabel memakai satelit supaya jalan dan tiang terlihat.
4. OFFLINE: tile satelit TIDAK PERNAH disimpan di Cache Storage, OPFS, atau IndexedDB, dan service worker mengecualikan domain tile satelit dari semua strategi cache (periksa dengan Playwright). Saat offline atau penyedia tidak tersedia, pilihan Satelit dinonaktifkan dengan tooltip "Satelit butuh internet" dan peta kembali ke peta dasar tanpa galat.
5. Hanya web admin pada fase ini (bukan /pwa); PWA di /pwa tetap memakai peta offline. Bila nanti dibutuhkan di PWA, laporkan sebagai usulan terpisah.
6. Permissions: network.view untuk melihat lapisan; sakelar di pengaturan membutuhkan settings.manage.

TES:
- Sakelar mati: pemilih lapisan tidak tampil dan tidak ada permintaan ke domain penyedia.
- Sakelar hidup: lapisan tampil, atribusi terlihat, pilihan diingat; localStorage tidak tersedia tidak merusak peta.
- Offline: pilihan Satelit nonaktif, peta dasar tetap bekerja; tidak ada entri tile satelit di penyimpanan peramban setelah sesi panjang (Playwright memeriksa Cache Storage dan IndexedDB).
- Kunci tidak ada di repositori dan tidak ada di bundel FE selain lewat endpoint konfigurasi; pengguna tanpa network.view tidak menerimanya.
- Tangkapan layar peta dengan satelit di mode terang dan gelap; tanpa galat konsol.
```
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-25T22:47:55+07:00.

The user's current state is as follows:
Active Document: d:\Project\FIbermedia Project\Fibermedia-Ops\resources\js\admin\app\components\network\NetworkApprovals.tsx (LANGUAGE_TSX)
Cursor is on line: 1
Other open documents:
- d:\Project\FIbermedia Project\Fibermedia-Ops\docs\roles-audit.md (LANGUAGE_MARKDOWN)
- d:\Project\FIbermedia Project\Fibermedia-Ops\routes\api.php (LANGUAGE_PHP)
- d:\Project\FIbermedia Project\Fibermedia-Ops\resources\js\admin\app\components\admin\AdminDashboard.tsx (LANGUAGE_TSX)
- d:\Project\FIbermedia Project\Fibermedia-Ops\resources\js\admin\app\components\network\NetworkApprovals.tsx (LANGUAGE_TSX)
Running terminal commands:
- php artisan serve (in d:\Project\FIbermedia Project\Fibermedia-Ops, running for 3h55m13s)
</ADDITIONAL_METADATA>