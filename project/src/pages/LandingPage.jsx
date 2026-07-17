import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  ChevronRight,
  Film,
  Star,
  Clock,
  AlertCircle,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { tmdbApi } from '../lib/api';

import TMDBMovieCard from '../components/TMDBMovieCard';
import { CarouselSkeleton, MovieCardSkeleton } from '../components/Skeletons';
import HeroCarousel from '../components/HeroCarousel';
import NearbyTheatresSection from '../components/NearbyTheatresSection';
import { useLocation } from '../context/LocationContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { selectedCity, setShowLocationModal } = useLocation();
  const [nowPlaying, setNowPlaying] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [popular, setPopular] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMovies = async () => {
    setLoading(true);
    setError(false);
    try {
      const [nowRes, upRes, popRes, trendRes, topRes] = await Promise.all([
        tmdbApi.getNowPlaying(),
        tmdbApi.getUpcoming(),
        tmdbApi.getPopular(),
        tmdbApi.getTrending(),
        tmdbApi.getTopRated(),
      ]);

      if (nowRes.data?.error) throw new Error('TMDB not configured');

      setNowPlaying(nowRes.data.results || []);
      setUpcoming(upRes.data.results || []);
      setPopular(popRes.data.results || []);
      setTrending(trendRes.data.results || []);
      setTopRated(topRes.data.results || []);
    } catch (err) {
      console.error('Failed to fetch TMDB movies', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="glass p-8 rounded-2xl flex flex-col items-center max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Unable to load latest movies.
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Could not connect to TMDB. Please check your API key configuration.
          </p>
          <button
            onClick={fetchMovies}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const renderSection = (
    title,
    subtitle,
    icon,
    movies,
    linkTo,
    isUpcoming = false
  ) => (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-sm text-[#ffd60a] hover:gap-2 transition-all font-medium"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      {loading ? (
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[180px] md:min-w-[220px]">
              <MovieCardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {movies.map((movie) => (
            <div key={movie.id} className="min-w-[180px] md:min-w-[220px]">
              <TMDBMovieCard movie={movie} isUpcoming={isUpcoming} />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const heroMovies = trending.slice(0, 5).map((tmdb) => ({
    id: tmdb.id,
    title: tmdb.title,
    synopsis: tmdb.overview,
    posterUrl: tmdb.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
      : `https://placehold.co/500x750/1a1a2e/666?text=${encodeURIComponent(tmdb.title)}`,
    bannerUrl: tmdb.backdrop_path
      ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}`
      : `https://placehold.co/1920x1080/1a1a2e/666?text=${encodeURIComponent(tmdb.title)}`,
    genre: 'Trending',
    language: 'EN',
    duration: 120,
    rating: tmdb.vote_average,
    trailerUrl: '',
    castList: [],
    isTrending: true,
    createdAt: '',
  }));

  return (
    <div className="min-h-screen page-enter">
      {/* Hero */}
      {loading ? (
        <div className="px-4 pt-20">
          <CarouselSkeleton />
        </div>
      ) : (
        <HeroCarousel movies={heroMovies} />
      )}

      {/* Search + Location */}
      <section className="max-w-2xl mx-auto px-4 -mt-8 relative z-20">
        <form onSubmit={handleSearch}>
          <div className="glass-strong rounded-2xl p-2 flex items-center gap-2 shadow-2xl neon-border-red">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, theatres, cities..."
                className="w-full bg-transparent pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#ffd60a] hover:bg-white/5 rounded-xl transition-all whitespace-nowrap"
            >
              <MapPin className="w-4 h-4" />
              {selectedCity || 'Set City'}
            </button>
            <button
              type="submit"
              className="btn-primary !rounded-xl whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      <div className="mt-8">
        {/* Nearby Theatres Section */}
        <NearbyTheatresSection />

        {renderSection(
          '🎬 Now Playing',
          'Currently in theatres',
          <Film className="w-5 h-5 text-white" />,
          nowPlaying,
          '/movies'
        )}
        {renderSection(
          '🔥 Trending Today',
          'Top trending movies right now',
          <TrendingUp className="w-5 h-5 text-white" />,
          trending,
          '/movies?tab=trending'
        )}
        {renderSection(
          '🍿 Popular',
          'Fan favorites globally',
          <Star className="w-5 h-5 text-white" />,
          popular,
          '/movies?tab=popular'
        )}
        {renderSection(
          '🎥 Coming Soon',
          'Upcoming releases',
          <Clock className="w-5 h-5 text-white" />,
          upcoming,
          '/movies?tab=upcoming',
          true
        )}
        {renderSection(
          '⭐ Top Rated',
          'Highest rated of all time',
          <Star className="w-5 h-5 text-white" />,
          topRated,
          '/movies?tab=toprated'
        )}
      </div>
    </div>
  );
}
