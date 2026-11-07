# PRD Fibermedia v1.2 (Revisi)
**Tanggal:** Oct 31, 2026 · @Rani  
**Status:** Final v1.2 (Seluruh item terbuka sudah diputuskan)

---

## 1. Ringkasan Revisi dan Keputusan Terkunci
PRD v1.2 menggabungkan v1.1 dengan 11 keputusan baru dan berstatus Final v1.2; seluruh item terbuka sudah diputuskan. Poin bertanda *(usulan)* adalah titik awal teknis yang difinalkan tim saat implementasi.

| Topik | Keputusan | Dampak Utama |
| :--- | :--- | :--- |
| **Jam SLA** | 08.00–20.00 WIB, Senin–Sabtu, di luar hari libur nasional | Jam SLA hanya berjalan di jendela ini |
| **Target SLA PSB & Respons** | PSB selesai 24 jam operasional; respons pengaduan 2 jam operasional | Dasar perhitungan Pause dan eskalasi |
| **SLA Penyelesaian Pengaduan** | Kritis 3 jam, Tinggi 6 jam, Sedang 24 jam, diatur Superadmin lewat `sla_settings` | Target disalin ke tiket saat dibuat; perubahan tidak memengaruhi tiket berjalan |
| **Prioritas Tiket Pengaduan** | Ditentukan Admin; Superadmin hanya mengatur durasi | Admin wajib menetapkan prioritas sebelum tiket dibagikan |
| **Absensi Teknisi** | Hanya di kantor (radius 50 m + Wi-Fi kantor) | Teknisi tidak punya jalur absen lapangan |
| **Absensi Sales & Collector** | Boleh absen lapangan (selfie + geotag + tinjauan admin) | Dua jalur absensi |
| **Port ODP** | Ditahan 30 hari setelah pelanggan *terminated* | Constraint unik mencakup status *held* |
| **Status Terminated** | Hanya Admin/CS atau Superadmin lewat Web Admin | Masa tahan port dimulai otomatis |
| **Reopen Tiket** | Maksimal 3 x 24 jam setelah selesai; setelahnya wajib tiket pengaduan baru | Metrik SLA dan kinerja teknisi tetap bersih |
| **Billing** | Modul billing, invoice, dan auto-isolir bukan MVP; kolom `debt_amount` dan `billing_cycle_day` dipakai manual oleh Admin/CS | Kolom `auto_isolate` dan `billing_token` keluar dari migrasi awal |
| **BAST** | Wajib tanda tangan di layar di tempat, tanpa sertifikat dan tanpa PSrE; tidak ada status pending; Admin menyetujui BAST sebelum tiket selesai | BAST bisa selesai offline; risiko hukum diterima |
| **Autentikasi** | Satu mekanisme: Laravel Sanctum | Menggantikan JWT; pencabutan akses seketika |
| **Foto Bukti** | Kompres di klien ≤400 KB, thumbnail 30–50 KB, cadangan ke Google Drive | Dasbor cepat dan ada salinan di luar server |
| **Migrasi Pelanggan Existing** | CSV lewat perintah Artisan `customers:import` | Pelanggan impor berstatus active tanpa alur PSB |
| **Retensi** | Activity Log 6 bulan; foto dan BAST selama kontrak + 6 bulan setelah terminated; absensi 1 tahun | Kebijakan ditetapkan internal |
| **RPO, RTO, Uptime** | 1 jam, 2 jam, 99,5% per bulan | Backup database tiap jam |
| **Routing Jalan** | OSRM publik di MVP dengan cache 7 hari dan fallback garis lurus; OSRM mandiri di modul tambahan | Kualitas rute tidak dijamin di MVP |
| **Skala Uji Beban** | 5.000 pelanggan aktif dalam 3 tahun, 20 tim, diuji sampai 15.000 | Dasar target performa |

---

## 2. Lingkup MVP dan Fase Berikutnya
MVP mencakup operasional lapangan end-to-end, dari pelanggan baru sampai BAST bertanda tangan; billing, NOC otomatis, dan WhatsApp ditunda.

