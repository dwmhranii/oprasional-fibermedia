# PANDUAN PETA OFFLINE PMTILES FIBERMEDIA-OPS

Dokumen ini menjelaskan prosedur ekstraksi, penyimpanan, dan penyajian peta dasar vektor offline berbasis **PMTiles** (Protomaps + OpenStreetMap) untuk area layanan Fibermedia (Malang Bululawang dan sekitarnya).

---

## 1. Area Bounding Box & Konfigurasi Ekstraksi

- **Wilayah Layanan:** Malang Bululawang
- **Koordinat Bounding Box (BBOX):** `[112.55, -8.15, 112.75, -8.00]`
  - Min Longitude: `112.55`
  - Min Latitude: `-8.15`
  - Max Longitude: `112.75`
  - Max Latitude: `-8.00`
- **Pusat Peta (Center):** `[112.637789, -8.081413]` (Zoom: `14`)
- **Tingkat Zoom:** Min `10`, Max `16` (cukup detail untuk nama jalan, gang, dan posisi tiang ODP).

---

## 2. Langkah Ekstraksi Berkas `area.pmtiles`

### Prasyarat Alat (CLI)
1. Unduh binary CLI `pmtiles` dari repositori resmi:
   ```bash
   # Linux x86_64
   curl -LO https://github.com/protomaps/go-pmtiles/releases/download/v1.22.1/go-pmtiles_1.22.1_Linux_x86_64.tar.gz
   tar -xzf go-pmtiles_1.22.1_Linux_x86_64.tar.gz
   sudo mv pmtiles /usr/local/bin/
   ```

2. Jalankan ekstraksi langsung dari sumber planet OSM Protomaps (atau file Indonesia OSM):
   ```bash
   pmtiles extract https://build.protomaps.com/20261015.pmtiles storage/app/tiles/area.pmtiles \
     --bbox=112.55,-8.15,112.75,-8.00 \
     --maxzoom=16
   ```

3. **Ukuran Berkas Hasil Ekstraksi:**
   - Estimasi ukuran berkas `area.pmtiles` untuk area $\approx 22 \times 17$ km dengan maxzoom 16 adalah **14.8 MB s.d. 18.5 MB**.
   - Berkas ini disimpan di: [`storage/app/tiles/area.pmtiles`](file:///d:/Project/FIbermedia%20Project/Fibermedia-Ops/storage/app/tiles/area.pmtiles).

---

## 3. Konfigurasi Server HTTP Range (Nginx)

PMTiles membutuhkan web server yang mendukung HTTP Range Request (`Accept-Ranges: bytes`) agar klien (MapLibre di Admin SPA maupun Dexie/OPFS di PWA teknisi) hanya mengunduh byte tile yang sedang dilihat di layar, bukan seluruh file 15 MB sekaligus.

Contoh blok konfigurasi Nginx:
```nginx
# Penyajian berkas PMTiles dengan dukungan HTTP Range Request
location /api/network/tiles/area.pmtiles {
    alias /var/www/fibermedia-ops/storage/app/tiles/area.pmtiles;
    
    # Dukungan chunk byte-range
    add_header Accept-Ranges bytes;
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Range, Content-Type";
    add_header Access-Control-Expose-Headers "Content-Range, Content-Length, Accept-Ranges";
    
    # Cache browser untuk tile statis
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
}
```

---

## 4. Endpoint Manifest Peta (`GET /api/network/tiles/manifest`)

Endpoint ini mengembalikan metadata peta vektor untuk klien web dan mobile:
```json
{
  "name": "Fibermedia Area Bululawang Vector Tiles",
  "version": "2026.10.1",
  "size_bytes": 15728640,
  "size_formatted": "15.0 MB",
  "url": "http://localhost:8000/api/network/tiles/area.pmtiles",
  "bounds": [112.55, -8.15, 112.75, -8.0],
  "center": [112.637789, -8.081413, 14],
  "minzoom": 10,
  "maxzoom": 16,
  "attribution": "© Fibermedia Ops, OpenStreetMap contributors, Protomaps"
}
```

---

## 5. Atribusi Wajib

Sesuai Aturan Bisnis #14, semua tampilan peta wajib mencantumkan atribusi:
> **"© OpenStreetMap contributors, Protomaps, Fibermedia Ops"**
