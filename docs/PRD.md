# PRD dan Rancangan Implementasi Sistem Fibermedia
**Tanggal:** Oct 23, 2026 · @Rani

## Ringkasan dan Tujuan
Sistem provisioning Fibermedia yang sudah berjalan diubah menjadi satu aplikasi manajemen operasional ISP: tiket PSB dan gangguan dibagi ke tim secara bergilir, kehadiran dibuktikan per hari dan per tiket, dan kinerja tim serta individu dihitung otomatis sebagai KPI.

**Kondisi sekarang:** Backend Laravel 12 sudah memiliki PSB, pengaduan, tim, dan alur dua fase. Audit kode menemukan sepuluh kekurangan, yang utama: dua algoritma penugasan berbeda, keanggotaan tim hanya berupa teks, tidak ada absensi harian, ada "ketua" tersembunyi, tiket bisa macet kalau satu anggota libur, dan belum ada KPI.

### Tujuan Produk
1. Satu algoritma pembagian tiket yang adil, urut, dan aman dari tiket bersamaan.
2. Tiket hanya jatuh ke tim yang benar-benar masuk kerja hari itu.
3. Bukti kerja di lapangan sulit dipalsukan: waktu dari server, lokasi, foto langsung dari kamera, dan hash file.
4. KPI tim dan individu yang dihitung dari catatan kejadian, bukan dari input manual.
5. Satu repositori, satu deploy, tanpa microservice.

### Ukuran Keberhasilan
| Ukuran | Target |
| :--- | :--- |
| Tiket dibagi lewat satu algoritma giliran | 100% |
| Tiket dobel ke tim yang sama akibat tiket bersamaan | 0 |
| Tiket tertunda yang otomatis terbagi setelah tim siap | ≤ 1 menit |
| Tiket macet karena anggota tidak hadir | 0 |
| Foto bukti dengan waktu server, koordinat, dan hash | ≥ 95% |
| Laporan KPI bulanan terbit tanpa input manual | tanggal 1 tiap bulan |
| Respons halaman daftar admin (p95) pada 1.000 pelanggan | < 500 ms |

---

## Ruang Lingkup dan Asumsi
Cakupan versi ini adalah operasional lapangan: PSB, pengaduan, tim, absensi, bukti kerja, dan KPI. Tagihan, integrasi BRAS, dan manajemen ODP masuk fase berikutnya.

### Termasuk
• Penugasan tim dengan giliran urut, terpisah untuk PSB dan gangguan.  
• Absensi harian wajib untuk semua peran (admin, CS, teknisi, sales) lewat PWA, dan syarat "tim siap".  
• Fase 1 (kerja bersama tim) dan Fase 2 (absen individu di lokasi) yang seragam untuk PSB dan pengaduan.  
• Oper otomatis saat tim tidak merespons, dan antrean tiket "Belum Ditugaskan".  
• PWA baru untuk semua peran (hanya absensi bagi admin dan CS; absensi plus layar kerja bagi teknisi dan sales), dengan antrean offline.  
• KPI tim, KPI individu, dan snapshot bulanan.  
• Pembersihan repositori dan penataan ulang menjadi satu folder; data pelanggan lengkap dengan master ODP dan register BRAS dasar.  

### Tidak Termasuk (Sekarang)
• Penagihan dan pembayaran pelanggan (tetap manual; hanya disiapkan kolom status bayar).  
• Komisi sales (sales hanya mendapat KPI untuk sekarang).  
• WhatsApp gateway otomatis. Sementara memakai tautan wa.me: tiket dari WhatsApp diisi manual oleh admin lalu menjadi pengaduan, dan rating pelanggan diinput admin dari balasan WhatsApp.  
• Integrasi API ke BRAS/Mikrotik (register BRAS dicatat manual dulu).  
• Aplikasi native Android atau iOS.  
• Pemisahan menjadi microservice.  

### Asumsi
• Satu kelompok teknisi untuk seluruh kota: 4 tim, masing-masing 2 anggota. Satu teknisi hanya di satu tim aktif.  
• Semua anggota tim setara, tanpa ketua.  
• Sekitar 1.000 pelanggan; teknisi memakai HP pribadi.  
• Tidak ada batas jumlah tiket terbuka per tim; batas bisa diaktifkan lewat pengaturan bila nanti diperlukan.  
• Sistem belum dipakai produksi, sehingga migrasi boleh merestrukturisasi tanpa jendela pemeliharaan.  
• Pengembang tunggal, sehingga setiap tahap harus bisa dirilis dan diuji sendiri.  
• Database PostgreSQL 16.  

---

## Peran dan Hak Akses
| Peran | Antarmuka | Yang Boleh Dilakukan |
| :--- | :--- | :--- |
| **Superadmin** | Web admin | Semua fitur admin, kelola user, role, tim dan anggotanya, pengaturan dispatch dan KPI, audit log. Boleh menugaskan manual dan menutup tiket dengan alasan. |
| **Admin / CS** | Web admin | Validasi pengajuan PSB, buat dan kelola tiket pengaduan, pantau antrean dan peta, verifikasi bukti (approve atau return), laporan. Tidak mengatur tim dan pengaturan sistem. |
| **Teknisi** | PWA lapangan | Absen harian, melihat tiket tim, menerima tiket, Fase 1 dan Fase 2, mengunggah bukti. Tidak melihat data tagihan, tidak memilih atau memindahkan tiket sendiri. |
| **Sales** | PWA lapangan | Input dan edit pengajuan PSB sendiri, unggah dokumen, memantau status pengajuan dan komisi/KPI sendiri. |

---

## Arsitektur Satu Folder (Unified Monolith)
Aplikasi tetap satu proyek Laravel MVC, hanya kodenya dikelompokkan per modul bisnis; tidak ada microservice.
Admin dan PWA memanggil API yang sama, dan role serta policy dijaga di server. Dispatch adalah inti yang dipakai bersama oleh PSB dan pengaduan.

```
fibermedia/
├── app/Modules/{Auth,Customer,Psb,Complaint,Network,Dispatch,Field,Attendance,Kpi}/
│   └── Models · Services · Http/Controllers · Requests · Resources · Events · Jobs · Policies
├── app/Console · routes/api.php · routes/web.php · database/migrations
├── resources/js/admin     FE admin yang sekarang
├── resources/js/field     PWA teknisi dan sales (baru)
├── resources/js/shared    komponen UI, api client, helper kamera
└── vite.config.ts         dua entry: admin dan field
```

---

## Pengaturan yang Bisa Diubah Superadmin
| Pengaturan | Default | Berlaku untuk |
| :--- | :--- | :--- |
| `min_members_present` | 1 | tim |
| `max_open_tickets_per_team` | tanpa batas | PSB dan gangguan |
| `auto_reassign_enabled` | gangguan: aktif, PSB: mati | per jenis tiket |
| `response_timeout_minutes` | 15 | per jenis tiket |
| `max_auto_reassign` | 2 | per jenis tiket |
| `auto_assign_on_checkin_enabled` | aktif | global |
| `geofence_radius_meters` (tiket) | 50 (batas bawah 50) | global |
| `office_locations` (titik kantor) | radius 50 (batas bawah 50) | global |
| `attendance_location_policy` | wajib di kantor | global |
| `work_start_time` & `late_tolerance_minutes` | kosong (tidak dipakai) | global |
| `kpi_count_late` | mati | global |
| `phase2_required_policy` | anggota yang hadir | global |
| `attendance_required_roles` | semua peran | global |
| `photo_target_kb` & `photo_max_kb` | target 400, terima sampai 1024 | global |