| Area | MVP | Fase Berikutnya | Modul Tambahan |
| :--- | :---: | :---: | :---: |
| Master data pelanggan, paket, ODP, OLT | Ya | | |
| Impor pelanggan existing (CSV 35 kolom) | Ya | | |
| Absensi dua jalur (kantor, lapangan) | Ya | | |
| Dispatch round-robin + reassign admin | Ya | | |
| Tiket PSB dan pengaduan + SLA 08.00–20.00 | Ya | | |
| Work Order ke PWA, BAST tanda tangan layar, dan approval Admin | Ya | | |
| Thumbnail foto + cadangan Google Drive | Ya | | |
| Peta GIS ODP + routing jalan (OSRM publik, fallback garis lurus) | Ya | | |
| Notifikasi dalam aplikasi + telepon manual admin | Ya | | |
| Push PWA, lalu WhatsApp (Mekari Qontak) | | Ya | |
| OTP SMS pada BAST | | Ya | |
| Billing, invoice, payment gateway, auto-isolir | | | Ya |
| Perubahan profil kecepatan otomatis ke Mikrotik | | | Ya |
| NOC otomatis (Mikrotik/BRAS, SNMP OLT) | | | Ya |
| Deploy container OSRM mandiri | | | Ya |

> Kolom `debt_amount` dan `billing_cycle_day` dipakai di MVP dan diisi manual oleh Admin/CS; setiap perubahan tercatat di audit log. Kolom `auto_isolate` dan `billing_token` tidak dibuat di migrasi MVP dan ditambahkan lewat modul billing. `suspended` tetap hanya sebagai nilai status, diubah manual oleh Admin/CS.

---

## 3. Aturan SLA (Service Level Agreement)
Jam SLA hanya berjalan **Senin–Sabtu pukul 08.00–20.00 WIB**, kecuali hari libur nasional; di luar jendela itu jam berhenti dan lanjut otomatis pada jam operasional berikutnya.

| Jenis Tiket | Mulai Dihitung | Target |
| :--- | :--- | :--- |
| **PSB** | Tiket berstatus ditugaskan | BAST ditandatangani dalam 24 jam operasional; waktu menunggu approval Admin tidak dihitung |
| **Pengaduan, Respons** | Tiket berstatus ditugaskan | Status diterima dalam 2 jam operasional |
| **Pengaduan Kritis, Penyelesaian** | Tiket berstatus ditugaskan | 3 jam operasional (bawaan, diatur Superadmin) |
| **Pengaduan Tinggi, Penyelesaian** | Tiket berstatus ditugaskan | 6 jam operasional (bawaan, diatur Superadmin) |
| **Pengaduan Sedang, Penyelesaian** | Tiket berstatus ditugaskan | 24 jam operasional (bawaan, diatur Superadmin) |

### Aturan Perhitungan:
- Waktu disimpan dalam UTC; perhitungan SLA memakai zona Asia/Jakarta (UTC+7).
- Tiket yang masuk pukul 21.00 mulai dihitung pukul 08.00 hari kerja berikutnya. Tiket yang masuk Minggu mulai dihitung Senin 08.00.
- Daftar hari libur nasional disimpan di tabel `holidays`, dikelola Superadmin, dan diperbarui setiap awal tahun.
- *Contoh:* PSB ditugaskan Sabtu 18.00 memakai 2 jam di Sabtu, lalu lanjut Senin 08.00; Senin memakai 12 jam, lalu target 24 jam operasional jatuh pada Selasa 18.00 (Selasa memakai 10 jam).

### SLA Pengaduan yang Dapat Diatur:
- Superadmin mengatur durasi tiap prioritas di `sla_settings`.
- Admin menetapkan prioritas tiap tiket pengaduan sebelum tiket dibagikan; perubahan prioritas pada tiket berjalan hanya oleh Admin dan dicatat di audit log.
- Target dalam menit disalin ke tiket saat dibuat (`sla_target_minutes`), sehingga mengubah `sla_settings` hanya memengaruhi tiket baru.
- Setiap perubahan `sla_settings` dicatat: siapa, kapan, nilai lama, dan nilai baru.
- Semua target SLA, termasuk Kritis, dihitung dalam jam operasional 08.00–20.00.
- Saat reopen, SLA dihitung ulang dari awal berdasarkan jenis gangguan terbaru.

