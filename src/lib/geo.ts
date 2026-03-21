import { z } from "zod";

// --- Zod schema ---

export const gpsPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime(),
});

export const gpsPointsSchema = z.array(gpsPointSchema);

export type GpsPoint = z.infer<typeof gpsPointSchema>;

// --- Outdoor types that support GPS ---

export const GPS_ACTIVITY_TYPES = ["run", "hike", "walk", "bike"] as const;

export function isGpsActivityType(type: string): boolean {
  return (GPS_ACTIVITY_TYPES as readonly string[]).includes(type);
}

// --- Haversine distance ---

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute total distance in miles from an array of GPS points.
 * Filters out points with accuracy > 50m to avoid GPS jumps.
 */
export function haversineDistanceMi(points: GpsPoint[]): number {
  const R = 3959; // Earth radius in miles
  const filtered = points.filter((p) => p.accuracy <= 50);
  let total = 0;
  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1]!;
    const curr = filtered[i]!;
    const dLat = toRad(curr.lat - prev.lat);
    const dLng = toRad(curr.lng - prev.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(prev.lat)) *
        Math.cos(toRad(curr.lat)) *
        Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(a));
  }
  return total;
}

// --- Google encoded polyline ---

/**
 * Encode an array of GPS points into a Google encoded polyline string.
 * See: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function encodePolyline(points: GpsPoint[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let result = "";

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    result += encodeSignedValue(lat - prevLat);
    result += encodeSignedValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }

  return result;
}

function encodeSignedValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

/**
 * Decode a Google encoded polyline string into lat/lng pairs.
 */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
