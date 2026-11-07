# PANDUAN MANAJEMEN PENGGUNA & HAK AKSES (FIBERMEDIA-OPS)
*Revisi: 25 Oktober 2026 (Prompt R2)*

---

## 1. PRINSIP UTAMA SISTEM HAK AKSES

1. **Definisi di Kode, Penugasan di Database**:
   - Seluruh daftar izin (*permissions*), label Bahasa Indonesia, deskripsi, prasyarat, dan peran bawaan didefinisikan secara deklaratif di **KODE** (`app/Modules/<Modul>/permissions.php`).
   - Siapa memegang izin apa ditentukan dan diubah di **DATABASE** melalui UI Matriks Hak Akses Superadmin (`/access/matrix`).
2. **Superadmin Tak Terbatas (Gate::before)**:
   - Superadmin selalu memiliki seluruh hak akses secara otomatis melalui `Gate::before` di `app/Providers/AppServiceProvider.php`.
   - Izin Superadmin tidak dapat diubah, dicabut, atau direset melalui antarmuka atau API.
   - Superadmin terakhir di sistem **dilarang keras** diturunkan jabatannya atau dinonaktifkan.
3. **Role-Agnostic Policy (Bukan Berbasis Nama Role)**:
   - **DILARANG KERAS** menulis pengecekan berbasis nama role di logika bisnis (misal: `if ($user->role === 'teknisi')`).
   - Seluruh otorisasi mengacu pada izin (contoh: `$user->can('customers.create')`, middleware `can:access.manage`).
   - Batasan lapangan (hanya melihat tiket timnya sendiri, hanya melihat pengajuan miliknya) ditegakkan oleh **Policy** berdasarkan kepemilikan dan keanggotaan tim, bukan matriks izin.
4. **Izin `pwa.access`**:
   - `pwa.access` ("Buka aplikasi lapangan") berada di modul "Aplikasi Lapangan (/pwa)".
   - Izin ini adalah pintu masuk menuju `/pwa/*`. Mencabut izin ini menghasilkan layar 403 yang rapi di FE PWA dan menolak endpoint lapangan (403). Izin ini tidak memberi wewenang pengerjaan tiket apapun.

---

## 2. CARA MENAMBAH IZIN BARU KE SISTEM

Untuk menambahkan fitur baru yang memerlukan izin:

### Langkah 1: Daftarkan di Registri Modul
Buka atau buat berkas `app/Modules/<Modul>/permissions.php` dan tambahkan entri array:
```php
[
    'key' => 'contoh.tindakan',
    'module' => 'contoh',
    'module_name' => 'Modul Contoh',
    'label' => 'Nama Tindakan Bahasa Indonesia',
    'description' => 'Deskripsi satu kalimat fungsi wewenang ini.',
    'is_locked' => false, // Set true jika HANYA boleh dimiliki oleh Superadmin
    'is_sensitive' => false, // Set true jika tindakan berisiko tinggi (hapus, ekspor, sandi)
    'default_roles' => ['Superadmin', 'Admin'], // Role bawaan yang langsung menerima saat izin baru didaftarkan
    'prerequisites' => ['contoh.view'], // Izin prasyarat yang wajib ikut aktif
],
```

### Langkah 2: Sinkronkan ke Basis Data
Jalankan perintah Artisan:
```bash
php artisan permissions:sync
```
Perintah ini bersifat **idempoten**:
- Membuat baris permission yang baru di tabel `permissions`.
- Memberikan permission baru tersebut HANYA ke role yang tertera di `default_roles`.
- **Tidak pernah** menimpa atau mencabut konfigurasi kustom yang telah diatur Superadmin pada izin yang sudah ada sebelumnya.
- Melaporkan daftar izin baru yang terdaftar dan izin usang yang ada di database.

### Langkah 3: Gunakan di Backend (Route & Policy)
Lindungi route di `routes/api.php`:
```php
Route::middleware('can:contoh.tindakan')->group(function () {
    Route::post('/contoh', [ContohController::class, 'store']);
});
```
Atau di FormRequest / Controller:
```php
$this->authorize('contoh.tindakan');
// atau:
if (! $request->user()->can('contoh.tindakan')) {
    abort(403, 'Akses ditolak.');
}
```

### Langkah 4: Gunakan di Frontend (React)
Lindungi rute di `App.tsx` atau elemen UI:
```tsx
<RequirePermission can="contoh.tindakan">
  <TombolAksi />
</RequirePermission>
```
Atau via hook `useAuth`:
```tsx
const { can } = useAuth();
if (can('contoh.tindakan')) {
  // tampilkan aksi
}
```

---

## 3. STRUKTUR 5 TAB MENU PENGGUNA & HAK AKSES (`/access`)

Satu pintu manajemen akses operasional berada di URL `/access` dengan lima tab:

| Tab | Alamat | Izin Pelindung | Fungsi Utama |
| --- | --- | --- | --- |
| **Pengguna** | `/access/users` | `users.view`, `users.manage` | Daftar pengguna, filter peran, tombol ubah peran cepat, status `/pwa`, tambah pengguna, reset sandi, nonaktifkan akun. |
| **Role** | `/access/roles` | `access.manage` | Tabel peran sistem dan kustom, buat role baru (dengan opsi salin izin), ubah nama/deskripsi, hapus role kustom tanpa pengguna. |
| **Matriks Izin** | `/access/matrix` | `access.manage` | Pemilih role, checklist permission per modul, auto-prerequisite check/uncheck, ikon gembok untuk wewenang terkunci, panel pratinjau sidebar instan, tombol simpan ber-diff dengan konfirmasi sandi Superadmin, dan reset ke bawaan registri. |
| **Perangkat** | `/access/devices` | `devices.view`, `devices.manage` | Daftar perangkat seluler PWA terdaftar, otorisasi perangkat baru, cabut perangkat hilang/rusak. |
| **Riwayat** | `/access/history` | `audit.view` | Log jejak audit aktivitas hak akses (siapa, kapan, perubahan peran, diff izin ditambah/dicabut). |

---

## 4. KEAMANAN & PENGAMANAN PERUBAHAN HAK AKSES

1. **Konfirmasi Sandi Superadmin**:
   - Setiap penyimpanan perubahan matriks izin pada `PUT /api/roles/{id}/permissions` mewajibkan verifikasi kata sandi Superadmin yang sedang login.
   - Konfirmasi yang salah langsung ditolak dengan status HTTP 422.
2. **Pencatatan Diff Lengkap di `activity_log`**:
   - Setiap izin yang ditambah (`added`) dan dicabut (`revoked`) dicatat ke properti JSON pada tabel `activity_log`.
3. **Pemberitahuan Seketika (Real-time Invalidation)**:
   - Backend memanggil `app()[PermissionRegistrar::class]->forgetCachedPermissions()`.
   - Event Reverb `permissions.changed` disiarkan ke pengguna terdampak.
   - Frontend memuat ulang `GET /api/me` saat fokus, setiap 5 menit, dan saat menerima HTTP 403, sehingga perubahan berlaku tanpa pengguna perlu login ulang.