### Pause SLA:
- Hanya Admin/NOC yang bisa mem-pause, dengan salah satu dari **lima alasan baku** dan foto bukti ber-GPS; teknisi tidak bisa.
- Lima alasan baku:
  1. Pelanggan tidak di tempat atau rumah terkunci;
  2. Izin lokasi atau pemilik rumah ditolak sementara;
  3. Kendala jaringan atas atau kabel distribusi pusat putus (di luar tanggung jawab tim);
  4. Cuaca ekstrem atau force majeure;
  5. Menunggu material tambahan di gudang.
- Selama pause, jam SLA tidak berjalan; setiap pause dan resume dicatat di audit log dengan nama Admin/NOC dan durasinya.

### Eskalasi:
- Pada **75% target terpakai**, tiket ditandai kuning di dasbor Admin/NOC.
- Pada **100% target terpakai**, tiket ditandai merah dan Admin/NOC wajib memilih: *reassign*, *pause* dengan alasan, atau tetap dengan catatan.
- Pelanggaran SLA dicatat per tim untuk KPI.

---

## 4. State Machine Tiket
Tiket bergerak lewat satu jalur utama; hanya Admin/NOC yang dapat menunda atau membatalkan, dan tiket baru selesai setelah BAST bertanda tangan dan disetujui Admin.

### Siapa Memicu Apa:
- **Sistem**: Baru menjadi `ditugaskan` lewat round-robin, setelah Admin menetapkan prioritas untuk tiket pengaduan. Tiket terkunci pada tim penerima; teknisi tidak punya tombol oper-tugas, dan hanya Admin dari Web Admin yang dapat reassign dengan audit.
- **Teknisi**: `diterima`, `dalam_perjalanan`, `dikerjakan`, dan mengunggah bukti, tanda tangan BAST, serta foto kunjungan.
- **Admin**: Menyetujui BAST di Web Admin; setelah itu tiket `selesai` dan pelanggan menjadi `active`. BAST yang ditolak Admin kembali ke `dikerjakan` untuk diperbaiki.
- **Admin/CS**: Reopen dari `selesai` kembali ke `dikerjakan` maksimal **3 x 24 jam (jam kalender)** setelah selesai. Saat reopen, Admin menetapkan jenis gangguan terbaru dan SLA dihitung ulang dari awal memakai target prioritas itu. Lewat batas waktu wajib membuat tiket pengaduan baru, supaya metrik SLA dan kinerja teknisi tetap bersih.

### Konflik Offline:
- Tiket di-reassign Admin saat teknisi offline: perubahan teknisi yang tersinkron setelahnya ditolak dan dicatat sebagai konflik.
- Transisi yang tidak sah menurut diagram ditolak server.
- Dua perangkat mengirim data berbeda untuk tiket yang sama: kiriman yang diterima server lebih dulu menang, sisanya masuk antrean konflik untuk ditinjau Admin.
- Pemegang tiket adalah tim; teknisi yang hadir saat BAST dicatat sebagai individu.

---

## 5. State Machine Pelanggan dan Siklus Port ODP
Pelanggan menjadi `active` hanya setelah BAST bertanda tangan dan disetujui Admin, dan port ODP milik pelanggan `terminated` ditahan 30 hari sebelum dilepas.

### Aturan Port ODP:
- Satu port hanya untuk satu pelanggan pada satu waktu; constraint unik parsial pada `(odp_id, odp_port)` mencakup pelanggan `active` dan port berstatus `held`.
- Status `terminated` hanya dapat ditetapkan Admin/CS atau Superadmin lewat Web Admin, misalnya atas permintaan berhenti berlangganan atau blacklist karena menunggak lebih dari 2 bulan.
- Saat status menjadi `terminated`, masa tahan 30 hari dimulai otomatis; setelah itu port dilepas otomatis.
- Pelanggan yang aktif kembali dalam masa tahan memakai port yang sama.
- Riwayat pemakaian port disimpan di tabel terpisah (`odp_port_history`) agar jejak audit tidak hilang saat port dilepas.
- Di MVP, koneksi PPPoE tidak diputus otomatis: sistem membuat tugas manual untuk NOC saat pelanggan menjadi `suspended` atau `terminated`.
- Admin dapat melepas port lebih awal *(usulan)*.

