import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Building2,
  Navigation,
  Map,
  List,
  ChevronRight,
} from 'lucide-react';
import { theatresApi } from '../lib/api';
import { getNearbyTheatresFromOSM } from '../lib/locationApi';
import { useLocation } from '../context/LocationContext';

const MapView = lazy(() => import('../components/MapView'));

export default function TheatresPage() {
  const { userLocation, selectedCity } = useLocation();
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTheatres, setFilteredTheatres] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const combined = [];

        // Local DB theatres — city or nearby
        try {
          let localRes;
          if (userLocation) {
            localRes = await theatresApi.getNearby(
              userLocation.lat,
              userLocation.lng,
              100
            );
          } else if (selectedCity) {
            localRes = await theatresApi.getByCity(selectedCity);
          } else {
            localRes = await theatresApi.getAll();
          }
          const local = localRes.data || [];
          local.forEach((t) =>
            combined.push({
              id: `local-${t.id}`,
              name: t.name,
              address: t.location || `${t.city || ''} ${t.state || ''}`.trim(),
              distance: t.distanceKm,
              type: 'local',
              localId: t.id,
              screens: t.screens,
              isBookingEnabled: t.isBookingEnabled,
              hasParking: t.hasParking,
              hasFoodCourt: t.hasFoodCourt,
              isWheelchairAccessible: t.isWheelchairAccessible,
              city: t.city,
              phone: t.phone,
              lat: t.latitude,
              lng: t.longitude,
            })
          );
        } catch {
          /* no local */
        }

        // OSM theatres
        if (userLocation) {
          try {
            const osm = await getNearbyTheatresFromOSM(
              userLocation.lat,
              userLocation.lng,
              25000
            );
            const localNames = combined.map((c) => c.name.toLowerCase());
            osm.forEach((t) => {
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

        combined.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        setTheatres(combined);
        setFilteredTheatres(combined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userLocation, selectedCity]);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredTheatres(theatres);
    } else {
      setFilteredTheatres(
        theatres.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q) ||
            (t.city || '').toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, theatres]);

  const mapLat = userLocation?.lat ?? 17.385;
  const mapLng = userLocation?.lng ?? 78.4867;
  const localWithCoords = theatres
    .filter((t) => t.type === 'local' && t.lat && t.lng)
    .map((t) => ({
      id: t.localId,
      name: t.name,
      location: t.address,
      latitude: t.lat,
      longitude: t.lng,
      screens: t.screens ?? 1,
      isBookingEnabled: t.isBookingEnabled,
      distanceKm: t.distance,
      city: t.city,
      createdAt: '',
    }));
  const osmWithCoords = theatres
    .filter((t) => t.type === 'osm' && t.lat && t.lng)
    .map((t) => ({
      id: t.id,
      name: t.name,
      address: t.address,
      lat: t.lat,
      lng: t.lng,
      distance: t.distance,
      type: 'osm',
    }));

  return (
    <div className="min-h-screen pt-20 page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Building2 className="w-9 h-9 text-[#e63946]" />
            Theatres
            {selectedCity && (
              <span className="text-2xl text-gray-400 font-normal">
                in {selectedCity}
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm">
            {theatres.length > 0
              ? `${theatres.length} cinemas found`
              : 'Searching nearby cinemas...'}
          </p>
        </div>

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search theatres by name or area..."
              className="input-field pl-12"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-[#e63946] border-[#e63946] text-white' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-[#e63946] border-[#e63946] text-white' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
            >
              <Map className="w-4 h-4" /> Map
            </button>
          </div>
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-8">
            <Suspense
              fallback={<div className="h-[500px] skeleton rounded-2xl" />}
            >
              <MapView
                lat={mapLat}
                lng={mapLng}
                localTheatres={localWithCoords}
                osmTheatres={osmWithCoords}
                height="500px"
                zoom={12}
              />
            </Suspense>
          </div>
        )}

        {/* List View */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 skeleton rounded-2xl" />
            ))}
          </div>
        ) : filteredTheatres.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No Theatres Found
            </h3>
            <p className="text-gray-400">
              Try a different search or change your location.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTheatres.map((theatre) => (
              <TheatreCard key={theatre.id} theatre={theatre} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TheatreCard({ theatre }) {
  const isLocal = theatre.type === 'local';
  const href =
    isLocal && theatre.localId ? `/theatres/${theatre.localId}` : null;

  const content = (
    <div
      className={`glass rounded-2xl p-5 border transition-all card-hover h-full flex flex-col ${
        isLocal
          ? 'border-white/10 hover:border-[#e63946]/40'
          : 'border-white/5 hover:border-purple-500/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isLocal
              ? 'bg-gradient-to-br from-[#e63946] to-[#c1121f]'
              : 'bg-gradient-to-br from-purple-600 to-indigo-600'
          }`}
        >
          <Building2 className="w-6 h-6 text-white" />
        </div>
        {theatre.distance !== undefined && (
          <div className="flex items-center gap-1 text-[#ffd60a] text-xs font-semibold">
            <Navigation className="w-3 h-3" />
            {theatre.distance?.toFixed(1) || '0.0'} km
          </div>
        )}
      </div>

      {/* Name & address */}
      <h3 className="font-bold text-white text-base mb-1 line-clamp-1">
        {theatre.name}
      </h3>
      <p className="text-xs text-gray-400 flex items-start gap-1 mb-4 flex-1">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gray-500" />
        <span className="line-clamp-2">{theatre.address}</span>
      </p>

      {/* Facilities */}
      {isLocal && (
        <div className="flex flex-wrap gap-2 mb-4">
          {theatre.screens && (
            <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-gray-400">
              🖥️ {theatre.screens} screens
            </span>
          )}
          {theatre.hasParking && (
            <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-gray-400">
              🅿️ Parking
            </span>
          )}
          {theatre.hasFoodCourt && (
            <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-gray-400">
              🍿 Food Court
            </span>
          )}
          {theatre.isWheelchairAccessible && (
            <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-gray-400">
              ♿ Accessible
            </span>
          )}
        </div>
      )}

      {/* Action */}
      {isLocal ? (
        theatre.isBookingEnabled ? (
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
            <span className="badge badge-green text-[10px]">Booking Open</span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        ) : (
          <div className="pt-3 border-t border-white/10 mt-auto">
            <span className="badge badge-gray text-[10px]">
              Booking Unavailable
            </span>
          </div>
        )
      ) : (
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
          <span className="badge badge-gray text-[10px]">📍 Nearby Cinema</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${theatre.lat},${theatre.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#ffd60a] hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Navigation className="w-3 h-3" /> Directions
          </a>
        </div>
      )}
    </div>
  );

  return href ? (
    <Link to={href} className="h-full block">
      {content}
    </Link>
  ) : (
    <div className="h-full">{content}</div>
  );
}
