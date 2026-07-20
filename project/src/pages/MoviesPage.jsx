import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Flame,
  Star,
  Clock,
  Film,
  AlertCircle,
  Filter,
  Globe,
} from 'lucide-react';
import { tmdbApi } from '../lib/api';

import TMDBMovieCard from '../components/TMDBMovieCard';
import { MovieGridSkeleton } from '../components/Skeletons';

const TABS = [
  {
    id: 'now_playing',
    label: 'Now Playing',
    icon: <Film className="w-4 h-4" />,
  },
  { id: 'trending', label: 'Trending', icon: <Flame className="w-4 h-4" /> },
  { id: 'popular', label: 'Popular', icon: <Star className="w-4 h-4" /> },
  { id: 'upcoming', label: 'Coming Soon', icon: <Clock className="w-4 h-4" /> },
  { id: 'toprated', label: 'Top Rated', icon: <Star className="w-4 h-4" /> },
];

const LANGUAGES = ['All', 'EN', 'TE', 'HI', 'TA', 'ML', 'KO', 'JA', 'FR', 'ES'];
const LANGUAGE_LABELS = {
  All: 'All Languages',
  EN: 'English',
  TE: 'Telugu',
  HI: 'Hindi',
  TA: 'Tamil',
  ML: 'Malayalam',
  KO: 'Korean',
  JA: 'Japanese',
  FR: 'French',
  ES: 'Spanish',
};

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 16, name: 'Animation' },
  { id: 12, name: 'Adventure' },
  { id: 14, name: 'Fantasy' },
  { id: 9648, name: 'Mystery' },
  { id: 36, name: 'History' },
];

export default function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeTab = searchParams.get('tab') || 'now_playing';
  const isSearchActive = !!searchParams.get('search');

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMovies = async () => {
      setLoading(true);
      setError(false);
      try {
        const search = searchParams.get('search');
        let res;
        // Since tmdbApi doesn't yet support AbortSignal in our custom lib, we just check aborted state.
        // If we want to truly abort Axios requests we'd need to modify tmdbApi, but preventing stale state is enough.
        if (search) {
          res = await tmdbApi.search(search);
        } else {
          switch (activeTab) {
            case 'trending':
              res = await tmdbApi.getTrending();
              break;
            case 'popular':
              res = await tmdbApi.getPopular();
              break;
            case 'upcoming':
              res = await tmdbApi.getUpcoming();
              break;
            case 'toprated':
              res = await tmdbApi.getTopRated();
              break;
            case 'now_playing':
            default:
              res = await tmdbApi.getNowPlaying();
              break;
          }
        }
        if (controller.signal.aborted) return;
        if (res.data?.error) throw new Error('TMDB Error');
        setMovies(res.data?.results || []);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch movies', err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchMovies();

    return () => {
      controller.abort();
    };
  }, [searchParams, activeTab]);

  // Apply language + genre filters
  useEffect(() => {
    let result = [...movies];
    if (selectedLanguage !== 'All') {
      result = result.filter(
        (m) => m.original_language?.toUpperCase() === selectedLanguage
      );
    }
    if (selectedGenre !== null) {
      result = result.filter((m) => m.genre_ids?.includes(selectedGenre));
    }
    setFilteredMovies(result);
  }, [movies, selectedLanguage, selectedGenre]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery.trim() });
    } else {
      setSearchParams({ tab: 'now_playing' });
    }
  };

  const handleTabChange = (tab) => {
    setSearchQuery('');
    setSelectedLanguage('All');
    setSelectedGenre(null);
    setSearchParams({ tab });
  };

  const clearFilters = () => {
    setSelectedLanguage('All');
    setSelectedGenre(null);
  };

  const hasActiveFilters = selectedLanguage !== 'All' || selectedGenre !== null;

  return (
    <div className="min-h-screen pt-20 page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Search */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Explore Movies</h1>
          <div className="flex gap-3 max-w-2xl">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies by title, genre..."
                className="input-field !rounded-full pl-12"
              />
            </form>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                hasActiveFilters
                  ? 'bg-[#e63946] border-[#e63946] text-white'
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 bg-white/20 rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  ●
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-5 mb-6 border border-white/10 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filters
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#e63946] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Language Filter */}
            <div className="mb-5">
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Language
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`filter-pill ${selectedLanguage === lang ? 'active' : ''}`}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                Genre
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGenre(null)}
                  className={`filter-pill ${selectedGenre === null ? 'active' : ''}`}
                >
                  All Genres
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() =>
                      setSelectedGenre(g.id === selectedGenre ? null : g.id)
                    }
                    className={`filter-pill ${selectedGenre === g.id ? 'active' : ''}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs (Hidden if searching) */}
        {!isSearchActive && (
          <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#e63946] text-white shadow-lg shadow-red-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}

        {isSearchActive && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl text-white">
              Results for "{searchParams.get('search')}"
            </h2>
            <button
              onClick={() => handleTabChange('now_playing')}
              className="text-sm text-[#e63946] hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && filteredMovies.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            {filteredMovies.length} movies
            {hasActiveFilters && ' (filtered)'}
          </p>
        )}

        {/* Results */}
        {error ? (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">Unable to connect to TMDB.</p>
          </div>
        ) : loading ? (
          <MovieGridSkeleton count={10} />
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-gray-400 text-lg font-medium">No movies found</p>
            <p className="text-gray-500 text-sm mt-1">
              {hasActiveFilters
                ? 'Try removing some filters.'
                : 'Try different search terms.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-primary mt-4">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filteredMovies.map((movie) => (
              <TMDBMovieCard
                key={movie.id}
                movie={movie}
                isUpcoming={activeTab === 'upcoming'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