---

## 6. Absensi per Peran dan Batas Anti-Fake GPS
Absensi memiliki dua jalur: kantor untuk peran berbasis kantor dan teknisi, lapangan untuk sales dan collector.

| Peran | Jalur | Syarat Sah |
| :--- | :--- | :--- |
| **Superadmin, Admin/CS, NOC/Dispatcher** | Kantor | Dalam radius 50 m dari kantor terdekat dan terhubung ke IP Wi-Fi sah kantor itu |
| **Teknisi** | Kantor | Sama dengan jalur kantor; **tidak ada jalur lapangan** |
| **Sales, Collector** | Lapangan | Selfie + geotag + akurasi GPS tercatat; status `field_checkin`; tidak perlu Wi-Fi |

### Aturan Tambahan:
- Absen lapangan yang ditandai mencurigakan (akurasi bulat sempurna, titik kembar, lompatan lokasi) masuk antrean tinjauan Admin, bukan ditolak otomatis.
- Absen kantor yang gagal karena GPS meleset (akurasi indoor sering 20–50 m) boleh diajukan manual dengan alasan; Admin menyetujui atau menolak, dan semuanya dicatat.
- Jika Wi-Fi kantor mati, Admin dapat menandai gangguan Wi-Fi hari itu pada kantor terkait sehingga syarat IP dilonggarkan sementara (tetap wajib radius 50 m).
- Tim yang belum absen atau sedang cuti tidak ikut giliran round-robin hari itu.

### Batas Deteksi Fake GPS di PWA:
PWA tidak bisa membaca status mock location di level sistem operasi. Deteksi micro-jitter (3 sampel dalam 3 detik) dan impossible travel (di atas 80 km/jam) hanya penanda risiko, bukan jaminan. Syarat IP Wi-Fi kantor adalah faktor yang paling sulit dipalsukan untuk jalur kantor; untuk jalur lapangan, selfie dan tinjauan Admin menjadi kontrol utama. Impossible travel tidak dihitung untuk absen pertama pada hari itu.

---

## 7. BAST dengan Tanda Tangan Non-Sertifikat
BAST ditandatangani pelanggan langsung di layar PWA teknisi tanpa sertifikat elektronik dan tanpa integrasi PSrE, sehingga seluruh alur bisa selesai offline.

1. Teknisi menyelesaikan instalasi dan mengunggah foto bukti (ONT + OPM) ber-GPS.
2. Pelanggan memverifikasi data layanan, lalu menandatangani di layar; tanda tangan wajib dilakukan di tempat.
3. Teknisi mengambil foto lapangan ber-GPS sebagai bukti kunjungan.
4. PWA menyimpan paket di outbox Dexie dan menyinkronkannya saat ada sinyal.
5. Server membuat PDF BAST, mengunci hash SHA-256, dan mencatat waktu server.
6. Admin meninjau dan menyetujui BAST di Web Admin; setelah itu tiket selesai dan pelanggan `active`.

### Data Bukti yang Wajib Dicatat:
- Hash SHA-256 dokumen, koordinat GPS, dan foto ONT + OPM.
- Nama pelanggan, NIK dalam bentuk masked, dan identitas teknisi yang hadir.
- Waktu perangkat dan waktu server dicatat terpisah, karena tanda tangan offline baru mendapat waktu server saat sinkron.

### Urutan Wajib di Lapangan:
Langkah 1 (bukti dan tanda tangan BAST) harus selesai sebelum langkah 2 (foto kunjungan) terbuka. Tidak ada status `pending_signature`. Jika pelanggan tidak di tempat atau menolak menandatangani, tiket tetap dikerjakan, dan Admin/NOC mem-pause SLA dengan alasan baku *"pelanggan tidak di tempat"* lalu menjadwalkan ulang. Pelanggan tetap pending sampai BAST disetujui Admin.

