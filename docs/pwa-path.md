# ARSITEKTUR JALUR /PWA, ISOLASI PENYIMPANAN, & KEAMANAN ORIGIN
**Panduan Teknis Penyatuan Origin dan Jalur Aplikasi Lapangan (/pwa)**  
*Tanggal: 25 Oktober 2026*

---

## 1. PENDAHULUAN

Aplikasi Lapangan (Field PWA) dan Web Manajemen (Admin SPA) kini dilayani pada **origin yang sama** (tanpa subdomain seperti `admin.localhost` atau `app.localhost`), di mana:
- **Admin SPA**: Beroperasi di akar domain (`/`, `/dashboard`, `/customers`, dst.).
- **Field PWA**: Beroperasi secara eksklusif di jalur `/pwa/*` (`/pwa`, `/pwa/work-orders`, `/pwa/attendance`, dst.).

Penyatuan origin ini menyederhanakan konfigurasi infrastruktur dan sertifikat SSL, namun memerlukan isolasi ketat pada Service Worker, Cache Storage, IndexedDB, dan LocalStorage agar kedua aplikasi tidak saling menginterferensi.

---

## 2. PEMBAGIAN RUTE & PENYAJIAN LARAVEL

Penyajian dokumen HTML ditangani di [routes/web.php](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/routes/web.php):

1. **Jalur PWA (`/pwa{any?}`)**:
   - Menangkap seluruh URL yang diawali dengan `/pwa`.
   - Mengembalikan berkas shell PWA: `field.html` (atau `public/field.html`).
   - Header respons menyertakan Content-Security-Policy ketat.
2. **Jalur Admin (`/{any?}`)**:
   - Menangkap seluruh URL aplikasi selain `/pwa/*`, `/api/*`, `/docs/*`, `/storage/*`, `/build/*`, `/up/*`, dan aset statis.
   - Mengembalikan berkas shell Admin: `index.html` (atau `public/index.html`).

---

## 3. ISOLASI SERVICE WORKER & CACHE STORAGE

### 3.1 Scope Service Worker
- **PWA Service Worker**:
  - Berkas: `/pwa/sw.js` (dibuat via Workbox / VitePWA).
  - Scope pendaftaran: strictly `'/pwa/'`.
  - PWA hanya meng-intercept permintaan di bawah `/pwa/*` dan `/api/*` untuk antrean luring.
- **Admin SPA**:
  - **TIDAK mendaftarkan Service Worker**.
  - Saat Admin pertama kali dimuat, skrip [resources/js/admin/main.tsx](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/resources/js/admin/main.tsx) mengeksekusi deregistrasi otomatis terhadap Service Worker apa pun yang scope-nya mencakup akar (`/`):
    ```ts
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          if (!reg.scope.includes('/pwa/')) {
            reg.unregister();
          }
        }
      });
    }
    ```

### 3.2 Awalan Cache Storage (*Cache Prefix*)
- Seluruh cache yang dibuat oleh PWA wajib diawali dengan **`fm-pwa-`** (contoh: `fm-pwa-runtime-v1`, `fm-pwa-tiles-v1`).
- Admin membersihkan cache apa pun yang tidak berawalan `fm-pwa-` untuk memastikan aset dinamis admin selalu segar dari server.

---

## 4. ISOLASI PENYIMPANAN DATA LOKAL (STORAGE PREFIXES)

Karena origin sama, `window.localStorage` dan `indexedDB` dibagi bersama antara Admin dan PWA. Diterapkan aturan prefix ketat:

### 4.1 LocalStorage
- **Admin SPA**: Wajib berawalan **`fm-admin:`**
  - `fm-admin:auth_token`
  - `fm-admin:auth_token_type`
  - `fm-admin:auth_login_at`
  - `fm-admin:theme`
  - `fm-admin:active_tab`
- **Field PWA**: Wajib berawalan **`fm-pwa:`**
  - `fm-pwa:auth_token`
  - `fm-pwa:user`
  - `fm-pwa:permissions`
  - `fm-pwa:device_uuid`
  - `fm-pwa:last_active_tab`

### 4.2 IndexedDB (Dexie)
- Basis data luring PWA diberi nama: **`fm_pwa`** (menggantikan nama lama `FibermediaFieldDB`).
- Admin SPA tidak pernah membaca atau menulis ke basis data `fm_pwa`.

---

## 5. KEAMANAN CONTENT-SECURITY-POLICY (CSP) & RISIKO SATU ORIGIN

### Risiko Satu Origin:
Bila terjadi celah XSS pada salah satu sisi (misal input pada Admin), penyerang secara teoritis memiliki akses origin ke cookie dan storage PWA jika tidak diproteksi.

### Mitigasi:
1. **CSP Tanpa Skrip Inline (`'unsafe-inline'` dilarang untuk script)**:
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
   ```
2. **Sesi Cookie Sanctum HttpOnly**:
   - Token sesi disimpan pada cookie `httpOnly`, `SameSite=Lax`, dan `Secure` pada HTTPS, sehingga JavaScript tidak dapat membaca rahasia autentikasi.
3. **Penyimpanan Token Cadangan**:
   - Token otentikasi luring PWA disimpan dengan prefix `fm-pwa:auth_token` dan hanya dikirimkan ke `/api/*`.

---

## 6. PANDUAN PENGUJIAN PWA DI JALUR /PWA

1. **Pengujian Lokal**:
   - Jalankan backend: `php artisan serve` (biasanya pada `http://localhost:8000`).
   - Jalankan vite dev atau build: `npm run build`.
   - Buka browser pada alamat: `http://localhost:8000/pwa`.
   - Pastikan halaman menampilkan antarmuka mobile/lapangan PWA.
   - Buka DevTools $\rightarrow$ Application $\rightarrow$ Service Workers:
     - Pastikan Service Worker terdaftar dengan Scope: `http://localhost:8000/pwa/`.
2. **Pengujian Hak Akses `pwa.access`**:
   - Login dengan akun yang memiliki izin `pwa.access` (Admin, Teknisi, Sales): /pwa terbuka normal.
   - Login dengan akun tanpa izin `pwa.access`: Sistem menampilkan halaman peringatan 403 rapi dan melarang akses fitur lapangan.

---

## 7. PANDUAN PEMASANGAN ULANG (RE-INSTALL) PWA BAGI PERANGKAT LAMA

Bagi perangkat smartphone teknisi/sales yang sebelumnya telah memasang PWA dari subdomain lama (`app.<domain>` atau `app.localhost`):
1. **Hapus Aplikasi PWA Lama**:
   - Tekan lama ikon aplikasi "Fibermedia Field" di layar beranda ponsel $\rightarrow$ pilih **Uninstall / Hapus Aplikasi**.
2. **Bersihkan Cache Peramban (Chrome / Edge Mobile)**:
   - Buka Chrome di ponsel $\rightarrow$ Pengaturan $\rightarrow$ Privasi & Keamanan $\rightarrow$ Hapus data penjelajahan untuk domain terkait.
3. **Buka Alamat Baru**:
   - Buka peramban dan navigasikan ke: `https://<domain>/pwa`.
4. **Pasang Ulang PWA Baru**:
   - Tekan menu tiga titik di peramban $\rightarrow$ pilih **"Tambahkan ke Layar Utama"** atau **"Instal Aplikasi"**.
   - PWA baru akan terpasang dengan scope `/pwa/` dan manifest `/pwa/manifest.webmanifest`.
