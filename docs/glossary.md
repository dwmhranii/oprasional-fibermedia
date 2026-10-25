# Kamus Istilah Baku (Glossary) Fibermedia-Ops

Dokumen ini merupakan panduan tunggal resmi (*Single Source of Truth*) untuk seluruh penamaan konsep, tombol, status, dan format antarmuka di Portal Admin (`resources/js/admin`), PWA Lapangan (`resources/js/field`), serta pesan respon backend (`app/`).

Seluruh antarmuka menggunakan **Bahasa Indonesia Baku**, dengan mempertahankan istilah teknis telekomunikasi standar (*PPPoE, OLT, ODC, ODP, BRAS, ONU, GPS, KPI*).

---

## 1. Konsep Entitas & Operasional

| Konsep Bisnis | Istilah Baku | Istilah yang Dilarang | Keterangan & Ketentuan Penggunaan |
|---|---|---|---|
| **Pengguna Layanan ISP** | **Pelanggan** | Customer, Klien, User Pelanggan | Wajib menggunakan istilah **Pelanggan** dan **ID Pelanggan**. Kata *Pengguna* hanya untuk staf/admin internal. |
| **Akun Staf Internal** | **Pengguna** | User, Karyawan, Account | Mengacu pada akun login karyawan di menu *Pengguna & Peran*. |
| **Tiket Gangguan Layanan** | **Tiket Pengaduan** / **Pengaduan** | Tiket Gangguan, Complaint, Komplain, Keluhan | Kata **Gangguan** HANYA digunakan untuk status fisik jaringan (ODC/ODP/kabel), BUKAN nama jenis tiket. |
| **Pemasangan Baru** | **Pemasangan (PSB)** | Provisioning, New Installation, Instalasi | Dituliskan lengkap atau disingkat **PSB**. |
| **Perintah Kerja Lapangan** | **Work Order** | SPK, Tugas, Task | Gunakan tepat satu istilah: **Work Order** (disingkat WO pada tabel padat). Tidak ada istilah SPK. |
| **Unit Lapangan** | **Tim** | Team, Kelompok, Group | Bahasa Indonesia baku. Setiap tim terdiri dari 2 anggota teknisi setara. |
| **Anggota Unit Lapangan** | **Anggota** | Ketua, Lead, Leader, Anggota 1, Anggota 2 | Tidak ada peran hierarkis ketua/lead dalam tim operasional lapangan. |
| **Peran Petugas Lapangan** | **Teknisi** | Technician, Petugas, Installer | Peran personil teknis operasional. |
| **Peran Penjualan** | **Sales** | Penjual, Marketing, Agen | Peran personil penjualan pendaftaran pelanggan. |
| **Pencatatan Kehadiran** | **Absensi** | Presensi, Kehadiran, Clock-in, Check-in | Menggunakan istilah **Absensi**, **Absensi Harian**, dan **Rekap Absensi**. |
| **Aksi Masuk Kerja** | **Absen Masuk** | Clock In, Check In, Masuk | Tombol resmi pencatatan kehadiran datang. |
| **Aksi Pulang Kerja** | **Absen Pulang** | Clock Out, Check Out, Pulang | Tombol resmi pencatatan kehadiran pulang. |
| **Tahap 1 Tiket** | **Tahap 1: Pengerjaan** | Fase 1, Phase 1 | Pengerjaan fisik lapangan dan pengunggahan bukti dokumentasi. Kata *Fase* dilarang di UI tiket. |
| **Tahap 2 Tiket** | **Tahap 2: Absensi di Lokasi** | Fase 2, Phase 2 | Absensi swafoto geofence di lokasi pelanggan. |

---

## 2. Status & Badge Antarmuka

### 2.1 Status Pelanggan
- **Aktif** (`active`) — Berlangganan normal dan jaringan terhubung.
- **Terisolir** (`suspended`) — Diputus sementara akibat administrasi / pembayaran jatuh tempo.
- **Berhenti** (`terminated`) — Berhenti berlangganan dan perangkat ditarik.

### 2.2 Status Jaringan (ODC, ODP, Kabel Fiber)
- **Normal** (`normal`) — Perangkat dan jalur optik berfungsi optimal.
- **Gangguan** (`disrupted`) — Redaman drop, fluktuasi sinyal, atau kendala parsial.
- **Putus** (`cut`) — Kabel putus total (*LOS*).
- **Pemeliharaan** (`maintenance`) — Sedang dalam jadwal perbaikan terencana.

### 2.3 Status Tiket & Work Order
- **Belum Ditugaskan** (`unassigned`) — Tiket baru yang belum memiliki tim teknisi.
- **Menunggu Diterima** (`assigned`) — Tiket telah didispatch ke tim teknisi lapangan.
- **Dikerjakan** (`in_progress`) — Tim teknisi sedang aktif mengerjakan di lokasi.
- **Perlu Ditinjau** (`phase_1_completed` / `pending_review`) — Tahap 1 selesai dan menunggu peninjauan admin.
- **Selesai** (`resolved` / `completed`) — Tiket selesai tervalidasi dan layanan pelanggan normal.

