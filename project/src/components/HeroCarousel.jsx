import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Play,
  Volume2,
  VolumeX,
  Plus,
  Check,
  Loader2,
  Download,
  X,
} from 'lucide-react';

import { formatDuration, getYoutubeId } from '../lib/utils';
import SafeImage from './SafeImage';
import { useAuth } from '../context/AuthContext';
import { useDownload } from '../context/DownloadContext';
import { useToast } from '../context/ToastContext';
import { watchlistApi } from '../lib/api';

export default function HeroCarousel({
  movies,
  isOtt = false,
  activeHeroMovie = null,
  onSelectMovie,
  isTrailerFullscreen = false,
  onTrailerFullscreenChange,
}) {
  const { profile, isLoggedIn } = useAuth();
  const { downloadStatuses, startDownload } = useDownload();
  const { toast } = useToast();

  const [current, setCurrent] = useState(0);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHeroClear, setIsHeroClear] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState([]);

  // High-precision pause/resume slider timer variables
  const [slideTimeRemaining, setSlideTimeRemaining] = useState(6000);
  const slideTimerRef = useRef(null);
  const lastStartTimeRef = useRef(0);

  const startSlideTimer = (delay) => {
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    lastStartTimeRef.current = Date.now();
    slideTimerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % movies.length);
      setSlideTimeRemaining(6000);
    }, delay);
  };

  const pauseSlideTimer = () => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
      const elapsed = Date.now() - lastStartTimeRef.current;
      let remaining = Math.max(0, slideTimeRemaining - elapsed);
      if (remaining < 500) remaining = 6000;
      setSlideTimeRemaining(remaining);
    }
  };

  // Sync activeHeroMovie with current index
  useEffect(() => {
    if (isOtt && activeHeroMovie) {
      const idx = movies.findIndex((m) => m.id === activeHeroMovie.id);
      if (idx !== -1) {
        setCurrent(idx);
      }
    }
  }, [activeHeroMovie, movies, isOtt]);

  // Sync watchlist
  useEffect(() => {
    if (isOtt && isLoggedIn && profile?.id) {
      watchlistApi
        .getUserWatchlist(profile.id)
        .then((res) => {
          const wIds = (res?.data || [])
            .map((w) => w.movie?.id)
            .filter(Boolean);
          setWatchlistIds(wIds);
        })
        .catch(() => {/* watchlist fetch failed — non-critical */});
    }
  }, [isOtt, isLoggedIn, profile]);

  const handleToggleWatchlist = async (movieId) => {
    if (!isLoggedIn) {
      toast('Please log in to manage your watchlist', 'error');
      return;
    }
    try {
      const res = await watchlistApi.toggleWatchlist(profile.id, movieId);
      if (res.data.status === 'added') {
        setWatchlistIds((prev) => [...prev, movieId]);
        toast('Added to watchlist', 'success');
      } else {
        setWatchlistIds((prev) => prev.filter((id) => id !== movieId));
        toast('Removed from watchlist', 'success');
      }
    } catch {
      toast('Failed to update watchlist', 'error');
    }
  };

  // Manage rotation timer
  useEffect(() => {
    if (movies.length <= 1) return;

    if (trailerOpen || isTrailerFullscreen || (isOtt && activeHeroMovie)) {
      pauseSlideTimer();
      return;
    }

    startSlideTimer(slideTimeRemaining);

    return () => {
      if (slideTimerRef.current) {
        clearTimeout(slideTimerRef.current);
      }
    };
  }, [
    movies.length,
    trailerOpen,
    isTrailerFullscreen,
    activeHeroMovie,
    current,
    isOtt,
  ]);

  // Reset clear view on slide change
  useEffect(() => {
    setIsHeroClear(false);
  }, [current]);

  if (!movies.length) return null;

  const movie = movies[current];
  const prev = () => setCurrent((c) => (c - 1 + movies.length) % movies.length);
  const next = () => setCurrent((c) => (c + 1) % movies.length);

  const videoId = movie ? getYoutubeId(movie.trailerUrl) : null;

  if (isOtt) {
    return (
      <section
        onClick={() => setIsHeroClear(!isHeroClear)}
        className="relative h-[85vh] w-full group overflow-hidden cursor-pointer"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none transition-transform duration-1000 group-hover:scale-105">
          {/* Smooth background image crossfade matching Home Page transitions */}
          <div
            className={`w-full h-full bg-cover bg-center absolute inset-0 transition-all duration-1000 ${isHeroClear ? 'blur-none scale-100' : 'blur-[4px]'}`}
            style={{ backgroundImage: `url(${movie.bannerUrl || ''})` }}
          />

          {/* Video overlay if active */}
          {videoId && (
            <div
              key={videoId}
              className={`w-full h-full scale-[1.02] opacity-0 animate-fade-in transition-all duration-700 absolute inset-0 ${isHeroClear ? 'blur-none scale-100' : 'blur-[4px]'}`}
              style={{ animationDuration: '1.5s' }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playlist=${videoId}&modestbranding=1`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="w-[150vw] h-[150vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          )}

          {/* Preload next image to browser cache to ensure instant crossfade */}
          {movies.length > 1 && (
            <SafeImage
              src={movies[(current + 1) % movies.length]?.bannerUrl}
              alt=""
              className="hidden"
            />
          )}

          <div
            className={`absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent transition-opacity duration-700 ${isHeroClear ? 'opacity-0' : 'opacity-100'}`}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent transition-opacity duration-700 ${isHeroClear ? 'opacity-0' : 'opacity-100'}`}
          />
        </div>

        <div
          className={`absolute bottom-0 left-0 w-full p-8 md:p-16 lg:p-24 z-10 flex flex-col justify-end h-full backdrop-brightness-75 transition-all duration-700 ${isHeroClear ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div
            key={current}
            className="w-full flex flex-col md:flex-row gap-8 items-center md:items-end max-w-7xl mx-auto animate-fade-in"
          >
            <SafeImage
              src={movie.posterUrl}
              alt={movie.title}
              onClick={(e) => e.stopPropagation()}
              className="w-48 md:w-56 rounded-2xl shadow-2xl border border-white/10 hidden md:block transition-all duration-300 transform hover:scale-105"
            />

            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl flex-1 text-center md:text-left"
            >
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4 flex-wrap">
                <span className="px-2.5 py-0.5 bg-[#e63946] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {movie.ottPlatform || 'CINEMA EXCLUSIVE'}
                </span>
                <span className="text-[#ffd60a] font-bold flex items-center gap-1">
                  ★ {movie.rating}/10
                </span>
                <span className="text-gray-300 text-sm">{movie.genre}</span>
                {movie.videoResolution && (
                  <span className="text-xs bg-white/10 border border-white/20 px-2 py-0.5 rounded font-mono font-semibold">
                    {movie.videoResolution}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 font-outfit drop-shadow-md leading-tight">
                {movie.title}
              </h1>
              <p className="text-base text-gray-300 mb-8 line-clamp-3 max-w-xl leading-relaxed">
                {movie.synopsis}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap relative">
                {videoId && (
                  <button
                    onClick={() => {
                      if (onTrailerFullscreenChange) {
                        onTrailerFullscreenChange(true);
                      }
                      if (onSelectMovie) {
                        onSelectMovie(movie);
                      }
                    }}
                    className="btn-primary flex items-center gap-2 !px-8 !py-4 text-base rounded-xl transition-all shadow-[0_0_20px_rgba(230,57,70,0.4)] hover:shadow-[0_0_30px_rgba(230,57,70,0.6)] hover:scale-105 active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" /> Play Trailer
                  </button>
                )}
                {movie.downloadEnabled && (
                  <button
                    onClick={() => startDownload(movie)}
                    className="btn-ghost flex items-center gap-2 !px-8 !py-4 text-base rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-105"
                  >
                    {downloadStatuses[movie.id] === 'completed' ? (
                      <>
                        <Check className="w-5 h-5 text-green-400" /> Saved
                        Offline
                      </>
                    ) : downloadStatuses[movie.id] === 'downloading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />{' '}
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" /> Download Movie
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleToggleWatchlist(movie.id)}
                  className={`btn-ghost flex items-center gap-2 !px-6 !py-4 text-base rounded-xl backdrop-blur-md transition-all hover:scale-105 ${
                    watchlistIds.includes(movie.id)
                      ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30'
                      : 'bg-black/40 hover:bg-black/60 text-white border border-white/10'
                  }`}
                >
                  {watchlistIds.includes(movie.id) ? (
                    <>
                      <X className="w-5 h-5" /> Remove
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" /> My List
                    </>
                  )}
                </button>

                {videoId && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute right-0 ml-auto p-3 rounded-full border border-white/20 bg-black/40 backdrop-blur hover:bg-white/10 transition-all text-white z-50 pointer-events-auto"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex-col gap-2 hidden md:flex z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {movies.map((m, i) => (
            <button
              key={m.id}
              onClick={() => {
                setCurrent(i);
                if (onSelectMovie) {
                  onSelectMovie(m);
                }
              }}
              className={`rounded-xl overflow-hidden transition-all duration-300 border-2 ${
                i === current
                  ? 'border-[#ffd60a] scale-110 shadow-lg glow-gold'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <SafeImage
                src={m.posterUrl}
                alt={m.title}
                className="w-12 h-[72px] object-cover"
              />
            </button>
          ))}
        </div>

        {/* Nav arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-20 md:right-24 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Fullscreen Trailer Modal (Premium overlay with click-outside support) */}
        {isTrailerFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => {
              if (onTrailerFullscreenChange) {
                onTrailerFullscreenChange(false);
              }
              if (onSelectMovie) {
                onSelectMovie(null);
              }
            }}
          >
            <div
              className="w-full max-w-5xl aspect-video animate-scale-in relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  if (onTrailerFullscreenChange) {
                    onTrailerFullscreenChange(false);
                  }
                  if (onSelectMovie) {
                    onSelectMovie(null);
                  }
                }}
                className="absolute -top-10 right-0 text-white hover:text-[#ffd60a] transition-colors p-2 flex items-center gap-1.5 text-sm font-semibold"
              >
                <X className="w-4 h-4" /> Close
              </button>
              {videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=0&rel=0&modestbranding=1`}
                  title={`${movie.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  className="w-full h-full rounded-2xl border border-white/10"
                  allowFullScreen
                />
              ) : null}
            </div>
          </div>
        )}
      </section>
    );
  }

  // Fallback / Standard mode (Home Page version)
  return (
    <section className="relative h-[65vh] md:h-[80vh] overflow-hidden pt-16">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${movie.bannerUrl})` }}
      />

      <div className="absolute inset-0 hero-overlay" />

      {/* Slide indicators */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-[#ffd60a]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto left-0 right-0">
        <div className="max-w-xl animate-fade-in" key={current}>
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            {movie.isTrending && (
              <span className="badge badge-red">🔥 Trending</span>
            )}
            <span className="badge badge-gold">
              <Star className="w-2.5 h-2.5" /> {movie.rating.toFixed(1)}
            </span>
            <span className="badge badge-gray">
              <Clock className="w-2.5 h-2.5 mr-0.5" />{' '}
              {formatDuration(movie.duration)}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-2 drop-shadow-xl">
            {movie.title}
          </h1>

          <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
            <span>{movie.genre}</span>
            <span>•</span>
            <span>{movie.language}</span>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed line-clamp-2 mb-6 max-w-md">
            {movie.synopsis}
          </p>

          <div className="flex items-center gap-3">
            <Link
              to={`/movie/${movie.id}`}
              className="btn-primary !rounded-xl px-6 py-2.5"
            >
              Book Tickets
            </Link>
            {movie.trailerUrl && (
              <>
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="btn-ghost !rounded-xl flex items-center gap-2 px-5 py-2.5"
                >
                  <Play className="w-4 h-4 fill-current" /> Watch Trailer
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 rounded-full border border-white/40 bg-black/20 backdrop-blur hover:bg-white/10 transition-colors text-white ml-auto relative z-30"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex-col gap-2 hidden md:flex z-20">
        {movies.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setCurrent(i)}
            className={`rounded-xl overflow-hidden transition-all duration-300 border-2 ${
              i === current
                ? 'border-[#ffd60a] scale-110 shadow-lg glow-gold'
                : 'border-transparent opacity-50 hover:opacity-80'
            }`}
          >
            <SafeImage
              src={m.posterUrl}
              alt={m.title}
              className="w-12 h-[72px] object-cover"
            />
          </button>
        ))}
      </div>

      {/* Nav arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-20 md:right-24 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-colors"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Trailer modal */}
      {trailerOpen && movie.trailerUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <div
            className="w-full max-w-4xl aspect-video animate-scale-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${movie.trailerUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/) ? movie.trailerUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/)?.[2] : ''}?autoplay=1`}
              title={`${movie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-2xl"
            />

            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-[#ffd60a] transition-colors p-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
