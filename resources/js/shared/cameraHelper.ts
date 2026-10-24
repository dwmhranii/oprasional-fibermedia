/**
 * Camera & Compression Helper (Aturan 9 & Fase 3)
 * - Hanya dari kamera langsung (getUserMedia) tanpa galeri.
 * - Watermark GPS + jam server-terkoreksi + device id.
 * - Kompresi di HP: target <= 400 KB (untuk KTP/KK target 1600 px / <= 600 KB).
 * - Perhitungan SHA-256 di browser via Web Crypto API.
 */

export interface WatermarkOptions {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestampIso?: string;
  deviceId?: string;
}

export interface CapturedImageResult {
  base64: string;
  blob: Blob;
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
  capturedAt: string;
}

/**
 * Hitung hash SHA-256 dari ArrayBuffer di browser.
 */
export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tangkap frame video, bakar watermark, dan kompres sesuai target ukuran.
 *
 * @param videoElement
 * @param isDocument KTP / KK (1600 px, target ~600 KB) vs Foto umum (target ~400 KB)
 * @param watermark GPS, server timestamp, deviceId
 */
export async function captureAndCompressFromVideo(
  videoElement: HTMLVideoElement,
  isDocument: boolean = false,
  watermark?: WatermarkOptions
): Promise<CapturedImageResult> {
  const canvas = document.createElement('canvas');
  let width = videoElement.videoWidth || 1280;
  let height = videoElement.videoHeight || 720;

  // Batas resolusi maksimal
  const maxDim = isDocument ? 1600 : 1280;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  // 1. Gambar frame kamera
  ctx.drawImage(videoElement, 0, 0, width, height);

  // 2. Bakar watermark GPS + Jam Server-Terkoreksi + Device (Aturan 9)
  if (watermark) {
    const bannerHeight = Math.max(36, Math.round(height * 0.08));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    ctx.fillStyle = '#FFFFFF';
    const fontSize = Math.max(12, Math.round(bannerHeight * 0.35));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';

    const timeStr = watermark.timestampIso ? new Date(watermark.timestampIso).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
    const latStr = watermark.latitude !== undefined ? watermark.latitude.toFixed(6) : '-';
    const lngStr = watermark.longitude !== undefined ? watermark.longitude.toFixed(6) : '-';
    const accStr = watermark.accuracy !== undefined ? ` (±${Math.round(watermark.accuracy)}m)` : '';
    const devStr = watermark.deviceId ? ` | Dev: ${watermark.deviceId.substring(0, 10)}` : '';

    const textLine1 = `📍 ${latStr}, ${lngStr}${accStr} | 🕒 ${timeStr}${devStr}`;
    ctx.fillText(textLine1, 12, height - bannerHeight / 2);
  }

  // 3. Kompresi kualitas adaptif (Target: <= 400 KB untuk selfie/lapangan, <= 600 KB untuk KTP/KK)
  const targetMaxBytes = isDocument ? 600 * 1024 : 400 * 1024;
  let quality = 0.82;
  let blob: Blob | null = null;

  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );
    if (!blob) break;
    if (blob.size <= targetMaxBytes || quality <= 0.4) {
      break;
    }
    quality -= 0.12;
  }

  if (!blob) {
    throw new Error('Gagal menghasilkan berkas gambar dari kamera.');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const sha256 = await calculateSha256(arrayBuffer);

  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    base64,
    blob,
    sizeBytes: blob.size,
    sha256,
    width,
    height,
    capturedAt: watermark?.timestampIso || new Date().toISOString(),
  };
}

/**
 * Kompresi berkas gambar dari input file (1600 px, <= 600 KB untuk KTP/KK).
 */
export async function compressImageFile(
  file: File | Blob,
  isDocument: boolean = true,
  watermark?: WatermarkOptions
): Promise<CapturedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = isDocument ? 1600 : 1280;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context tidak tersedia.');
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (watermark) {
          const bannerHeight = Math.max(36, Math.round(height * 0.08));
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

          ctx.fillStyle = '#FFFFFF';
          const fontSize = Math.max(12, Math.round(bannerHeight * 0.35));
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textBaseline = 'middle';

          const timeStr = watermark.timestampIso ? new Date(watermark.timestampIso).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
          const latStr = watermark.latitude !== undefined ? watermark.latitude.toFixed(6) : '-';
          const lngStr = watermark.longitude !== undefined ? watermark.longitude.toFixed(6) : '-';
          const accStr = watermark.accuracy !== undefined ? ` (±${Math.round(watermark.accuracy)}m)` : '';
          const devStr = watermark.deviceId ? ` | Dev: ${watermark.deviceId.substring(0, 10)}` : '';

          const textLine = `📍 ${latStr}, ${lngStr}${accStr} | 🕒 ${timeStr}${devStr}`;
          ctx.fillText(textLine, 12, height - bannerHeight / 2);
        }

        const targetMaxBytes = isDocument ? 600 * 1024 : 400 * 1024;
        let quality = 0.85;
        let blob: Blob | null = null;

        for (let i = 0; i < 5; i++) {
          blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), 'image/jpeg', quality)
          );
          if (!blob) break;
          if (blob.size <= targetMaxBytes || quality <= 0.4) {
            break;
          }
          quality -= 0.12;
        }

        if (!blob) {
          throw new Error('Gagal mengompres gambar.');
        }

        const arrayBuffer = await blob.arrayBuffer();
        const sha256 = await calculateSha256(arrayBuffer);

        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(blob!);
        });

        resolve({
          base64,
          blob,
          sizeBytes: blob.size,
          sha256,
          width,
          height,
          capturedAt: watermark?.timestampIso || new Date().toISOString(),
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Gagal memuat berkas gambar.'));
    img.src = URL.createObjectURL(file);
  });
}
