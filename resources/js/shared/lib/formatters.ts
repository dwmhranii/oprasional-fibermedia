/**
 * Centralized formatting helpers adhering to Fibermedia-Ops Design Standards
 * - Mata uang: "Rp 150.000"
 * - Tanggal: "24 Okt 2026"
 * - Jam: "13:45 WIB"
 * - Tanggal & Jam: "24 Okt 2026 13:45 WIB"
 * - Jarak: "50 m" atau "1,2 km"
 * - Kecepatan: "20 Mbps"
 * - Koordinat: "-8.113200, 112.641500" (6 desimal)
 * - Telepon: "0812-3456-7890"
 */

const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Format angka ke format mata uang Rupiah baku: "Rp 150.000"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';

  const parts = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${parts}`;
}

/**
 * Format angka umum dengan titik ribuan dan koma desimal
 */
export function formatNumber(val: number | string | null | undefined, decimals = 0): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';

  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

/**
 * Parsing aman string tanggal / Date object
 */
function parseDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  
  // Format YYYY-MM-DD atau ISO
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format tanggal ke format baku: "24 Okt 2026"
 */
export function formatDate(val: string | Date | null | undefined): string {
  const d = parseDate(val);
  if (!d) return '-';

  const day = d.getDate();
  const month = ID_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format jam ke format baku: "13:45 WIB"
 */
export function formatTime(val: string | Date | null | undefined): string {
  const d = parseDate(val);
  if (!d) return '-';

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes} WIB`;
}

/**
 * Format tanggal dan waktu: "24 Okt 2026 13:45 WIB"
 */
export function formatDateTime(val: string | Date | null | undefined): string {
  const d = parseDate(val);
  if (!d) return '-';

  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * Format jarak: "50 m" atau "1,2 km"
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) return '-';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = (meters / 1000).toFixed(1).replace('.', ',');
  return `${km} km`;
}

/**
 * Format kecepatan internet: "20 Mbps"
 */
export function formatSpeed(mbps: number | string | null | undefined): string {
  if (mbps === null || mbps === undefined || mbps === '') return '-';
  const num = typeof mbps === 'string' ? parseFloat(mbps) : mbps;
  if (isNaN(num)) return '-';
  return `${Math.round(num)} Mbps`;
}

/**
 * Format koordinat GPS tepat 6 desimal: "-8.113200, 112.641500"
 */
export function formatCoordinate(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return '-';
  if (isNaN(lat) || isNaN(lng)) return '-';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Format nomor telepon untuk tampilan: "0812-3456-7890"
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return phone;

  // Format lokal 08xx atau 628xx
  let normalized = clean;
  if (clean.startsWith('62')) {
    normalized = '0' + clean.slice(2);
  }

  if (normalized.length >= 10 && normalized.length <= 13) {
    const p1 = normalized.slice(0, 4);
    const p2 = normalized.slice(4, 8);
    const p3 = normalized.slice(8);
    return `${p1}-${p2}-${p3}`;
  }

  return phone;
}

/**
 * Normalisasi nomor telepon untuk penyimpanan / API (menghilangkan tanda minus dan spasi)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  return digits;
}
