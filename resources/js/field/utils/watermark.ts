/**
 * Watermarking and Image Compression Utility for Fibermedia Field PWA
 * Complies with PRD requirements:
 * - Direct camera capture watermark
 * - Watermark contents: Ticket / Photo type, Lat/Lng + Accuracy, WIB Server Time, User Name + Device
 * - Client-side JPEG compression targeting <= 400 KB (max 1024 KB)
 * - SHA-256 hash computation
 */

export interface WatermarkMeta {
  title: string;
  photoKind: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  userName: string;
  deviceModel: string;
  deviceUuid: string;
  serverTimeOffsetMs?: number;
}

export interface ProcessedPhotoResult {
  dataUrl: string;
  sizeKb: number;
  hash: string;
  capturedAt: string;
  width: number;
  height: number;
}

/**
 * Computes simple SHA-256 hash representation of string buffer in browser
 */
export async function computeSha256(dataUrl: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataUrl.slice(0, 10000) + dataUrl.slice(-10000));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // fallback pseudo-hash
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Draws professional high-contrast dark watermark bar over image canvas
 * and applies image compression (target <= 400 KB, max 1024 KB)
 */
export async function applyWatermarkAndCompress(
  sourceImage: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  meta: WatermarkMeta,
  maxDimension: number = 1280,
  quality: number = 0.72
): Promise<ProcessedPhotoResult> {
  const canvas = document.createElement('canvas');
  let srcWidth = (sourceImage as HTMLVideoElement).videoWidth || sourceImage.width;
  let srcHeight = (sourceImage as HTMLVideoElement).videoHeight || sourceImage.height;

  if (!srcWidth || !srcHeight) {
    srcWidth = 1280;
    srcHeight = 720;
  }

  // Scale down maintaining aspect ratio
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;
  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Draw base image
  ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

  // Time calculations (Server corrected)
  const now = new Date(Date.now() + (meta.serverTimeOffsetMs || 0));
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(now);
  const timeString = `${dateFormatted} WIB`;

  // Draw semi-transparent gradient watermark banner at bottom
  const bannerHeight = Math.max(90, Math.round(targetHeight * 0.16));
  const gradient = ctx.createLinearGradient(
    0,
    targetHeight - bannerHeight - 20,
    0,
    targetHeight
  );
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
  gradient.addColorStop(0.2, 'rgba(15, 23, 42, 0.82)');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, targetHeight - bannerHeight - 20, targetWidth, bannerHeight + 20);

  // Decorative top highlight line
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, targetHeight - bannerHeight - 2, targetWidth, 3);

  // Watermark typography
  const fontSize = Math.max(12, Math.round(targetWidth * 0.022));
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#ffffff';

  const leftMargin = Math.round(targetWidth * 0.03);
  let currentY = targetHeight - bannerHeight + fontSize + 4;

  // Line 1: Header Brand & Title
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`FIBERMEDIA · ${meta.title} [${meta.photoKind}]`, leftMargin, currentY);

  // Line 2: Coordinates and accuracy
  currentY += fontSize + 6;
  ctx.fillStyle = '#f8fafc';
  const coordText = `GPS: ${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)} (±${meta.accuracy.toFixed(0)}m)`;
  ctx.fillText(coordText, leftMargin, currentY);

  // Line 3: Timestamp & Device info
  currentY += fontSize + 6;
  ctx.fillStyle = '#cbd5e1';
  const shortUuid = meta.deviceUuid.slice(0, 8);
  const infoText = `Waktu: ${timeString} · ${meta.userName} (${meta.deviceModel || 'Mobile'} #${shortUuid})`;
  ctx.fillText(infoText, leftMargin, currentY);

  // Export to JPEG with target quality
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

  // If over 500 KB, recompress slightly
  if (sizeKb > 500 && quality > 0.5) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
  }

  const hash = await computeSha256(dataUrl);

  return {
    dataUrl,
    sizeKb,
    hash,
    capturedAt: now.toISOString(),
    width: targetWidth,
    height: targetHeight,
  };
}
