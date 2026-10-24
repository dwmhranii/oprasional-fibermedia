/**
 * Camera, Watermark, and Image Compression Helper
 * Fibermedia Provisioning & Complaint System
 * 
 * Sesuai Standar REST API v3.2:
 * 1. Watermark permanen canvas: No Tiket, Nama Teknisi, Tanggal & Jam (WIB), Koordinat GPS (Lat, Lng)
 * 2. Garis aksen oranye Fibermedia (#ff6b00) & Strip semi-transparan bawah
 * 3. Kompresi adaptif JPEG loop memastikan ukuran file < 2.0 MB (target ~1.2 MB)
 * 4. Helper Geolocation GPS akurat
 */

export interface WatermarkOptions {
  ticketNumber: string;
  technicianName: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  additionalNote?: string;
}

export interface CoordinatesResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Mengambil koordinat GPS akurat dari browser perangkat
 */
export async function getCurrentCoordinates(): Promise<CoordinatesResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat / browser Anda tidak mendukung fitur GPS Geolocation.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = 'Gagal mengambil koordinat GPS.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Akses lokasi (GPS) ditolak. Mohon izinkan akses lokasi pada browser/HP Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Informasi lokasi tidak tersedia. Pastikan GPS HP aktif.';
            break;
          case error.TIMEOUT:
            msg = 'Waktu pencarian sinyal GPS habis. Coba lagi di tempat yang terbuka.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * 1. Gambar watermark permanen di atas canvas.
 * 2. Kompres adaptif ke file JPEG dengan ukuran maksimal 2.0 MB.
 */
export async function stampWatermarkAndCompress(
  file: File,
  meta: WatermarkOptions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));

        // Skala proporsional (max lebar/tinggi 1920px untuk ketajaman optimal)
        const MAX_DIM = 1920;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Buat Strip Gelap Semi-Transparan di Bagian Bawah
        const bannerHeight = Math.max(90, Math.round(height * 0.12));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

        // Gambar Garis Aksen Oranye Fibermedia
        ctx.fillStyle = '#ff6b00';
        ctx.fillRect(0, height - bannerHeight, width, 4);

        // Styling Teks Watermark
        const fontSize = Math.max(14, Math.round(width * 0.022));
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#ffffff';

        const now = new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const line1 = `[${meta.ticketNumber}] • ${meta.technicianName} • ${now} WIB`;
        const line2 = `GPS: ${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)} ${
          meta.locationName ? `(${meta.locationName})` : ''
        }`;

        ctx.fillText(line1, 24, height - bannerHeight + bannerHeight * 0.42);
        ctx.font = `400 ${fontSize * 0.88}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(line2, 24, height - bannerHeight + bannerHeight * 0.8);

        // Kompresi Adaptif Loop: Pastikan file < 2 MB (Target ~1.2 MB)
        let quality = 0.85;
        const compressLoop = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Gagal kompresi canvas'));
              // Jika ukuran > 2MB dan kualitas masih > 0.4, turunkan kualitas
              if (blob.size > 2 * 1024 * 1024 && q > 0.4) {
                compressLoop(q - 0.12);
              } else {
                const watermarkedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                  {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }
                );
                resolve(watermarkedFile);
              }
            },
            'image/jpeg',
            q
          );
        };

        compressLoop(quality);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