### 2.4 Status Peninjauan (Review)
- **Tidak Perlu** (`not_required`) — Pekerjaan tidak memerlukan tinjauan khusus.
- **Perlu Ditinjau** (`pending`) — Dokumen / foto bukti menunggu verifikasi tim admin.
- **Disetujui** (`approved`) — Seluruh bukti pengerjaan telah disetujui.
- **Kerja Ulang** (`rework`) — Bukti ditolak, teknisi diminta memperbaiki pengerjaan di lokasi.
- **Bermasalah** (`flagged`) — Ditemukan anomali fisik atau kecurangan titik koordinat.

### 2.5 Status Lokasi (Geofence)
- **Di dalam radius** (`inside`) — Petugas berada dalam toleransi radius kantor / rumah pelanggan (< 50 m).
- **Di luar radius** (`outside`) — Petugas berada di luar batas geofence.
- **Akurasi rendah** (`low_accuracy`) — Sinyal GPS lemah atau deviasi horizontal terlalu tinggi.
- **Belum diverifikasi** (`unverified`) — Lokasi belum divalidasi oleh sistem GPS.

### 2.6 Status Absensi Harian
- **Hadir** (`hadir`)
- **Izin** (`izin`)
- **Sakit** (`sakit`)
- **Alpa** (`alpa`)

---

## 3. Tombol dan Aksi Standar

| Aksi Baku | Larangan |
|---|---|
| **Tambah** | Add, Create, Baru |
| **Ubah** | Edit, Update, Sunting |
| **Hapus** | Delete, Remove |
| **Simpan** | Save, Submit |
| **Batal** | Cancel |
| **Cari** | Search |
| **Terapkan Filter** | Apply Filter, Filter Data |
| **Atur Ulang** | Reset, Clear |
| **Muat Ulang** | Refresh, Segarkan, Reload |
| **Ekspor Excel** | Export, Export to Excel |
| **Impor Excel** | Import, Import Data |
| **Unduh** | Download |
| **Terima** | Accept |
| **Tolak** | Reject, Decline |
| **Tugaskan** | Assign, Dispatch |
| **Setujui** | Approve |
| **Minta Ulang** | Return, Minta Perbaikan |
| **Tandai Bermasalah** | Flag Issue, Mark Problem |

---

## 4. Standar Format Data

1. **Tanggal:** Format `"24 Okt 2026"` (3 huruf singkatan bulan Indonesia: Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des).
2. **Waktu / Jam:** 24 jam dengan penunjuk zona `"13:45 WIB"`.
3. **Mata Uang:** `"Rp 150.000"` (Simbol Rp diikuti satu spasi, titik pemisah ribuan, tanpa desimal sen).
4. **Angka:** Titik sebagai pemisah ribuan (`1.000.000`), koma sebagai pemisah desimal (`12,5`).
5. **Jarak:** Meter `"50 m"`, atau kilometer `"1,2 km"` untuk jarak >= 1.000 meter.
6. **Kecepatan Internet:** `"20 Mbps"`, `"50 Mbps"`, `"100 Mbps"`.
7. **Koordinat GPS:** Enam digit desimal presisi (`-8.113200, 112.641500`).
8. **Nomor Telepon:** Tampilan berformat `"0812-3456-7890"`, disimpan normalisasi format E.164 (`+6281234567890` atau `081234567890`).

---

## 5. Standar 38 Judul Kolom Tabel Pelanggan

Daftar baku judul kolom pelanggan:
1. `No`
2. `ID Pelanggan`
3. `Ref Eksternal`
4. `Nama Pelanggan`
5. `NIK`
6. `Nomor Telepon`
7. `Email`
8. `Alamat`
9. `Latitude`
10. `Longitude`
11. `Tipe Layanan`
12. `Server BRAS`
13. `Kolektor`
14. `Username Layanan`
15. `Password Layanan`
16. `Paket Layanan`
17. `Harga Bulanan`
18. `Local Address`
19. `Remote Address`
20. `Parent Queue`
21. `Rate Limit`
22. `Tanggal Berlangganan`
23. `Tanggal Jatuh Tempo`
24. `Status`
25. `Status Online`
26. `Terakhir Online`
27. `Terakhir Offline`
28. `IP Saat Ini`
29. `MAC Address`
30. `Session Uptime`
31. `ONU Index`
32. `ODP`
33. `Port ODP`
34. `Hutang`
35. `Wilayah`
36. `Tim Pemasang`
37. `Sales`
38. `Catatan`
