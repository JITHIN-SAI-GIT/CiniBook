import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Building2, ChevronRight, Navigation } from 'lucide-react';
import { theatresApi } from '../lib/api';
import { getNearbyTheatresFromOSM } from '../lib/locationApi';
import { useLocation } from '../context/LocationContext';

export default function NearbyTheatresSection() {
  const { userLocation, selectedCity } = useLocation();
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);
  const lastFetchKey = useRef('');

  useEffect(() => {
    // Deduplicate: don't re-fetch if location hasn't actually changed
    const fetchKey = `${userLocation?.lat},${userLocation?.lng},${selectedCity}`;
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const load = async () => {
      setLoading(true);
      try {
        const combined = [];

        // 1. Get local DB theatres
        if (userLocation) {
          try {
            const nearbyRes = await theatresApi.getNearby(
              userLocation.lat,
              userLocation.lng,
              50
            );
            if (controller.signal.aborted) return;
            const local = nearbyRes.data || [];
            local.forEach((t) =>
              combined.push({
                id: `local-${t.id}`,
                name: t.name,
                address: t.location || `${t.city || ''}`,
                distance: t.distanceKm,
                type: 'local',
                localId: t.id,
                screens: t.screens,
                isBookingEnabled: t.isBookingEnabled,
                lat: t.latitude,
                lng: t.longitude,
              })
            );
          } catch {
            /* no nearby local */
          }
        } else if (selectedCity) {
          try {
            const cityRes = await theatresApi.getByCity(selectedCity);
            if (controller.signal.aborted) return;
            const local = cityRes.data || [];
            local.forEach((t) =>
              combined.push({
                id: `local-${t.id}`,
                name: t.name,
                address: t.location || t.city || selectedCity,
                type: 'local',
                localId: t.id,
                screens: t.screens,
                isBookingEnabled: t.isBookingEnabled,
              })
            );
          } catch {
            /* fallback */
          }
        }

        // 2. Get OSM theatres if we have GPS
        if (userLocation && !controller.signal.aborted) {
          try {
            const osm = await getNearbyTheatresFromOSM(
              userLocation.lat,
              userLocation.lng,
              20000
            );
            if (controller.signal.aborted) return;
            const localNames = combined.map((c) => c.name.toLowerCase());
            osm.slice(0, 15).forEach((t) => {
              if (
                !localNames.some((n) =>
                  n.includes(t.name.toLowerCase().substring(0, 5))
                )
              ) {
                combined.push({
                  id: t.id,
                  name: t.name,
                  address: t.address,
                  distance: t.distance,
                  type: 'osm',
                  lat: t.lat,
                  lng: t.lng,
                });
              }
            });
          } catch {
            /* OSM unavailable */
          }
        }

        if (controller.signal.aborted) return;

        // Sort by distance
        combined.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        setTheatres(combined.slice(0, 10));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();

    return () => {
      controller.abort();
    };
  }, [userLocation, selectedCity]);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e63946] to-purple-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Nearby Theatres</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cinemas near you</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[260px] h-36 skeleton rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (theatres.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e63946] to-purple-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Nearby Theatres</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedCity
                ? `Cinemas in ${selectedCity}`
                : 'Cinemas near your location'}
            </p>
          </div>
        </div>
        <Link
          to="/theatres"
          className="flex items-center gap-1 text-sm text-[#ffd60a] hover:gap-2 transition-all font-medium"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {theatres.map((theatre) => (
          <div
            key={theatre.id}
            className="min-w-[260px] glass rounded-2xl p-5 border border-white/10 hover:border-[#e63946]/40 transition-all card-hover cursor-pointer"
            onClick={() => {
              if (theatre.type === 'local' && theatre.localId) {
                window.location.href = `/theatres/${theatre.localId}`;
              }
            }}
          >
            {/* Theatre icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                theatre.type === 'local'
                  ? 'bg-gradient-to-br from-[#e63946] to-[#c1121f]'
                  : 'bg-gradient-to-br from-purple-600 to-indigo-600'
              }`}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>

            {/* Name */}
            <h3 className="font-bold text-white text-sm leading-tight mb-1 line-clamp-1">
              {theatre.name}
            </h3>

            {/* Address */}
            <p className="text-xs text-gray-400 flex items-start gap-1 mb-3 line-clamp-2">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gray-500" />
              {theatre.address}
            </p>

            <div className="flex items-center justify-between mt-auto">
              {/* Distance */}
              {theatre.distance !== undefined && (
                <div className="flex items-center gap-1 text-xs text-[#ffd60a]">
                  <Navigation className="w-3 h-3" />
                  <span className="font-semibold">
                    {theatre.distance?.toFixed(1) || '0.0'} km
                  </span>
                </div>
              )}

              {/* Book / OSM badge */}
              {theatre.type === 'local' ? (
                theatre.isBookingEnabled ? (
                  <span className="badge badge-green text-[10px]">
                    Booking Open
                  </span>
                ) : (
                  <span className="badge badge-gray text-[10px]">
                    No Booking
                  </span>
                )
              ) : (
                <span className="badge badge-gray text-[10px]">📍 Nearby</span>
              )}
            </div>

            {theatre.screens && (
              <p className="text-xs text-gray-500 mt-2">
                {theatre.screens} Screens
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
