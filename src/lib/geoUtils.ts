/**
 * Utilities for accurate geo-distance and fare calculation in Maleber, Karangtengah, Cianjur.
 */

// Earth radius in kilometers (WGS-84 mean radius)
const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates straight-line distance between two coordinates using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates estimated actual road driving distance (accounting for village winding roads/gangs).
 * In rural/suburban Maleber, actual road distance is ~1.25x straight-line Haversine distance.
 */
export function calculateRoadDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const straightKm = calculateHaversineDistance(lat1, lng1, lat2, lng2);
  if (straightKm === 0) return 0.5;

  // maleber village road winding factor ~1.25x
  const roadKm = straightKm * 1.25;
  // Floor at 0.5 km minimum trip distance
  return Math.max(0.5, Math.round(roadKm * 10) / 10);
}

/**
 * Calculates standard Ojek Maleber fare:
 * - Base rate: Rp 5,000 for first 1.5 km
 * - Additional rate: Rp 2,500 / km beyond 1.5 km
 * - Rounded to nearest Rp 1,000
 */
export function calculateOjekFare(distanceKm: number): number {
  if (distanceKm <= 1.5) {
    return 5000;
  }
  const extraKm = distanceKm - 1.5;
  const rawFare = 5000 + extraKm * 2500;
  return Math.max(5000, Math.round(rawFare / 1000) * 1000);
}

/**
 * Formats distance into readable text ("650 m" if < 1 km, "1.4 km" if >= 1 km)
 */
export function formatDistanceText(distanceKm: number): string {
  if (distanceKm < 1.0) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} meter`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Fetches real turn-by-turn road driving route, distance (km), duration (mins), and polyline coordinates
 * using OSRM (Open Source Routing Machine API - 100% Free Public Server).
 */
export async function getOSRMRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<{
  distanceKm: number;
  fare: number;
  durationMins: number;
  geometryCoordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
}> {
  if (lat1 === lat2 && lng1 === lng2) {
    return {
      distanceKm: 0.5,
      fare: 5000,
      durationMins: 2,
      geometryCoordinates: [[lat1, lng1], [lat2, lng2]]
    };
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM API Error');
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distMeters = route.distance || 0;
      const durationSecs = route.duration || 0;

      const rawKm = distMeters / 1000;
      const distanceKm = Math.max(0.5, Math.round(rawKm * 10) / 10);
      const durationMins = Math.max(1, Math.round(durationSecs / 60));
      const fare = calculateOjekFare(distanceKm);

      // OSRM returns coordinates as [lng, lat], convert to Leaflet [lat, lng]
      const geometryCoordinates: [number, number][] = route.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]]
      );

      return {
        distanceKm,
        fare,
        durationMins,
        geometryCoordinates
      };
    }
  } catch (err) {
    console.warn('Falling back to local Haversine road calculation:', err);
  }

  // Fallback if offline/network error
  const fallbackKm = calculateRoadDistance(lat1, lng1, lat2, lng2);
  return {
    distanceKm: fallbackKm,
    fare: calculateOjekFare(fallbackKm),
    durationMins: Math.round(fallbackKm * 3),
    geometryCoordinates: [[lat1, lng1], [lat2, lng2]]
  };
}

/**
 * Searches real places in Maleber / Cianjur / Indonesia using OpenStreetMap Nominatim Geocoding API.
 */
export async function searchRealPlacesOSM(query: string): Promise<any[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const searchQuery = query.toLowerCase().includes('maleber') || query.toLowerCase().includes('cianjur')
      ? query
      : `${query}, Maleber, Cianjur`;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=10`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'id'
      }
    });

    if (!res.ok) throw new Error('Nominatim API error');
    const data = await res.json();

    return data.map((item: any, idx: number) => {
      const type = (item.type || item.class || '').toLowerCase();
      let category = 'Lainnya';
      let icon = '📍';

      if (type.includes('school') || type.includes('university') || type.includes('college')) {
        category = 'Pendidikan';
        icon = '🏫';
      } else if (type.includes('place_of_worship') || type.includes('mosque')) {
        category = 'Ibadah';
        icon = '🕌';
      } else if (type.includes('hospital') || type.includes('clinic') || type.includes('pharmacy')) {
        category = 'Kesehatan';
        icon = '🏥';
      } else if (type.includes('townhall') || type.includes('government') || type.includes('administrative')) {
        category = 'Pemerintahan';
        icon = '🏛️';
      } else if (type.includes('shop') || type.includes('supermarket') || type.includes('market')) {
        category = 'Perdagangan';
        icon = '🛒';
      } else if (type.includes('stadium') || type.includes('sports')) {
        category = 'Olahraga';
        icon = '⚽';
      } else if (type.includes('park') || type.includes('tourism') || type.includes('attraction')) {
        category = 'Wisata';
        icon = '🌾';
      }

      return {
        id: `osm-${item.place_id || idx}-${Date.now()}`,
        name: item.name || item.display_name.split(',')[0] || 'Tempat Maleber',
        category,
        icon,
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        description: `OpenStreetMap Verified (${item.type || 'Landmark'})`
      };
    });
  } catch (err) {
    console.warn('Failed to fetch Nominatim places:', err);
    return [];
  }
}