---

## 8. Spesifikasi Teknis yang Dipertajam

| Area | Spesifikasi |
| :--- | :--- |
| **Device Binding** | PWA membuat token perangkat acak yang didaftarkan ke `devices` dan disetujui Superadmin. Maksimal 2 perangkat terdaftar per akun, tetapi hanya 1 sesi aktif; login di perangkat kedua mengakhiri sesi di perangkat pertama. Token hilang saat data browser dihapus, maka perangkat didaftarkan ulang. Perangkat lama atau hilang dicabut Superadmin. |
| **Autentikasi & Sesi** | Satu mekanisme: Laravel Sanctum, menggantikan JWT. Web Admin memakai sesi cookie HttpOnly + CSRF, batas 4 jam. PWA memakai token buram per perangkat, hanya disimpan sebagai hash di database, kedaluwarsa 12 jam dan terikat ke perangkat terdaftar. Mencabut perangkat atau menonaktifkan staf menghapus token seketika. Rate limiting pada `/login` dan unggah berkas, CSP ketat, dan 2FA untuk Superadmin dan Admin *(usulan)*. |
| **Idempotency-Key** | Disimpan di Redis selama 24 jam, cakupan per user + endpoint. Payload sama mengembalikan respons semula; payload berbeda dengan key sama ditolak (HTTP 409). |
| **Upload Foto & Cadangan** | Kompresi di klien ke ≤400 KB. Server menyimpan berkas asli di private storage; job queue membuat thumbnail 30–50 KB untuk dasbor, menghitung hash SHA-256, lalu menyalin ke Shared Drive Google Drive perusahaan lewat service account. `drive_file_id` disimpan, dan salinan ditandai berhasil hanya setelah hash cocok; gagal diulang bertahap. Foto dan thumbnail diakses lewat signed URL. EXIF dibersihkan kecuali GPS, unggah bisa dilanjutkan. |
| **Enkripsi Kolom** | NIK dan `pppoe_password` dienkripsi AES-256; kunci disimpan di luar database (env terpisah atau KMS) dan dirotasi berkala. NIK tampil masked secara default; setiap akses ke data penuh dicatat di audit log. |
| **Database** | Indeks pada `phone_normalized`, `nik_hash`, `odp_id`, `status`, dan kolom tanggal. Constraint unik parsial pada `(odp_id, odp_port)` untuk pelanggan active atau port held yang belum soft-delete. Dibuat database-agnostic lewat kolom generated yang bernilai NULL untuk baris tidak aktif. Query jarak memakai Haversine; PostGIS opsional bila memakai PostgreSQL. |
| **Routing Peta** | OSRM publik gratis di MVP. Hasil rute di-cache di Redis 7 hari per pasangan ODP-pelanggan; bila layanan down atau timeout, tampilkan garis lurus. OSRM mandiri lewat container masuk modul tambahan. |
| **Backup & Retensi** | Backup database tiap jam ke penyimpanan di luar server (RPO 1 jam, RTO 2 jam, uji restore berkala). Retensi: Activity Log 6 bulan lalu dihapus; foto bukti dan BAST selama kontrak + 6 bulan setelah terminated; absensi 1 tahun. |
| **Penanganan Data Pelanggan** | Persetujuan (consent) atas pengumpulan NIK, lokasi, dan foto rumah dicatat saat pendaftaran. Alur permintaan akses dan penghapusan data mengikuti UU PDP dan diproses Admin/CS. |
| **Migrasi Pelanggan Existing** | CSV lewat `customers:import`: menormalisasi nomor HP, membuat `nik_hash`, mengenkripsi NIK, mencocokkan kode ODP, dan memasukkan pelanggan sebagai active tanpa alur PSB, ditandai sumber import. Mode `--dry-run` melaporkan duplikat, bentrok port ODP, dan format salah; impor berjalan per batch bertransaksi. |

---

