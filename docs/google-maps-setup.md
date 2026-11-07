# PANDUAN INTEGRASI PETA LEAFLET & GOOGLE MAPS API
## Fibermedia-Ops FTTH Network System

Dokumen ini menjelaskan arsitektur peta GIS di Fibermedia-Ops, penggunaan engine Leaflet di aplikasi lapangan (PWA), serta panduan langkah-demi-langkah beralih ke Google Maps API.

---

## 1. DUA CARA PENGGUNAAN GOOGLE MAPS

Sistem Fibermedia-Ops mendukung dua pendekatan penggunaan Google Maps:

| Metode | Kebutuhan API Key | Biaya / Kuota | Kinerja & Offline |
| :--- | :--- | :--- | :--- |
| **Metode A: Google Maps XYZ Tile Layer** *(Aktif Saat Ini)* | **Tanpa API Key** | Gratis | Ringan, kompatibel penuh dengan Leaflet & MapLibre |
| **Metode B: Google Maps JavaScript SDK Resmi** | **Wajib API Key GCP** | Kredit gratis \$200/bulan dari Google Cloud | Memerlukan koneksi internet stabil & akun Google Cloud |

---

## METODE A: GOOGLE MAPS TILE LAYER (LEAFLET & MAPLIBRE)

Metode ini sudah terpasang dan langsung dapat digunakan tanpa mendaftar ke Google Cloud Console.

### URL Tile Resmi Google Maps XYZ:
- **Peta Jalan (Roadmap)**:  
  `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`
- **Citra Satelit & Hybrid (Label Jalan + Satelit)**:  
  `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`
- **Citra Satelit Murni (Tanpa Label)**:  
  `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}`
- **Peta Kontur & Medan (Terrain)**:  
  `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}`

### Contoh Implementasi di Leaflet (React):
```typescript
import L from 'leaflet';

// 1. Google Maps Roadmap
const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  attribution: '&copy; Google Maps',
});

// 2. Google Maps Satelit Hybrid
const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  attribution: '&copy; Google Maps Satellite',
});

// Pasang ke peta
googleRoadmap.addTo(mapInstance);
```

---

## METODE B: BERALIH KE GOOGLE MAPS JAVASCRIPT API RESMI

Jika Anda ingin menggunakan SDK resmi Google Maps (misalnya untuk fitur Street View, Google Places Autocomplete, atau Directions Service):

### Langkah 1: Dapatkan Google Maps API Key
1. Masuk ke **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Buat proyek baru, misalnya: `Fibermedia-Ops-GIS`.
3. Aktifkan **Billing** (Google menyediakan kredit gratis \$200 setiap bulan).
4. Masuk ke menu **APIs & Services > Library**, cari dan aktifkan:
   - **Maps JavaScript API**
   - **Places API** (opsional untuk pencarian alamat pelanggan)
   - **Geocoding API** (opsional untuk konversi koordinat ke teks alamat)
5. Masuk ke **APIs & Services > Credentials**, klik **Create Credentials > API Key**.
6. Atur pembatasan keamanan (*Application Restrictions*):
   - Pilih **Websites**.
   - Masukkan domain yang diizinkan:  
     `http://localhost/*`  
     `http://fibermedia-ops.test/*`  
     `https://*.fibermedia.id/*`
7. Simpan API Key Anda.

### Langkah 2: Daftarkan API Key di `.env`
Buka berkas `.env` pada repositori dan tambahkan variabel:
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Langkah 3: Konfigurasi CSP (Content Security Policy)
CSP di `routes/web.php` sudah disiapkan untuk mengizinkan `https://maps.googleapis.com` dan `https://*.googleapis.com`:
```php
$cspHeader = "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://*.googleapis.com; ...";
```

### Langkah 4: Memasang Google Maps SDK di Frontend
Pasang library React Google Maps resmi jika ingin mengganti komponen canvas:
```bash
npm install @react-google-maps/api
```

Contoh pemakaian komponen:
```tsx
import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '16px'
};

const center = {
  lat: -8.081413,
  lng: 112.637789
};

export const GoogleMapComponent = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  if (!isLoaded) return <div>Memuat Google Maps...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={{
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: false,
      }}
    >
      <Marker position={center} title="Kantor Bululawang" />
    </GoogleMap>
  );
};
```

---

## 2. PENJELASAN GALAT: "Only secure origins are allowed" (GPS Geolocation)

### Mengapa Pesan Ini Muncul?
Standar keamanan browser modern (Google Chrome, Microsoft Edge, Safari) membatasi akses GPS perangkat (`navigator.geolocation`) **HANYA** pada domain aman:
- `https://...` (Koneksi SSL terenkripsi)
- `http://localhost` atau `http://127.0.0.1`

Bila diakses melalui nama domain lokal tanpa SSL seperti `http://fibermedia-ops.test`, Chrome secara otomatis menolak permintaan GPS dengan galat:  
`Only secure origins are allowed (see: https://goo.gl/Y0ZknV)`.

### Solusi untuk Pengujian Lokal:

#### Opsi 1: Aktifkan Chrome Flag (Sangat Mudah - Rekomendasi Pengujian)
1. Buka tab baru di browser Google Chrome, ketik pada address bar:
   ```text
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. Pada baris **Insecure origins treated as secure**, masukkan:
   ```text
   http://fibermedia-ops.test
   ```
3. Ubah status dropdown dari *Disabled* menjadi **Enabled**.
4. Klik tombol **Relaunch** di pojok kanan bawah browser Chrome.
5. Selesai! Chrome akan memperlakukan `http://fibermedia-ops.test` layaknya koneksi aman HTTPS, dan GPS serta kamera akan aktif secara normal.

#### Opsi 2: Buka via Localhost
Anda dapat membuka aplikasi langsung melalui alamat localhost:
- Web Admin: `http://localhost:8000` (atau port web server lokal)
- PWA Lapangan: `http://localhost:8000/pwa`

#### Opsi 3: Fallback Otomatis Fibermedia-Ops
Sistem Fibermedia-Ops telah dilengkapi proteksi fallback cerdas: bila halaman dibuka pada lingkungan HTTP lokal tanpa SSL, sistem secara otomatis mendeteksi status origin dan mengisi koordinat default area operasional Bululawang (`-8.081413, 112.637789`) tanpa memblokir alur kerja teknisi maupun staf.

