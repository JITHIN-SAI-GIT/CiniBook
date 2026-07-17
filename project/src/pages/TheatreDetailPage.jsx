import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Globe,
  Car,
  Utensils,
  Accessibility,
  Monitor,
  ChevronLeft,
  Navigation,
  Film,
  Users,
} from 'lucide-react';
import { theatresApi, showtimesApi } from '../lib/api';

import { formatTime, formatPrice } from '../lib/utils';

const MapView = lazy(() => import('../components/MapView'));

export default function TheatreDetailPage() {
  const { id } = useParams();
  const [theatre, setTheatre] = useState(null);
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [theatreRes, moviesRes, stRes] = await Promise.all([
          theatresApi.getById(Number(id)),
          theatresApi.getTheatreMovies(Number(id)),
          showtimesApi.getAll(),
        ]);
        const t = theatreRes.data;
        const m = moviesRes.data || [];
        const allShowtimes = stRes.data || [];
        // Filter showtimes for this theatre
        const theatreShowtimes = allShowtimes.filter(
          (st) => st.theatre?.id === Number(id)
        );
        setTheatre(t);
        setMovies(m);
        setShowtimes(theatreShowtimes);
        if (m.length > 0) setSelectedMovie(m[0]);
        if (theatreShowtimes.length > 0) {
          const dates = [
            ...new Set(theatreShowtimes.map((s) => s.showDate)),
          ].sort();
          setSelectedDate(dates[0]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#e63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!theatre) {
    return (
      <div className="min-h-screen pt-20 text-center py-20">
        <p className="text-gray-400">Theatre not found.</p>
        <Link to="/theatres" className="btn-primary mt-4 inline-block">
          Back to Theatres
        </Link>
      </div>
    );
  }

  const dates = [...new Set(showtimes.map((s) => s.showDate))].sort();
  const movieShowtimes = showtimes.filter(
    (s) => s.movie?.id === selectedMovie?.id && s.showDate === selectedDate
  );

  const directionsUrl =
    theatre.latitude && theatre.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${theatre.latitude},${theatre.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theatre.name + ' ' + (theatre.city || ''))}`;

  const photos =
    theatre.photoUrls && theatre.photoUrls.length > 0
      ? theatre.photoUrls
      : [
          `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80`,
        ];

  return (
    <div className="min-h-screen pt-16 page-enter">
      {/* Hero Photo Gallery */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={photos[activePhoto]}
          alt={theatre.name}
          className="w-full h-full object-cover transition-all duration-700"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80';
          }}
        />

        <div className="absolute inset-0 hero-overlay" />

        {photos.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activePhoto ? 'w-6 bg-[#ffd60a]' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-6 left-6">
          <Link
            to="/theatres"
            className="flex items-center gap-2 text-white glass px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> All Theatres
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Main content */}
          <div className="space-y-8">
            {/* Theatre Info */}
            <div>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {theatre.name}
                  </h1>
                  <p className="text-gray-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#e63946]" />
                    {theatre.location}
                    {theatre.city && `, ${theatre.city}`}
                    {theatre.state && `, ${theatre.state}`}
                  </p>
                </div>
                {theatre.isBookingEnabled ? (
                  <span className="badge badge-green text-sm">
                    ✓ Booking Open
                  </span>
                ) : (
                  <span className="badge badge-red text-sm">
                    ✗ Booking Closed
                  </span>
                )}
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/10">
                {theatre.phone && (
                  <a
                    href={`tel:${theatre.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-[#ffd60a] transition-colors"
                  >
                    <Phone className="w-4 h-4 text-gray-500" /> {theatre.phone}
                  </a>
                )}
                {theatre.website && (
                  <a
                    href={theatre.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-[#ffd60a] transition-colors"
                  >
                    <Globe className="w-4 h-4 text-gray-500" /> Website
                  </a>
                )}
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#ffd60a] hover:text-yellow-300 transition-colors"
                >
                  <Navigation className="w-4 h-4" /> Get Directions
                </a>
              </div>
            </div>

            {/* Facilities */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                Facilities & Amenities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FacilityCard
                  icon={<Monitor className="w-5 h-5 text-[#ffd60a]" />}
                  label="Screens"
                  value={`${theatre.screens} Screens`}
                  available={true}
                />
                <FacilityCard
                  icon={<Users className="w-5 h-5 text-blue-400" />}
                  label="Capacity"
                  value={
                    theatre.seatCapacity
                      ? `${theatre.seatCapacity} seats`
                      : 'N/A'
                  }
                  available={!!theatre.seatCapacity}
                />
                <FacilityCard
                  icon={<Car className="w-5 h-5 text-green-400" />}
                  label="Parking"
                  value={theatre.hasParking ? 'Available' : 'Not Available'}
                  available={!!theatre.hasParking}
                />
                <FacilityCard
                  icon={<Utensils className="w-5 h-5 text-orange-400" />}
                  label="Food Court"
                  value={theatre.hasFoodCourt ? 'Available' : 'Not Available'}
                  available={!!theatre.hasFoodCourt}
                />
                <FacilityCard
                  icon={<Accessibility className="w-5 h-5 text-purple-400" />}
                  label="Wheelchair"
                  value={
                    theatre.isWheelchairAccessible ? 'Accessible' : 'Limited'
                  }
                  available={!!theatre.isWheelchairAccessible}
                />
              </div>
            </div>

            {/* Now Playing */}
            {movies.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#e63946]" /> Now Playing
                </h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mb-6">
                  {movies.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMovie(m)}
                      className={`min-w-[130px] cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${selectedMovie?.id === m.id ? 'border-[#e63946] shadow-lg shadow-red-500/20 scale-105' : 'border-white/10 hover:border-white/30'}`}
                    >
                      <img
                        src={
                          m.posterUrl ||
                          'https://placehold.co/130x195/1a1a2e/666?text=' +
                            encodeURIComponent(m.title)
                        }
                        alt={m.title}
                        className="w-full aspect-[2/3] object-cover"
                        onError={(e) => {
                          e.target.src =
                            'https://placehold.co/130x195/1a1a2e/666';
                        }}
                      />

                      <div className="p-2 bg-black/60">
                        <p className="text-xs font-semibold text-white truncate">
                          {m.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {m.language} • {m.genre}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Showtimes */}
                {selectedMovie && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">
                      Showtimes — {selectedMovie.title}
                    </h3>

                    {/* Date picker */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                      {dates.map((date) => {
                        const d = new Date(date + 'T00:00:00');
                        return (
                          <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`min-w-[80px] p-3 rounded-xl border text-center transition-all ${selectedDate === date ? 'bg-[#e63946] border-[#e63946] text-white' : 'border-white/10 text-gray-400 hover:border-white/30'}`}
                          >
                            <div className="text-[10px] uppercase">
                              {d.toLocaleDateString('en-US', {
                                weekday: 'short',
                              })}
                            </div>
                            <div className="text-lg font-bold">
                              {d.getDate()}
                            </div>
                            <div className="text-[10px]">
                              {d.toLocaleDateString('en-US', {
                                month: 'short',
                              })}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {movieShowtimes.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4">
                        No showtimes for this date.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {movieShowtimes.map((st) => (
                          <Link
                            key={st.id}
                            to={`/booking/${st.id}`}
                            className="glass border border-white/10 hover:border-[#ffd60a] rounded-xl px-5 py-3 transition-all card-hover"
                          >
                            <div className="text-sm font-bold text-white">
                              {formatTime(st.showTime)}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {st.screenName}
                            </div>
                            <div className="text-xs text-[#ffd60a] font-semibold mt-1">
                              {formatPrice(st.pricePlatinum || 0)}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Map */}
          <div className="space-y-6">
            {theatre.latitude && theatre.longitude && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#e63946]" /> Location
                </h3>
                <Suspense
                  fallback={<div className="h-64 skeleton rounded-2xl" />}
                >
                  <MapView
                    lat={theatre.latitude}
                    lng={theatre.longitude}
                    localTheatres={[theatre]}
                    height="280px"
                    zoom={15}
                  />
                </Suspense>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-center mt-3 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" /> Get Directions
                </a>
              </div>
            )}

            {/* Quick Info Card */}
            <div className="glass rounded-2xl p-5 border border-white/10">
              <h4 className="font-bold text-white mb-4">Quick Info</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Screens</span>
                  <span className="text-white font-medium">
                    {theatre.screens}
                  </span>
                </div>
                {theatre.seatCapacity && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Seats</span>
                    <span className="text-white font-medium">
                      {theatre.seatCapacity}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Movies Playing</span>
                  <span className="text-white font-medium">
                    {movies.length}
                  </span>
                </div>
                {theatre.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phone</span>
                    <a
                      href={`tel:${theatre.phone}`}
                      className="text-[#ffd60a] hover:underline"
                    >
                      {theatre.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacilityCard({ icon, label, value, available }) {
  return (
    <div
      className={`glass rounded-xl p-4 border ${available ? 'border-white/10' : 'border-white/5 opacity-50'}`}
    >
      <div className="mb-2">{icon}</div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div
        className={`text-sm font-semibold ${available ? 'text-white' : 'text-gray-500'}`}
      >
        {value}
      </div>
    </div>
  );
}