## 9. Non-Functional Requirements (NFR) dan Uji Beban
Target performa diuji pada skala proyeksi 3 tahun: 5.000 pelanggan aktif dan 20 tim lapangan, dengan uji tekanan sampai 15.000 pelanggan (3 kali lipat).

| ID | Persyaratan | Target |
| :--- | :--- | :--- |
| **NFR-01** | Halaman daftar admin (p95) | < 500 ms pada 5.000 pelanggan; diuji juga pada 15.000 |
| **NFR-02** | Pembagian satu tiket lewat round-robin | < 200 ms |
| **NFR-03** | Bundle awal PWA lapangan terkompresi | < 250 KB; peta dimuat lazy; code-splitting per rute |
| **NFR-04** | Foto bukti | ≤ 400 KB setelah kompresi di klien; thumbnail 30–50 KB |
| **NFR-05** | Backup database (RPO) | Otomatis tiap jam ke penyimpanan di luar server; kehilangan data maksimal 1 jam |
| **NFR-06** | Monitoring | Alert untuk antrean Horizon macet, error rate API, ruang penyimpanan foto, dan kegagalan salinan Drive |
| **NFR-07** | Pemulihan (RTO) dan ketersediaan | Pemulihan total maksimal 2 jam; uptime 99,5% per bulan |
| **NFR-08** | Uji restore | Dijadwalkan berkala agar RTO terbukti |

---

## 10. Pengaturan Superadmin
Superadmin mengatur semua aturan operasional yang bisa berubah lewat UI, sehingga perubahan aturan tidak membutuhkan perubahan kode.

| Pengaturan | Isi | Catatan |
| :--- | :--- | :--- |
| **Role dan Hak Akses** | Matriks permission per modul dan aksi (lihat, buat, ubah, hapus, setujui) untuk tiap role: Superadmin, Admin/CS, NOC/Dispatcher, Teknisi, Sales, Collector | Hanya Superadmin; Superadmin tidak bisa mencabut hak dirinya sendiri sampai nol; perubahan tercatat di audit log |
| **Jenis Gangguan (CRUD)** | Nama, deskripsi, prioritas bawaan (Kritis, Tinggi, Sedang), status aktif | Jenis yang sudah dipakai tiket hanya dinonaktifkan, tidak dihapus permanen |
| **SLA Settings** | Durasi penyelesaian per prioritas di `sla_settings`; bawaan 3, 6, dan 24 jam operasional | Disalin ke tiket saat dibuat; setiap perubahan tercatat |
| **Lokasi Kantor** | Nama, koordinat, radius (bawaan 50 m), IP Wi-Fi sah, penanda gangguan Wi-Fi sementara | Multi-kantor; kantor terdekat terdeteksi otomatis |
| **Jam Operasional & Libur** | Bawaan 08.00–20.00 WIB, Senin–Sabtu; hari libur nasional di `holidays` | Diperbarui tiap awal tahun |
| **Alasan Baku Pause SLA** | Lima alasan bawaan | Dapat dikelola |
| **Perangkat & 2FA** | Menyetujui dan mencabut devices; 2FA TOTP untuk Superadmin dan Admin *(usulan)* | Pencabutan menghentikan sesi seketika |
| **Master Data** | Paket, OLT, ODP | Dikelola via Web Admin |
| **Impor Pelanggan** | Unduh template, pratinjau dry-run, jalankan impor, unduh laporan galat, atur pemetaan nilai Status | Template CSV 35 kolom |

---

## 11. Data Pelanggan dan Impor CSV (35 Kolom)
Pelanggan lama masuk lewat template CSV biasa dengan 35 kolom (UTF-8, header di baris pertama), yang dapat diunduh dari UI Superadmin. Pemisah (koma, titik koma, atau tab) dikenali otomatis.

