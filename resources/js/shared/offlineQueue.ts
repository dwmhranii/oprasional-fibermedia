import Dexie, { Table } from 'dexie';

export interface OfflineRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string; // JSON string or base64 data
  idempotencyKey: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  errorNote?: string;
}

export interface LocalOdp {
  id: number;
  client_uuid?: string;
  code: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  proposed_latitude?: number | null;
  proposed_longitude?: number | null;
  port_capacity: number;
  wilayah?: string;
  status?: string;
  is_approved?: boolean;
  used_ports?: number[];
  updated_at?: string;
}

export interface LocalCableTrack {
  id?: number;
  client_uuid: string;
  name: string;
  coordinates: [number, number][]; // [longitude, latitude]
  raw_points_count: number;
  simplified_points_count: number;
  total_length_meters: number;
  status: string;
  notes?: string;
  timestamp: number;
}

export class FibermediaDatabase extends Dexie {
  offlineQueue!: Table<OfflineRequest, number>;
  odps!: Table<LocalOdp, number>;
  cableTracks!: Table<LocalCableTrack, number>;

  constructor() {
    super('FibermediaFieldDB');
    this.version(1).stores({
      offlineQueue: '++id, idempotencyKey, timestamp, status',
    });
    this.version(2).stores({
      offlineQueue: '++id, idempotencyKey, timestamp, status',
      odps: '++id, client_uuid, code, name, latitude, longitude, wilayah, status, is_approved, updated_at',
      cableTracks: '++id, client_uuid, name, status, timestamp',
    });
  }
}

export const db = new FibermediaDatabase();

/**
 * Enqueue a request to Dexie IndexedDB when offline (Aturan 10).
 */
export async function enqueueOfflineRequest(
  url: string,
  method: string,
  bodyData: any,
  token?: string | null
): Promise<OfflineRequest> {
  const idempotencyKey = 'idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req: OfflineRequest = {
    url,
    method,
    headers,
    body: typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData),
    idempotencyKey,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  const id = await db.offlineQueue.add(req);
  return { ...req, id };
}

/**
 * Process pending offline queue when online.
 */
