import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Search,
  Film,
  Clock,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { moviesApi, watchlistApi, watchHistoryApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDownload } from '../context/DownloadContext';
import HeroCarousel from '../components/HeroCarousel';

import { formatBytes, getYoutubeId } from '../lib/utils';
import SafeImage from '../components/SafeImage';

// Movie type imported from '../lib/types'

export default function OttHomePage() {
  const { profile, isLoggedIn } = useAuth();
  const { toast } = useToast();

  const [movies, setMovies] = useState([]);
  const [trending, setTrending] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);
  // Search & Filtering State
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterRating, setFilterRating] = useState('');

  // UI Detail States
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeHeroMovie, setActiveHeroMovie] = useState(null);

  // Video Streaming State for Banner Background
  const [isTrailerFullscreen, setIsTrailerFullscreen] = useState(false);

  // Download Manager States
  const { downloadStatuses, startDownload } = useDownload();

  const [myList, setMyList] = useState([]);

  // Fetch initial content
  useEffect(() => {
    Promise.all([
      moviesApi.getOttTrending(),
      moviesApi.getOttMovies(),
      isLoggedIn && profile?.id
        ? watchHistoryApi.getUserHistory(profile.id).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      isLoggedIn && profile?.id
        ? watchlistApi.getUserWatchlist(profile.id).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ])
      .then(([trendingRes, allRes, historyRes, watchlistRes]) => {
        const sortedTrending = (trendingRes.data || []).sort(
          (a, b) => b.id - a.id
        );
        setTrending(sortedTrending);
        setMovies(allRes.data || []);
        setContinueWatching(
          (historyRes?.data || []).filter((h) => h.progressSeconds > 0)
        );

        const watchlistMovies = (watchlistRes?.data || [])
          .map((w) => w.movie)
          .filter(Boolean);
        setMyList(watchlistMovies);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, profile]);

  // Filter list
  const filteredMovies = movies.filter((m) => {
    const matchesSearch =
      !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.genre.toLowerCase().includes(search.toLowerCase()) ||
      m.language.toLowerCase().includes(search.toLowerCase()) ||
      (m.castList &&
        m.castList.some((actor) =>
          actor.toLowerCase().includes(search.toLowerCase())
        ));

    const matchesGenre =
      !filterGenre || m.genre.toLowerCase().includes(filterGenre.toLowerCase());
    const matchesLanguage =
      !filterLanguage ||
      m.language.toLowerCase() === filterLanguage.toLowerCase();
    const matchesQuality =
      !filterQuality ||
      (m.videoResolution &&
        m.videoResolution.toLowerCase() === filterQuality.toLowerCase());
    const matchesYear =
      !filterYear ||
      (m.createdAt &&
        new Date(m.createdAt).getFullYear().toString() === filterYear);
    const matchesRating = !filterRating || m.rating >= parseFloat(filterRating);

    return (
      matchesSearch &&
      matchesGenre &&
      matchesLanguage &&
      matchesQuality &&
      matchesYear &&
      matchesRating
    );
  });

  const hasActiveFilters =
    search ||
    filterGenre ||
    filterLanguage ||
    filterQuality ||
    filterYear ||
    filterRating;

  const handleClearFilters = () => {
    setSearch('');
    setFilterGenre('');
    setFilterLanguage('');
    setFilterQuality('');
    setFilterYear('');
    setFilterRating('');
  };

  if (loading) {
    return (
      <div className="bg-[#0a0a0f] min-h-screen text-white pt-24 px-8 space-y-12">
        <div className="h-[60vh] w-full bg-white/5 rounded-2xl animate-pulse" />
        <SkeletonLoader />
      </div>
    );
  }

  // getYoutubeId imported from '../lib/utils'

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
  };

  return (
    <div className="bg-[#0a0a0f] min-h-screen pb-16 pt-16 relative overflow-x-hidden text-gray-200">
      {/* Hero Carousel Section (Reusing Home Page's transition engine 1:1) */}
      {trending.length > 0 && !hasActiveFilters && (
        <HeroCarousel
          movies={trending}
          isOtt={true}
          activeHeroMovie={activeHeroMovie}
          onSelectMovie={setActiveHeroMovie}
          isTrailerFullscreen={isTrailerFullscreen}
          onTrailerFullscreenChange={setIsTrailerFullscreen}
        />
      )}

      {/* Main Browse Experience */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">
        {/* Search and Filters Section */}
        <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
              <Film className="text-[#e63946] w-5 h-5" /> Browse Content
            </h2>
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, genre, language, cast..."
                className="input-field !pl-11 w-full bg-white/5 border-white/10 focus:border-[#e63946] transition-all py-3 rounded-2xl text-sm"
              />

              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2 border-t border-white/5">
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="input-field py-2 rounded-xl text-xs bg-white/5 border-white/10 cursor-pointer"
            >
              <option value="">All Languages</option>
              {[
                'Telugu',
                'Hindi',
                'English',
                'Tamil',
                'Korean',
                'Malayalam',
              ].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="input-field py-2 rounded-xl text-xs bg-white/5 border-white/10 cursor-pointer"
            >
              <option value="">All Genres</option>
              {[
                'Action',
                'Comedy',
                'Drama',
                'Sci-Fi',
                'Thriller',
                'Horror',
                'Romance',
                'Superhero',
              ].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="input-field py-2 rounded-xl text-xs bg-white/5 border-white/10 cursor-pointer"
            >
              <option value="">All Resolutions</option>
              {['480p', '720p', '1080p', '4K UHD'].map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="input-field py-2 rounded-xl text-xs bg-white/5 border-white/10 cursor-pointer"
            >
              <option value="">All Years</option>
              {['2026', '2025', '2024', '2023'].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="input-field py-2 rounded-xl text-xs bg-white/5 border-white/10 cursor-pointer"
            >
              <option value="">All Ratings</option>
              <option value="8.5">★ 8.5+ IMDb</option>
              <option value="8.0">★ 8.0+ IMDb</option>
              <option value="7.0">★ 7.0+ IMDb</option>
              <option value="6.0">★ 6.0+ IMDb</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
              <span>Found {filteredMovies.length} movie(s)</span>
              <button
                onClick={handleClearFilters}
                className="text-[#e63946] hover:underline flex items-center gap-1 font-semibold"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Dynamic List Rendering */}
        {hasActiveFilters ? (
          <div>
            <h3 className="text-xl font-bold text-white mb-6">
              Search Results
            </h3>
            {filteredMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleSelectMovie(movie)}
                    downloadStatus={downloadStatuses[movie.id] || 'idle'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {myList.length > 0 && (
              <CategoryRow
                title="My List"
                movies={myList}
                onClick={handleSelectMovie}
                downloadStatuses={downloadStatuses}
              />
            )}
            {continueWatching.length > 0 && (
              <ContinueWatchingRow
                title="Continue Watching"
                items={continueWatching}
              />
            )}
            <CategoryRow
              title="Newly Added Releases"
              movies={[...movies].sort((a, b) => b.id - a.id)}
              onClick={handleSelectMovie}
              downloadStatuses={downloadStatuses}
            />
          </div>
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onDownload={() => {
            startDownload(selectedMovie);
            setSelectedMovie(null);
          }}
          downloadStatus={downloadStatuses[selectedMovie.id] || 'idle'}
        />
      )}
    </div>
  );
}

// Subcomponents

function SkeletonLoader() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 py-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] w-full bg-white/5 animate-pulse rounded-2xl border border-white/10"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl p-8 max-w-md mx-auto">
      <Film className="w-16 h-16 text-gray-500 mx-auto mb-4 animate-bounce" />
      <h3 className="text-lg font-bold text-white">No Movies Found</h3>
      <p className="text-sm text-gray-400 mt-2">
        Movies will appear here soon. Try altering your filters or search query.
      </p>
    </div>
  );
}

function MovieCard({ movie, onClick, downloadStatus }) {
  const [showTrailer, setShowTrailer] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    if (movie.trailerUrl) {
      timerRef.current = setTimeout(() => {
        setShowTrailer(true);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTrailer(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const getAutoplayTrailerUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&showinfo=0&loop=1`;
    }
    return url;
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group aspect-[2/3] w-full relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-[#1a1a2e] transition-all duration-300 ease-out hover:scale-104 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(230,57,70,0.25)] hover:border-[#e63946]/40"
    >
      {showTrailer && movie.trailerUrl ? (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-2xl">
          <iframe
            src={getAutoplayTrailerUrl(movie.trailerUrl)}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '300%',
              height: '100%',
              transform: 'translate(-50%, -50%)',
            }}
            allow="autoplay; encrypted-media"
            frameBorder="0"
          />
        </div>
      ) : (
        <SafeImage
          src={
            movie.posterUrl ||
            'https://placehold.co/500x750/0c0c14/ffffff?text=No+Poster'
          }
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-30">
        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[#ffd60a] font-bold text-xs flex items-center gap-0.5">
              ★ {movie.rating}
            </span>
            <span className="px-2 py-0.5 bg-[#e63946] text-white text-[9px] font-bold rounded uppercase">
              {movie.ottPlatform || 'OTT'}
            </span>
          </div>
          <h4 className="text-white font-bold text-sm truncate">
            {movie.title}
          </h4>
          <p className="text-[10px] text-gray-400">
            {movie.genre?.split('/')[0]} • {movie.language}
          </p>

          <div className="flex items-center gap-1.5 pt-2">
            <span className="text-[9px] bg-white/15 px-1.5 py-0.5 rounded text-gray-300 font-mono">
              {movie.videoResolution || '1080p'}
            </span>
            <span className="text-[9px] text-gray-400 ml-auto">
              {movie.duration}m
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
            {downloadStatus === 'completed' && (
              <span className="text-green-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Offline
              </span>
            )}
            {downloadStatus === 'downloading' && (
              <span className="text-[#ffd60a] font-semibold flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {downloadStatus === 'failed' && (
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Failed
              </span>
            )}
            {downloadStatus === 'idle' && (
              <span className="text-gray-400 flex items-center gap-1">
                <Download className="w-3 h-3" /> Download
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-[9px] flex items-center gap-1 border border-white/10 z-35">
        {downloadStatus === 'completed' && (
          <span className="text-green-400 font-bold flex items-center gap-0.5">
            ● Offline
          </span>
        )}
        {downloadStatus === 'downloading' && (
          <span className="text-yellow-400 font-bold flex items-center gap-0.5 animate-pulse">
            ● Saving
          </span>
        )}
        {downloadStatus === 'failed' && (
          <span className="text-red-400 font-bold flex items-center gap-0.5">
            ● Error
          </span>
        )}
        {downloadStatus === 'idle' && (
          <span className="text-gray-400 font-medium">● Available</span>
        )}
      </div>
    </div>
  );
}

function CategoryRow({ title, movies, onClick, downloadStatuses }) {
  const rowRef = useRef(null);

  if (movies.length === 0) return null;

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth * 0.8
          : scrollLeft + clientWidth * 0.8;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/row">
      <h3 className="text-2xl font-bold text-white mb-4 pl-2 font-outfit border-l-4 border-[#e63946] leading-none">
        {title}
      </h3>

      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-24 bg-black/60 hover:bg-black/85 hover:scale-105 border border-white/5 text-white rounded-r-2xl hidden group-hover/row:flex items-center justify-center z-40 transition-all backdrop-blur"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div
        ref={rowRef}
        className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 no-scrollbar scroll-smooth w-full"
      >
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="w-[180px] sm:w-[200px] md:w-[220px] shrink-0"
          >
            <MovieCard
              movie={movie}
              onClick={() => onClick(movie)}
              downloadStatus={downloadStatuses[movie.id] || 'idle'}
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-24 bg-black/60 hover:bg-black/85 hover:scale-105 border border-white/5 text-white rounded-l-2xl hidden group-hover/row:flex items-center justify-center z-40 transition-all backdrop-blur"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

function MovieDetailsModal({ movie, onClose, onDownload, downloadStatus }) {
  const videoId = getYoutubeId(movie.trailerUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="glass-strong rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10 animate-scale-in flex flex-col md:flex-row relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-[#e63946] text-white rounded-full transition-colors z-50 border border-white/10 shadow"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-full md:w-2/5 p-6 flex flex-col items-center justify-center bg-white/5 border-r border-white/5">
          <img
            src={
              movie.posterUrl ||
              'https://placehold.co/500x750/0c0c14/ffffff?text=No+Poster'
            }
            alt={movie.title}
            className="w-56 md:w-full rounded-2xl shadow-2xl border border-white/10"
            onError={(e) => {
              e.target.src =
                'https://placehold.co/500x750/0c0c14/ffffff?text=No+Poster';
            }}
          />
        </div>

        <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-0.5 bg-[#e63946] text-white font-bold rounded-full uppercase tracking-wider">
                {movie.ottPlatform || 'OTT PREMIERE'}
              </span>
              <span className="text-[#ffd60a] font-bold flex items-center gap-0.5">
                ★ {movie.rating}/10
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {movie.duration}m
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />{' '}
                {movie.createdAt
                  ? new Date(movie.createdAt).getFullYear()
                  : '2026'}
              </span>
              <span className="px-1.5 py-0.5 border border-white/20 text-gray-300 rounded font-mono uppercase">
                {movie.language}
              </span>
            </div>

            <h2 className="text-3xl font-extrabold text-white font-outfit leading-tight">
              {movie.title}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {movie.synopsis}
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs bg-white/5 border border-white/5 rounded-2xl p-4">
              <div>
                <span className="text-gray-500 block">Resolution</span>
                <span className="text-white font-semibold">
                  {movie.videoResolution || '1080p Full HD'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">File Size</span>
                <span className="text-white font-semibold font-mono">
                  {formatBytes(movie.fileSize || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Primary Server</span>
                <span className="text-[#ffd60a] font-semibold uppercase">
                  {movie.storageProvider === 'google_drive'
                    ? 'Google Cloud Proxy'
                    : 'Backblaze US-East'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Backup Server</span>
                <span className="text-gray-400 font-semibold uppercase">
                  {movie.storageProvider === 'google_drive'
                    ? 'Backblaze B2'
                    : 'Google Drive'}
                </span>
              </div>
            </div>

            {movie.castList && movie.castList.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-2">
                  Top Cast
                </span>
                <div className="flex gap-2 flex-wrap">
                  {movie.castList.map((actor, idx) => (
                    <span
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white"
                    >
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-8 pt-4 border-t border-white/5">
            <button
              onClick={onDownload}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all"
            >
              {downloadStatus === 'completed' ? (
                <>
                  <Check className="w-5 h-5" /> Downloaded (Save Again)
                </>
              ) : downloadStatus === 'downloading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" /> Download Offline
                </>
              )}
            </button>
            {videoId && (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white border-none transition-all hidden md:flex"
              >
                Watch Trailer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContinueWatchingRow({ title, items }) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <div className="relative">
      <h3 className="text-2xl font-bold text-white mb-4 pl-2 font-outfit border-l-4 border-[#ffd60a] leading-none">
        {title}
      </h3>
      <div className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 no-scrollbar scroll-smooth">
        {items.map((item) => {
          const movie = item.movie;
          if (!movie) return null;
          const durationSec = (movie.duration || 120) * 60;
          const percent =
            Math.min(
              100,
              Math.round((item.progressSeconds / durationSec) * 100)
            ) || 10;

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/ott/movie/${movie.id}`)}
              className="min-w-[220px] md:min-w-[260px] relative group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-30 shadow-lg hover:shadow-2xl bg-white/5 border border-white/10"
            >
              <div className="aspect-video w-full bg-white/5 relative">
                <img
                  src={movie.bannerUrl || movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-white text-black p-3 rounded-full hover:bg-[#ffd60a] transition-all transform scale-90 group-hover:scale-100 duration-300">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </div>
                {/* Progress bar overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                  <div
                    className="h-full bg-[#e63946]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-white font-bold text-sm truncate">
                  {movie.title}
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  {movie.language} • {movie.genre?.split('/')[0]}
                </p>
                <p className="text-[10px] text-[#ffd60a] font-semibold mt-1">
                  Resume at {Math.floor(item.progressSeconds / 60)}m
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
