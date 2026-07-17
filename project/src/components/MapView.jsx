import { useEffect, useState, useRef } from 'react';

/**
 * MapView — renders an interactive Leaflet map showing theatres near the user.
 * Uses OpenStreetMap tiles (100% free, no API key needed).
 */
export default function MapView({
  lat,
  lng,
  localTheatres = [],
  osmTheatres = [],
  height = '400px',
  onTheatreClick,
  zoom = 13,
}) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default icon paths for bundlers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([lat, lng], zoom);

      // OpenStreetMap dark tile layer
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CartoDB</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      ).addTo(map);

      // User location pin (blue)
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: '',
      });
      L.marker([lat, lng], { icon: userIcon })
        .bindPopup('<b>📍 Your Location</b>')
        .addTo(map);

      // Cinema icon for local DB theatres (red)
      const cinemaIcon = (label) =>
        L.divIcon({
          html: `<div style="background:linear-gradient(135deg,#e63946,#c1121f);color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(230,57,70,0.6);border:1px solid rgba(255,255,255,0.2);">🎬 ${label}</div>`,
          className: '',
          iconAnchor: [0, 20],
        });

      // OSM cinema icon (purple)
      const osmIcon = (label) =>
        L.divIcon({
          html: `<div style="background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(124,58,237,0.6);border:1px solid rgba(255,255,255,0.2);">🎥 ${label}</div>`,
          className: '',
          iconAnchor: [0, 20],
        });

      // Add local theatre markers
      localTheatres.forEach((t) => {
        if (!t.latitude || !t.longitude) return;
        const marker = L.marker([t.latitude, t.longitude], {
          icon: cinemaIcon(t.name),
        }).addTo(map);

        const popupContent = `
          <div style="font-family:system-ui;min-width:200px">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">🎬 ${t.name}</div>
            <div style="font-size:12px;color:#666;margin-bottom:8px">${t.location || t.city || ''}</div>
            ${t.screens ? `<div style="font-size:12px;margin-bottom:4px">🖥️ ${t.screens} Screens</div>` : ''}
            ${t.distanceKm ? `<div style="font-size:12px;color:#e63946;font-weight:600">📍 ${t.distanceKm} km away</div>` : ''}
            ${t.isBookingEnabled ? '<div style="margin-top:8px"><a href="/theatres/' + t.id + '" style="background:#e63946;color:white;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">Book Tickets →</a></div>' : ''}
          </div>
        `;
        marker.bindPopup(popupContent);

        if (onTheatreClick) {
          marker.on('click', () => onTheatreClick(t));
        }
      });

      // Add OSM theatre markers
      osmTheatres.forEach((t) => {
        if (!t.lat || !t.lng) return;
        const name =
          t.name.length > 20 ? t.name.substring(0, 18) + '…' : t.name;
        L.marker([t.lat, t.lng], { icon: osmIcon(name) }).addTo(map).bindPopup(`
            <div style="font-family:system-ui;min-width:180px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">🎥 ${t.name}</div>
              <div style="font-size:12px;color:#666;margin-bottom:4px">${t.address}</div>
              ${t.distance ? `<div style="font-size:12px;color:#7c3aed;font-weight:600">📍 ${t.distance} km away</div>` : ''}
            </div>
          `);
      });

      leafletMapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ height }}
    >
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
      />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#e63946] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
