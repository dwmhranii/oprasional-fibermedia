/**
 * Sinkronisasi Jam HP dengan Jam Server (Aturan 9).
 * Menghitung selisih jam HP lewat GET /time agar bukti waktu valid di server.
 */

let clockSkewMs = 0;
let isSynced = false;

export async function syncServerTime(): Promise<number> {
  const start = Date.now();
  try {
    const res = await fetch('/api/time', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const roundTrip = Date.now() - start;
      const serverMs = data.timestamp_ms || data.timestamp * 1000;
      // Perkiraan waktu server saat respons tiba
      const estimatedServerNow = serverMs + Math.round(roundTrip / 2);
      clockSkewMs = estimatedServerNow - Date.now();
      isSynced = true;
    }
  } catch (err) {
    console.warn('Gagal sinkronisasi waktu server, menggunakan waktu lokal.', err);
  }
  return clockSkewMs;
}

export function getServerTime(): Date {
  return new Date(Date.now() + clockSkewMs);
}

export function getServerTimeIso(): string {
  return getServerTime().toISOString();
}

export function isTimeSynchronized(): boolean {
  return isSynced;
}
