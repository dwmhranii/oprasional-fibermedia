import { GeofenceStatus } from '../types';

/**
 * Calculates the great circle distance between two points on the earth (specified in decimal degrees)
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evaluates geofence status based on PRD requirements:
 * - Inside: distance <= radius (and accuracy <= radius)
 * - Outside: distance > radius
 * - Low Accuracy: GPS accuracy is worse than radius (e.g., accuracy > 50m), cannot guarantee real position
 * - Unverified: customer or office has no coordinates
 */
export function evaluateGeofence(
  currentLat: number,
  currentLng: number,
  currentAccuracy: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number = 50
): {
  distanceMeters: number;
  status: GeofenceStatus;
  isAllowed: boolean;
} {
  if (!targetLat || !targetLng) {
    return {
      distanceMeters: 0,
      status: 'unverified',
      isAllowed: false,
    };
  }

  const distanceMeters = calculateDistanceMeters(
    currentLat,
    currentLng,
    targetLat,
    targetLng
  );

  // If GPS accuracy is worse than the radius itself (e.g. accuracy is 75m for a 50m fence)
  if (currentAccuracy > radiusMeters) {
    return {
      distanceMeters,
      status: 'low_accuracy',
      isAllowed: false,
    };
  }

  if (distanceMeters <= radiusMeters) {
    return {
      distanceMeters,
      status: 'inside',
      isAllowed: true,
    };
  }

  return {
    distanceMeters,
    status: 'outside',
    isAllowed: false,
  };
}

/**
 * Standard test locations for rapid verification
 */
export const DEFAULT_OFFICE_COORDINATES = {
  name: 'Kantor Pusat Fibermedia (Jl. Merdeka No. 10)',
  latitude: -6.2087634,
  longitude: 106.845599,
  radius_meters: 50,
};

export const SIMULATION_LOCATIONS = [
  {
    label: 'Di Dalam Kantor (Valid 12m)',
    lat: -6.20874,
    lng: 106.84562,
    accuracy: 8,
  },
  {
    label: 'Di Batas Geofence Kantor (42m)',
    lat: -6.20845,
    lng: 106.84575,
    accuracy: 12,
  },
  {
    label: 'Di Luar Radius Kantor (145m - Ditolak)',
    lat: -6.2075,
    lng: 106.8465,
    accuracy: 10,
  },
  {
    label: 'GPS Akurasi Rendah (Akurasi ±90m)',
    lat: -6.20876,
    lng: 106.8456,
    accuracy: 95,
  },
];
