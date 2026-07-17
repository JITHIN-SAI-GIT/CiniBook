import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Star,
  Clock,
  Globe,
  Play,
  Calendar,
  MapPin,
  ChevronLeft,
  Users,
  AlertCircle,
  Bell,
  Flame,
  Loader2,
} from 'lucide-react';
import { tmdbApi, moviesApi, showtimesApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

import { formatDuration, formatTime, formatPrice } from '../lib/utils';
import { DetailSkeleton } from '../components/Skeletons';
import TMDBMovieCard from '../components/TMDBMovieCard';

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isAvailableLocally, setIsAvailableLocally] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [trailerOpen, setTrailerOpen] = useState(false);

  const { toast } = useToast();
  const [initializingBooking, setInitializingBooking] = useState(false);

  const loadMovieData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const tmdbRes = await tmdbApi.getMovieDetails(Number(id));
      if (tmdbRes.data?.error) throw new Error('TMDB Error');
      setMovie(tmdbRes.data);

      const availRes = await moviesApi.checkBookingAvailability(Number(id));
      const available = availRes.data?.available;
      setIsAvailableLocally(available);

      if (available && availRes.data?.localMovieId) {
        const stRes = await showtimesApi.getByMovie(availRes.data.localMovieId);
        const stData = stRes.data || [];
        setShowtimes(stData);
        if (stData.length > 0) {
          const uniqueDates = [
            ...new Set(stData.map((s) => s.showDate)),
          ].sort();
          setSelectedDate(uniqueDates[0]);
        }
      } else {
        setShowtimes([]);
        setSelectedDate('');
      }
    } catch (err) {
      console.error('Failed to fetch movie details', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMovieData();
  }, [loadMovieData]);

  const handleInitializeBooking = async () => {
    setInitializingBooking(true);
    try {
      const res = await moviesApi.initializeBooking(Number(id));
      if (res.data?.success) {
        toast('Booking enabled successfully! 🎉', 'success');
        await loadMovieData();
      } else {
        toast(res.data?.message || 'Failed to initialize booking.', 'error');
      }
    } catch (err) {
      toast(
        err?.response?.data?.message || 'Error scheduling showtimes',
        'error'
      );
    } finally {
      setInitializingBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <p className="text-gray-400 text-lg">Movie not found or TMDB error.</p>
        <Link to="/movies" className="btn-primary mt-4 inline-block">
          Browse Movies
        </Link>
      </div>
    );
  }

  const trailerVideo = movie.videos?.results?.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  );
  const trailerUrl = trailerVideo
    ? `https://www.youtube.com/embed/${trailerVideo.key}`
    : null;
  const ratingColor =
    movie.vote_average >= 8
      ? 'text-green-400'
      : movie.vote_average >= 6
        ? 'text-[#ffd60a]'
        : 'text-red-400';
  const comingSoonFromState = location.state?.isUpcoming;
  const isUpcoming =
    comingSoonFromState ||
    movie.status === 'Upcoming' ||
    movie.status === 'In Production' ||
    movie.status === 'Post Production' ||
    (movie.release_date &&
      new Date(movie.release_date + 'T00:00:00') > new Date());

  const topCast = movie.credits?.cast?.slice(0, 6) || [];
  const director = movie.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const producers =
    movie.credits?.crew
      ?.filter((c) => c.job === 'Producer')
      .map((c) => c.name)
      .slice(0, 3) || [];
  const writers =
    movie.credits?.crew
      ?.filter((c) => c.job === 'Screenplay' || c.job === 'Writer')
      .map((c) => c.name)
      .slice(0, 3) || [];
  const similarMovies = movie.similar?.results?.slice(0, 10) || [];

  const dates = [...new Set(showtimes.map((s) => s.showDate))].sort();
  const filteredShowtimes = showtimes.filter(
    (s) => s.showDate === selectedDate
  );
  const grouped = {};
  filteredShowtimes.forEach((st) => {
    const theatre = st.theatre;
    if (!grouped[theatre.id]) grouped[theatre.id] = { theatre, showtimes: [] };
    grouped[theatre.id].showtimes.push(st);
  });

  return (
    <div className="min-h-screen pt-16 page-enter">
      {/* Banner backdrop */}
      <div className="relative h-[60vh] overflow-hidden">
        <img
          src={
            movie.backdrop_path
              ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
              : 'https://placehold.co/1920x1080/1a1a2e/666'
          }
          alt={movie.title}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 hero-overlay" />

        {/* Play trailer overlay */}
        {trailerUrl && (
          <button
            onClick={() => setTrailerOpen(true)}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border-2 border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#e63946]/80 group-hover:border-[#e63946] transition-all animate-pulse-glow">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Trailer Modal */}
      {trailerOpen && trailerUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setTrailerOpen(false)}
        >
          <div
            className="w-full max-w-5xl aspect-video animate-scale-in rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={trailerUrl + '?autoplay=1'}
              title={`${movie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-40 relative z-10 pb-20">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#ffd60a] mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8 lg:gap-12">
          {/* Left Column: Poster & Quick Stats */}
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] card-hover bg-black">
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : 'https://placehold.co/500x750/1a1a2e/666'
                }
                alt={movie.title}
                className="w-full"
              />
            </div>
            <div className="glass-strong rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-6 h-6 star-filled text-[#ffd60a]" />
                  <span className={`text-2xl font-bold ${ratingColor}`}>
                    {movie.vote_average > 0
                      ? movie.vote_average.toFixed(1)
                      : 'NR'}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-gray-300 font-medium">
                  <Clock className="w-4 h-4 text-gray-400" />{' '}
                  {movie.runtime ? formatDuration(movie.runtime) : 'N/A'}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm font-medium">
                    Language:{' '}
                    <span className="text-white uppercase">
                      {movie.original_language || 'EN'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm font-medium">
                    Release:{' '}
                    <span className="text-white">
                      {movie.release_date
                        ? new Date(movie.release_date).toLocaleDateString()
                        : 'TBD'}
                    </span>
                  </span>
                </div>
                {movie.status && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm font-medium">
                      Status:{' '}
                      <span
                        className={
                          movie.status === 'Released'
                            ? 'text-green-400'
                            : 'text-[#ffd60a]'
                        }
                      >
                        {movie.status}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Details & Booking */}
          <div className="space-y-8 pt-4 lg:pt-16">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
                {movie.title}
              </h1>
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres?.map((g) => (
                  <span
                    key={g.id}
                    className="glass px-3 py-1 rounded-full text-sm font-medium text-gray-200 border border-white/10"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
              <p className="text-gray-300 leading-relaxed text-lg max-w-4xl">
                {movie.overview || 'No overview available.'}
              </p>
            </div>

            {/* Crew Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
              {director && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                    Director
                  </h4>
                  <p className="text-white font-medium">{director}</p>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                    Writer
                  </h4>
                  <p className="text-white font-medium line-clamp-1">
                    {writers.join(', ')}
                  </p>
                </div>
              )}
              {producers.length > 0 && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                    Producer
                  </h4>
                  <p className="text-white font-medium line-clamp-1">
                    {producers.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Cast Section */}
            {topCast.length > 0 && (
              <div className="pt-6">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                  <Users className="w-5 h-5 text-[#ffd60a]" /> Top Cast
                </h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                  {topCast.map((actor) => (
                    <div key={actor.id} className="min-w-[100px] text-center">
                      <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-white/10 mb-2 bg-gray-800">
                        <img
                          src={
                            actor.profile_path
                              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=random`
                          }
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {actor.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {actor.character}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking / Showtimes Section */}
            <div className="pt-8 mt-8 border-t border-white/10">
              {isUpcoming ? (
                <div className="glass-strong rounded-2xl p-8 text-center max-w-2xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
                  <Clock className="w-12 h-12 text-[#ffd60a] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-gray-400 mb-6">
                    This movie has not been released yet. Get notified when
                    bookings open!
                  </p>
                  <button className="btn-primary inline-flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notify Me
                  </button>
                </div>
              ) : isAvailableLocally ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      Book Your Tickets
                    </h2>
                    <span className="badge badge-red flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Filling Fast
                    </span>
                  </div>

                  {/* Showtimes Component */}
                  {dates.length > 0 ? (
                    <>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-6">
                        {dates.map((date) => {
                          const d = new Date(date + 'T00:00:00');
                          return (
                            <button
                              key={date}
                              onClick={() => setSelectedDate(date)}
                              className={`min-w-[90px] p-3 rounded-xl border text-center transition-all ${
                                selectedDate === date
                                  ? 'bg-[#e63946] border-[#e63946] text-white shadow-lg glow-red scale-105'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-[#ffd60a]/50 hover:text-[#ffd60a]'
                              }`}
                            >
                              <div className="text-xs uppercase tracking-wide opacity-70">
                                {d.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                })}
                              </div>
                              <div className="text-lg font-bold">
                                {d.getDate()}
                              </div>
                              <div className="text-xs opacity-70">
                                {d.toLocaleDateString('en-US', {
                                  month: 'short',
                                })}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {Object.keys(grouped).length === 0 ? (
                        <div className="text-center py-8 glass rounded-xl">
                          <p className="text-gray-400">
                            No showtimes available for this date.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.values(grouped).map(
                            ({ theatre, showtimes: sts }) => (
                              <div
                                key={theatre.id}
                                className="glass rounded-xl border border-white/10 p-5"
                              >
                                <div className="flex items-center gap-2 mb-4">
                                  <MapPin className="w-5 h-5 text-[#ffd60a]" />
                                  <div>
                                    <h3 className="font-semibold text-white">
                                      {theatre.name}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                      {theatre.location}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {sts.map((st) => (
                                    <Link
                                      key={st.id}
                                      to={`/booking/${st.id}`}
                                      className="group bg-[var(--cinema-bg)] border border-white/10 rounded-xl px-4 py-3 hover:border-[#ffd60a] transition-all card-hover"
                                    >
                                      <div className="text-sm font-bold text-white group-hover:text-[#ffd60a] transition-colors">
                                        {formatTime(st.showTime)}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        {st.screenName}
                                      </div>
                                      <div className="text-xs text-[#ffd60a] mt-1 font-semibold">
                                        {formatPrice(st.priceSilver)}
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 glass rounded-xl">
                      <p className="text-gray-400 text-lg">
                        No upcoming shows scheduled locally
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-strong rounded-2xl p-8 text-center max-w-2xl bg-gradient-to-br from-red-950/20 to-indigo-950/20 border border-white/10 animate-fade-in">
                  <MapPin className="w-12 h-12 text-[#e63946] mx-auto mb-4 animate-bounce" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Not Playing Near You
                  </h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    This movie is currently not showing in any local partner
                    theatres. Click below to instantly schedule standard demo
                    showtimes and start booking tickets!
                  </p>
                  <button
                    onClick={handleInitializeBooking}
                    disabled={initializingBooking}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 shadow-[0_0_15px_rgba(230,57,70,0.4)]"
                  >
                    {initializingBooking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Scheduling
                        Showtimes...
                      </>
                    ) : (
                      <>⚡ Enable Instant Booking</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {similarMovies.length > 0 && (
              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    More Like This
                  </h3>
                </div>
                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4">
                  {similarMovies.map((movie) => (
                    <div
                      key={movie.id}
                      className="min-w-[160px] md:min-w-[180px]"
                    >
                      <TMDBMovieCard movie={movie} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
