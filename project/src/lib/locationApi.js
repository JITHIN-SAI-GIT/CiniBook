/**
 * locationApi.ts
 * Free location services using:
 * - Nominatim (OpenStreetMap) for reverse geocoding
 * - Overpass API (OpenStreetMap) for nearby cinema discovery
 */

/**
 * Reverse geocode lat/lng → city, state, country
 */
export async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
    { headers: { 'Accept-Language': 'en-US,en' } }
  );
  const data = await res.json();
  const addr = data.address || {};
  return {
    city: addr.city || addr.town || addr.village || addr.county || '',
    state: addr.state || addr.region || '',
    country: addr.country || '',
    displayName: data.display_name || '',
  };
}

/**
 * Get nearby cinemas from OpenStreetMap via Overpass API.
 * This is 100% free, no API key needed.
 */
export async function getNearbyTheatresFromOSM(lat, lng, radiusMeters = 20000) {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="cinema"](around:${radiusMeters},${lat},${lng});
      way["amenity"="cinema"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        throw new Error(`Overpass API Error: ${res.status}`);
      }
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Overpass API returned non-JSON response');
      }

      const data = await res.json();
      const elements = data.elements || [];

      return elements
        .map((el) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (!elLat || !elLng) return null;

          const tags = el.tags || {};
          const name = tags.name || tags['name:en'] || 'Cinema';
          const address = [
            tags['addr:housenumber'],
            tags['addr:street'],
            tags['addr:city'],
          ]
            .filter(Boolean)
            .join(', ');

          const dist = haversine(lat, lng, elLat, elLng);

          return {
            id: `osm-${el.id}`,
            name,
            address: address || tags['addr:full'] || 'Address not available',
            lat: elLat,
            lng: elLng,
            distance: dist,
            type: 'osm',
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    } catch (err) {
      console.warn(`Overpass API failed (${retries} retries left):`, err.message);
      retries--;
      if (retries === 0) return [];
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
  return [];
}

/**
 * Geocode city name → lat/lng using Nominatim
 */
export async function geocodeCity(city) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en-US,en' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.warn('Geocode failed', err);
  }
  return null;
}

/**
 * Haversine formula — distance in km between two points
 */
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