export async function flushOfflineQueue(onSuccess?: (req: OfflineRequest) => void): Promise<{ processed: number; failed: number }> {
  if (!navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const pending = await db.offlineQueue.where('status').equals('pending').toArray();
  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await db.offlineQueue.update(item.id!, { status: 'syncing' });

      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (res.ok || res.status === 422) {
        // Successful or processed with validation error
        await db.offlineQueue.update(item.id!, { status: 'completed' });
        processed++;
        if (onSuccess) onSuccess(item);
      } else {
        await db.offlineQueue.update(item.id!, {
          status: 'failed',
          retryCount: item.retryCount + 1,
          errorNote: `HTTP ${res.status}`,
        });
        failed++;
      }
    } catch (err) {
      await db.offlineQueue.update(item.id!, {
        status: 'failed',
        retryCount: item.retryCount + 1,
        errorNote: String(err),
      });
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Hitung jarak Haversine antara dua titik koordinat (dalam meter).
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ambil ODP terdekat dari database Dexie lokal (Item 3).
 * Berjalan 100% offline tanpa koneksi jaringan.
 */
export async function getNearestOdps(
  userLat: number,
  userLng: number,
  limit: number = 10
): Promise<(LocalOdp & { distance_meters: number })[]> {
  const allOdps = await db.odps.toArray();

  const withDistances = allOdps
    .filter((odp) => odp.latitude && odp.longitude)
    .map((odp) => {
      const dist = haversineDistance(userLat, userLng, odp.latitude, odp.longitude);
      return {
        ...odp,
        distance_meters: Math.round(dist),
      };
    })
    .sort((a, b) => a.distance_meters - b.distance_meters);

  return withDistances.slice(0, limit);
}

/**
 * Sederhanakan titik GPS menggunakan toleransi meter (misal ~3 m) (Item 5).
 * Menghilangkan titik-titik yang terlalu rapat saat merekam jalur kabel.
 */
export function simplifyCoordinates(
  points: [number, number][], // [longitude, latitude]
  toleranceMeters: number = 3
): [number, number][] {
  if (points.length <= 2) return points;

  const result: [number, number][] = [points[0]];
  let lastPoint = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    // current[0] = lng, current[1] = lat
    const dist = haversineDistance(lastPoint[1], lastPoint[0], current[1], current[0]);
    if (dist >= toleranceMeters) {
      result.push(current);
      lastPoint = current;
    }
  }

  // Titik akhir selalu disertakan
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Sinkron data ODP incremental dari server ke Dexie (Item 3).
 */
export async function syncNetworkData(token?: string | null): Promise<{ added: number; updated: number; deleted: number }> {
  const lastSync = localStorage.getItem('fmp_network_last_sync');
  const url = lastSync ? `/api/network/sync?since=${encodeURIComponent(lastSync)}` : '/api/network/sync';

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Sync failed with status ${res.status}`);
  }

  const json = await res.json();
  const data = json.data;

  let added = 0;
  let updated = 0;
  let deleted = 0;

  await db.transaction('rw', db.odps, async () => {
    // 1. Hapus ODP yang ditandai deleted
    if (data.deleted_odp_ids && Array.isArray(data.deleted_odp_ids)) {
      for (const delId of data.deleted_odp_ids) {
        await db.odps.delete(delId);
        deleted++;
      }
    }

    // 2. Masukkan / update ODP baru atau berubah
    if (data.odps && Array.isArray(data.odps)) {
      for (const odp of data.odps) {
        const usedPorts = data.used_ports?.[odp.id] || [];
        const existing = await db.odps.get(odp.id);
        if (existing) {
          await db.odps.update(odp.id, {
            ...odp,
            used_ports: usedPorts,
          });
          updated++;
        } else {
          await db.odps.put({
            ...odp,
            used_ports: usedPorts,
          });
          added++;
        }
      }
    }
  });

  if (data.sync_timestamp) {
    localStorage.setItem('fmp_network_last_sync', data.sync_timestamp);
  }

  return { added, updated, deleted };
}

/**
 * Unduh berkas peta offline PMTiles dan simpan ke Cache Storage / OPFS (Item 1).
 */
export async function downloadOfflineMap(
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<{ success: boolean; version: string; sizeFormatted: string }> {
  // 1. Minta persistent storage agar tidak dibersihkan otomatis oleh browser (terutama iOS/Safari)
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // Ignored
    }
  }

  // 2. Ambil manifest peta
  const manifestRes = await fetch('/tiles/manifest');
  if (!manifestRes.ok) {
    throw new Error('Gagal mengambil manifest peta dari server');
  }
  const manifest = await manifestRes.json();
  const tileUrl = manifest.url || '/tiles/area.pmtiles';

  // 3. Unduh berkas pmtiles dengan progress streaming
  const response = await fetch(tileUrl);
  if (!response.ok) {
    throw new Error(`Gagal mengunduh peta: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : manifest.size_bytes || 15000000;
  let loaded = 0;

  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        if (onProgress) {
          const pct = Math.min(100, Math.round((loaded / total) * 100));
          onProgress(pct, loaded, total);
        }
      }
    }
  }

  // 4. Buat Blob dan simpan ke Cache Storage
  const blob = new Blob(chunks, { type: 'application/vnd.pmtiles' });
  if ('caches' in window) {
    const cache = await caches.open('fibermedia-pmtiles-v1');
    const cacheResponse = new Response(blob, {
      headers: {
        'Content-Type': 'application/vnd.pmtiles',
        'Content-Length': String(blob.size),
        'X-Pmtiles-Version': manifest.version,
      },
    });
    await cache.put('/tiles/area.pmtiles', cacheResponse);
  }

  localStorage.setItem('fmp_offline_map_version', manifest.version);
  localStorage.setItem('fmp_offline_map_downloaded_at', new Date().toISOString());
  localStorage.setItem('fmp_offline_map_size', manifest.size_formatted);

  return {
    success: true,
    version: manifest.version,
    sizeFormatted: manifest.size_formatted,
  };
}