| No | Kolom CSV | Field Sistem | Aturan & Keterangan |
| :--- | :--- | :--- | :--- |
| 1 | No | *diabaikan* | Nomor urut baris |
| 2 | ID User | `legacy_user_id` | ID pengguna dari sistem lama |
| 3 | ID Pelanggan | `customer_code` | Unik; jika kosong, sistem membuat kode otomatis |
| 4 | Tanggal Dibuat | `created_at`, `subscribed_at` | Format "07 May 2026" di-parse |
| 5 | Nama | `name` | Nama lengkap pelanggan |
| 6 | NIK | `nik`, `nik_hash` | Boleh kosong; terenkripsi; hash untuk deteksi duplikat |
| 7 | Email | `email` | Alamat email pelanggan |
| 8 | Alamat | `address` | Alamat lengkap pemasangan |
| 9 | Koordinat | `latitude`, `longitude` | Format "lat,lng" dipecah; "-" atau kosong berarti tanpa koordinat |
| 10 | Nomor Telepon | `phone`, `phone_normalized` | Format 62xxxxxxxxxx; "-", "...", atau kosong dianggap kosong |
| 11 | Tipe | `service_type` | Contoh: PPPOE; nilai tidak dikenal dilaporkan |
| 12 | Server | `bras_id` | Dicari atau dibuat berdasarkan nama (misal: "Server Distribusi Utama X86") |
| 13 | Collector | `collector_name` | Disimpan sebagai teks (misal: "Kantor Resmi FibermediaPlay") |
| 14 | Username | `pppoe_username` | Unik; contoh pola nama@ID User |
| 15 | Password | `pppoe_password` | Terenkripsi AES-256 |
| 16 | Paket | `package_id` | Dicocokkan persis dengan nama paket |
| 17 | Harga | `price` | Format "Rp. 155.000" di-parse menjadi integer 155000 |
| 18 | Local Address | `pppoe_local_address` | Nullable; untuk modul NOC mendatang |
| 19 | Remote Address | `pppoe_remote_address` | Disimpan sebagai teks; bisa berupa nama pool |
| 20 | Parent Queue | `parent_queue` | "none" menjadi kosong |
| 21 | Rate Limit | `rate_limit` | Disimpan apa adanya sebagai teks Mikrotik |
| 22 | Berlangganan | `subscription_period` | Periode langganan berupa teks (contoh: "1 Bulan") |
| 23 | Expired Date | `expired_at` | Format "10 Jan 2027" |
| 24 | Status | `status` | Pemetaan: Active -> `active`, isolir/suspend -> `suspended`, berhenti/nonaktif -> `terminated` |
| 25 | ONU Index | `onu_index` | Nullable |
| 26 | Nama ODP | `odp_id` | "-" berarti tanpa ODP; jika diisi, dicari/dibuat otomatis |
| 27 | Alamat ODP | Bagian master ODP | Disimpan bila ODP baru dibuat |
| 28 | Koordinat ODP | Bagian master ODP | Disimpan bila ODP baru dibuat |
| 29 | Keterangan ODP | Bagian master ODP | Disimpan bila ODP baru dibuat |
| 30 | Port ODP | `odp_port` | Ditolak bila bentrok dengan constraint port |
| 31 | Hutang | `debt_amount` | "-" menjadi 0 |
| 32 | Wilayah | `area` | Nama area operasional |
| 33 | Teknisi | `install_team_id` | Lewat tim teknisi; tidak ditemukan/"-": dikosongkan |
| 34 | Sales | `sales_id` | Berdasarkan nama; "-" dikosongkan |
| 35 | Catatan | `notes` | Catatan tambahan |

---

## 12. Keputusan Akhir Terkunci
- [x] **SLA PSB** berhenti saat BAST ditandatangani; waktu menunggu approval Admin tidak dihitung.
- [x] **BAST yang ditolak Admin** kembali ke `dikerjakan` untuk diperbaiki teknisi.
- [x] **Reopen** maksimal 3 x 24 jam (jam kalender) setelah tiket selesai. SLA dihitung ulang dari awal.
- [x] **Autentikasi**: Laravel Sanctum menggantikan JWT.
- [x] **Absensi Teknisi**: Hanya di kantor (radius 50 m + Wi-Fi IP sah).
- [x] **Billing**: Dilakukan manual via `debt_amount` & `billing_cycle_day`; modul otomatisasi billing bukan bagian dari MVP.
- [x] **Constraint Port ODP**: Masa tahan 30 hari (*held*) untuk pelanggan *terminated*.
