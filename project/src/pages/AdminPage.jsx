import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  Building2,
  CalendarClock,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  Ticket,
  IndianRupee,
  Gift,
  Tv,
  HardDrive,
  Video,
  Search,
} from 'lucide-react';
import {
  moviesApi,
  theatresApi,
  showtimesApi,
  bookingsApi,
  vouchersApi,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import {
  formatPrice,
  formatDate,
  formatTime,
  formatDuration,
} from '../lib/utils';
import VideoUploadPanel from '../components/VideoUploadPanel';

export default function AdminPage() {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!profile || !isAdmin)) {
      toast('Admin access required', 'error');
      navigate('/');
    }
  }, [authLoading, profile, isAdmin, navigate, toast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mv, th, st, bk, statsRes, vouchRes, storageRes] = await Promise.all([
        moviesApi.getAll(),
        theatresApi.getAll(),
        showtimesApi.getAll(),
        bookingsApi.getAll(),
        bookingsApi.getStats(),
        vouchersApi.getAll(),
        moviesApi.getStorageStats(),
      ]);
      setMovies(mv.data || []);
      setTheatres(th.data || []);
      setShowtimes(st.data || []);
      setBookings(bk.data || []);
      setStats(statsRes.data);
      setVouchers(vouchRes.data || []);
      setStorageStats(storageRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && isAdmin) fetchAll();
  }, [profile, isAdmin, fetchAll]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#e63946] mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'theatres', label: 'Theatres', icon: Building2 },
    { id: 'showtimes', label: 'Showtimes', icon: CalendarClock },
    { id: 'bookings', label: 'Bookings', icon: Ticket },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
    { id: 'ott', label: 'OTT Management', icon: Tv },
  ];

  return (
    <div className="min-h-screen pt-20 page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage movies, theatres, showtimes, and view bookings
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar mb-8 glass rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#e63946] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab stats={stats} movies={movies} storageStats={storageStats} />}
        {tab === 'movies' && <MoviesTab movies={movies} onRefresh={fetchAll} storageStats={storageStats} />}
        {tab === 'theatres' && (
          <TheatresTab theatres={theatres} onRefresh={fetchAll} />
        )}
        {tab === 'showtimes' && (
          <ShowtimesTab
            showtimes={showtimes}
            movies={movies}
            theatres={theatres}
            onRefresh={fetchAll}
          />
        )}
        {tab === 'bookings' && (
          <BookingsTab bookings={bookings} onRefresh={fetchAll} />
        )}
        {tab === 'vouchers' && (
          <VouchersTab vouchers={vouchers} onRefresh={fetchAll} />
        )}
        {tab === 'ott' && <OttTab movies={movies} onRefresh={fetchAll} />}
      </div>
    </div>
  );
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

function DashboardTab({ stats, movies, storageStats }) {
  if (!stats) return null;
  const maxBookings = Math.max(...stats.last7Days.map((d) => d.count), 1);

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats.totalRevenue),
      icon: IndianRupee,
      color: 'text-[#ffd60a]',
      bg: 'from-yellow-500/20 to-orange-500/10',
    },
    {
      label: 'Total Bookings',
      value: stats.totalBookings,
      icon: Ticket,
      color: 'text-green-400',
      bg: 'from-green-500/20 to-emerald-500/10',
    },
    {
      label: 'Tickets Sold',
      value: stats.totalSeats,
      icon: Users,
      color: 'text-blue-400',
      bg: 'from-blue-500/20 to-cyan-500/10',
    },
    {
      label: 'Active Movies',
      value: movies.length,
      icon: Film,
      color: 'text-[#e63946]',
      bg: 'from-red-500/20 to-pink-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`stats-card bg-gradient-to-br ${s.bg}`}>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Multi-Cloud Storage Management */}
      <div className="glass rounded-2xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-[#ffd60a]" />
          <h3 className="font-semibold text-white">
            Multi-Cloud Storage Management
          </h3>
          <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Active Provider:{' '}
            {storageStats?.activeProvider === 'backblaze_b2'
              ? 'Backblaze B2'
              : storageStats?.activeProvider === 'google_drive'
                ? 'Google Drive'
                : 'None'}
          </span>
        </div>
        {storageStats ? (
          <div className="space-y-6">
            {/* Top-level statistics summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className="text-xl font-bold text-white">
                  {storageStats.providers.filter((p) => p.configured).length}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                  Total Providers
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className="text-xl font-bold text-white">
                  {storageStats.totalObjects}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                  Video Files
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className="text-xl font-bold text-white">
                  {storageStats.totalSizeGb.toFixed(2)} GB
                </p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                  Total Storage Used
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className="text-xl font-bold text-green-400">
                  {
                    storageStats.providers.filter(
                      (p) => p.configured && p.healthy
                    ).length
                  }{' '}
                  / {storageStats.providers.filter((p) => p.configured).length}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                  Healthy Services
                </p>
              </div>
            </div>

            {/* Provider List / Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm text-gray-300">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase font-semibold">
                    <th className="p-3">Provider Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Used Space</th>
                    <th className="p-3">Remaining Space</th>
                    <th className="p-3">Files Stored</th>
                    <th className="p-3">Last Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/10">
                  {storageStats.providers.map((provider) => {
                    const pct =
                      provider.storageLimit > 0
                        ? (provider.storageUsed / provider.storageLimit) * 100
                        : 0;
                    return (
                      <tr
                        key={provider.providerId}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${provider.healthy ? 'bg-green-400' : 'bg-red-500'}`}
                          ></span>
                          {provider.name}
                          {provider.healthy && (
                            <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-normal">
                              Active
                            </span>
                          )}
                          {storageStats.activeProvider ===
                            provider.providerId && (
                            <span className="text-[9px] bg-[#ffd60a]/10 text-[#ffd60a] border border-[#ffd60a]/20 px-1.5 py-0.5 rounded-full font-normal">
                              Primary
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              provider.status === 'Connected'
                                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                : provider.status === 'Not Configured'
                                  ? 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            } border`}
                          >
                            {provider.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="font-mono text-xs">
                              {formatBytes(provider.storageUsed)}
                            </span>
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#e63946] to-[#ffd60a] rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {provider.configured
                            ? formatBytes(provider.storageRemaining)
                            : '—'}
                        </td>
                        <td className="p-3 font-mono">{provider.filesCount}</td>
                        <td className="p-3 text-xs text-gray-400">
                          {provider.lastUpload !== 'Never'
                            ? new Date(provider.lastUpload).toLocaleString()
                            : 'Never'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading storage
            stats...
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-[#ffd60a]" />
          <h3 className="font-semibold text-white">Bookings — Last 7 Days</h3>
        </div>
        <div className="flex items-end justify-between gap-2" style={{ minHeight: '10rem' }}>
          {stats.last7Days.map((d) => {
            const barMaxHeight = 112; // px – height available for bars
            const barHeight = d.count > 0
              ? Math.max((d.count / maxBookings) * barMaxHeight, 8)
              : 0;
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className="w-full bg-white/5 rounded-t-lg flex items-end overflow-hidden"
                  style={{ height: `${barMaxHeight}px` }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-[#e63946] to-[#ff6b6b] rounded-t-lg transition-all duration-700"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(d.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                  })}
                </span>
                <span className="text-xs text-white font-bold">{d.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MoviesTab({ movies, onRefresh, storageStats }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedVideoId, setExpandedVideoId] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Delete this movie? This will also delete its showtimes.'))
      return;
    try {
      await moviesApi.delete(id);
      toast('Movie deleted', 'success');
      onRefresh();
    } catch {
      toast('Failed to delete movie', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          Manage Movies ({movies.length})
        </h2>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Movie
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {movies.map((m) => (
          <div
            key={m.id}
            className="glass rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex gap-3">
              <img
                src={m.posterUrl}
                alt={m.title}
                className="w-16 h-24 rounded-lg object-cover shrink-0"
                onError={(e) => {
                  e.target.src =
                    'https://placehold.co/64x96/1a1a2e/666?text=N/A';
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{m.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m.genre} • {m.language} • {formatDuration(m.duration)}
                </p>
                <p className="text-xs text-[#ffd60a] mt-1">
                  ★ {m.rating.toFixed(1)} {m.isTrending && '• 🔥 Trending'}
                </p>
                {/* Video status indicator */}
                <div className="flex items-center gap-1 mt-1.5">
                  {m.videoFileName ? (
                    <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 rounded px-1.5 py-0.5">
                      🎬 B2 Video
                    </span>
                  ) : m.streamUrl ? (
                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5">
                      🔗 Stream URL
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-500/15 text-gray-400 border border-gray-500/20 rounded px-1.5 py-0.5">
                      No video
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => {
                      setEditing(m);
                      setShowForm(true);
                    }}
                    className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  <button
                    onClick={() =>
                      setExpandedVideoId(expandedVideoId === m.id ? null : m.id)
                    }
                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Video className="w-3 h-3" />
                    {expandedVideoId === m.id ? 'Hide Video' : 'Manage Video'}
                  </button>
                </div>
              </div>
            </div>
            {/* Inline video upload panel */}
            {expandedVideoId === m.id && (
              <VideoUploadPanel
                movieId={m.id}
                movieTitle={m.title}
                videoState={{
                  hasVideo: !!m.videoFileName,
                  fileSize: m.fileSize,
                  mimeType: m.mimeType,
                  uploadDate: m.uploadDate,
                  storageProvider: m.storageProvider,
                  videoFileName: m.videoFileName,
                }}
                onUpdated={() => {
                  onRefresh();
                }}
              />
            )}
          </div>
        ))}
      </div>
      {showForm && (
        <MovieFormModal
          movie={editing}
          storageStats={storageStats}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function MovieFormModal({ movie, storageStats, onClose, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [showTmdbSearch, setShowTmdbSearch] = useState(!movie);

  // Unified Upload States
  const [videoFile, setVideoFile] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [form, setForm] = useState({
    title: movie?.title || '',
    genre: movie?.genre || '',
    language: movie?.language || 'EN',
    duration: movie?.duration?.toString() || '120',
    rating: movie?.rating?.toString() || '8.0',
    posterUrl: movie?.posterUrl || '',
    bannerUrl: movie?.bannerUrl || '',
    trailerUrl: movie?.trailerUrl || '',
    synopsis: movie?.synopsis || '',
    castList: (movie?.castList || []).join(', '),
    isTrending: movie?.isTrending || false,
    isOtt: movie?.isOtt || false,
    ottPlatform: movie?.ottPlatform || '',
    streamUrl: movie?.streamUrl || '',
    tmdbId: movie?.tmdbId || null,
    downloadEnabled: movie?.downloadEnabled || false,
    videoResolution: movie?.videoResolution || '1080p',
  });

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSeconds = (s) => {
    if (!isFinite(s) || s <= 0) return '—';
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    const rem = Math.round(s % 60);
    return `${m}m ${rem}s`;
  };

  const handleTmdbSearch = async (e) => {
    e.preventDefault();
    const query = tmdbSearchQuery.trim();
    if (!query) return;
    setSearchingTmdb(true);
    try {
      // Check for IMDB ID (tt1234567) or URL
      const imdbMatch = query.match(/(?:title\/|)(tt\d+)/);
      if (imdbMatch) {
        const imdbId = imdbMatch[1];
        const res = await fetch(
          `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id&api_key=141ea88387c1b631ada6119fa0c6c619`
        );
        const data = await res.json();
        if (data.movie_results?.length > 0) {
          await autofillFromTmdb(data.movie_results[0]);
          return;
        } else {
          toast('No movie found for this IMDB ID', 'error');
          return;
        }
      }

      // Check for TMDB URL or direct ID
      const tmdbMatch = query.match(/(?:movie\/|)(\d{3,})/);
      if (tmdbMatch && !query.includes(' ')) {
        await autofillFromTmdb({ id: tmdbMatch[1] });
        return;
      }

      // Standard text search
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=141ea88387c1b631ada6119fa0c6c619`
      );
      const data = await res.json();
      setTmdbSearchResults(data.results || []);
    } catch (err) {
      toast('Failed to search TMDB', 'error');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const autofillFromTmdb = async (tmdbMovie, durationOverride) => {
    setSearchingTmdb(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?append_to_response=credits,videos&api_key=141ea88387c1b631ada6119fa0c6c619`
      );
      const details = await res.json();

      const trailer = details.videos?.results?.find(
        (v) => v.type === 'Trailer' && v.site === 'YouTube'
      );
      const cast =
        details.credits?.cast
          ?.slice(0, 5)
          .map((c) => c.name)
          .join(', ') || '';

      const mapLanguage = (code) => {
        const mapping = {
          te: 'Telugu',
          hi: 'Hindi',
          en: 'English',
          ta: 'Tamil',
          ko: 'Korean',
          ml: 'Malayalam',
        };
        return mapping[code.toLowerCase()] || 'English';
      };

      setForm({
        ...form,
        title: details.title,
        genre: details.genres?.map((g) => g.name).join(', ') || 'Action',
        language: mapLanguage(details.original_language || 'en'),
        duration: durationOverride || details.runtime?.toString() || '120',
        rating: details.vote_average?.toFixed(1) || '0',
        posterUrl: details.poster_path
          ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
          : '',
        bannerUrl: details.backdrop_path
          ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
          : '',
        trailerUrl: trailer
          ? `https://www.youtube.com/embed/${trailer.key}`
          : '',
        synopsis: details.overview || '',
        castList: cast,
        tmdbId: details.id,
        isOtt: true,
      });
      setShowTmdbSearch(false);
      toast('Autofilled from TMDB', 'success');
    } catch (err) {
      toast('Failed to fetch details', 'error');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const triggerTmdbSearch = async (cleanName, durationMins) => {
    setTmdbSearchQuery(cleanName);
    setSearchingTmdb(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(cleanName)}&api_key=141ea88387c1b631ada6119fa0c6c619`
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        await autofillFromTmdb(data.results[0], durationMins);
        toast(`Auto-filled details for "${data.results[0].title}"`, 'success');
      } else {
        setForm((f) => ({
          ...f,
          duration: durationMins || '120',
          title: cleanName,
          isOtt: true,
        }));
        toast(`Staged video. No TMDB match found.`, 'info');
      }
    } catch (err) {
      setForm((f) => ({
        ...f,
        duration: durationMins || '120',
        title: cleanName,
        isOtt: true,
      }));
      toast('Search failed, partially filled', 'error');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const getMaxUploadSize = () => {
    if (!storageStats?.providers) return Infinity;
    if (selectedProvider === 'auto') {
      const bestRemaining = storageStats.providers
        .filter((p) => p.configured && p.healthy)
        .reduce((max, p) => Math.max(max, p.storageRemaining || 0), 0);
      return bestRemaining > 0 ? bestRemaining : Infinity;
    }
    const provider = storageStats.providers.find(
      (p) => p.providerId === selectedProvider
    );
    return provider?.storageRemaining > 0 ? provider.storageRemaining : Infinity;
  };

  const handleSmartVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = getMaxUploadSize();
    if (maxSize !== Infinity && file.size > maxSize) {
      toast(`File too large. Available storage: ${formatBytes(maxSize)}`, 'error');
      if (e.target) e.target.value = '';
      return;
    }

    setVideoFile(file);
    setForm((f) => ({ ...f, isOtt: true, ottPlatform: 'CineBook Stream' }));
    toast('Analyzing video file...', 'info');

    // Clean filename for search
    let cleanName = file.name
      .replace(/\.[^/.]+$/, '') // remove extension
      .replace(/[._-]/g, ' ') // replace separators with spaces
      .replace(/\bs\d{2}e\d{2}\b/gi, '') // S01E01
      .replace(/\bs\d{1}e\d{1}\b/gi, '') // S1E1
      .replace(/\be\d{2}\b/gi, '') // E01
      .replace(/\bep\d{2}\b/gi, '') // EP01
      .replace(/\bepisode\s*\d+\b/gi, '') // episode 01
      .replace(/\bseason\s*\d+\b/gi, '') // season 01
      .replace(/\b(1080p|720p|4k|bluray|x264|hevc|web-dl|hdr)\b/gi, '') // remove qualities
      .replace(/\b(tel|tam|hin|eng|mal|kan)\b/gi, '') // remove language abbreviations (Telugu, Tamil, Hindi, etc.)
      .replace(/\s+/g, ' ') // collapse spaces
      .replace(/\(\d{4}\)/g, '') // remove year in parens
      .trim();

    // Extract runtime
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(videoUrl);
      const durationMins = Math.round(video.duration / 60).toString();

      const width = video.videoWidth;
      const height = video.videoHeight;
      let resolution = '1080p';
      if (width >= 3840 || height >= 2160) {
        resolution = '4K UHD';
      } else if (width >= 2560 || height >= 1440) {
        resolution = '2K QHD';
      } else if (width >= 1920 || height >= 1080) {
        resolution = '1080p Full HD';
      } else if (width >= 1280 || height >= 720) {
        resolution = '720p HD';
      } else if (width > 0) {
        resolution = `${height}p SD`;
      }

      setForm((prev) => ({ ...prev, videoResolution: resolution }));
      triggerTmdbSearch(cleanName, durationMins);
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      toast(
        'Could not extract video duration. Searching details anyway...',
        'warning'
      );
      triggerTmdbSearch(cleanName);
    };

    video.src = videoUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const resolveImdbUrl = async (url, type) => {
      if (!url || !url.includes('imdb.com/title/')) return url;
      const match = url.match(/title\/(tt\d+)/);
      if (!match) return url;
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/find/${match[1]}?external_source=imdb_id&api_key=141ea88387c1b631ada6119fa0c6c619`
        );
        const data = await res.json();
        if (data.movie_results?.length > 0) {
          const tm = data.movie_results[0];
          if (type === 'poster' && tm.poster_path)
            return `https://image.tmdb.org/t/p/w500${tm.poster_path}`;
          if (type === 'banner' && tm.backdrop_path)
            return `https://image.tmdb.org/t/p/original${tm.backdrop_path}`;
        } else if (data.tv_results?.length > 0) {
          const tm = data.tv_results[0];
          if (type === 'poster' && tm.poster_path)
            return `https://image.tmdb.org/t/p/w500${tm.poster_path}`;
          if (type === 'banner' && tm.backdrop_path)
            return `https://image.tmdb.org/t/p/original${tm.backdrop_path}`;
        }
      } catch (err) {}
      return url;
    };

    const resolvedPoster = await resolveImdbUrl(form.posterUrl, 'poster');
    const resolvedBanner = await resolveImdbUrl(form.bannerUrl, 'banner');

    const payload = {
      tmdbId: form.tmdbId,
      title: form.title,
      genre: form.genre,
      language: form.language,
      duration: parseInt(form.duration) || 120,
      rating: parseFloat(form.rating) || 0,
      posterUrl: resolvedPoster,
      bannerUrl: resolvedBanner,
      trailerUrl: form.trailerUrl,
      synopsis: form.synopsis,
      castList: form.castList
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isTrending: form.isTrending,
      isOtt: form.isOtt,
      ottPlatform: form.ottPlatform,
      streamUrl: form.streamUrl,
      downloadEnabled: form.downloadEnabled,
      videoResolution: form.videoResolution,
    };
    try {
      let savedMovie;
      if (movie) {
        const res = await moviesApi.update(movie.id, payload);
        savedMovie = res.data;
      } else {
        const res = await moviesApi.create(payload);
        savedMovie = res.data;
      }

      if (videoFile && savedMovie?.id) {
        setUploadingVideo(true);
        const providerParam =
          selectedProvider === 'auto' ? undefined : selectedProvider;
        const providerFriendly =
          selectedProvider === 'google_drive'
            ? 'Google Drive'
            : selectedProvider === 'backblaze_b2'
              ? 'Backblaze B2'
              : 'Cloud storage';
        toast(
          `Uploading video to ${providerFriendly}: "${videoFile.name}"`,
          'info'
        );
        try {
          await moviesApi.uploadVideo(
            savedMovie.id,
            videoFile,
            providerParam,
            (progress) => {
              setUploadProgress(progress);
            }
          );
          toast(
            `Video uploaded successfully to ${providerFriendly}!`,
            'success'
          );
        } catch (uploadErr) {
          console.error(uploadErr);
          toast(
            `Video upload failed: ${uploadErr.message || 'Error'}`,
            'error'
          );
        } finally {
          setUploadingVideo(false);
        }
      }

      toast(`Movie ${movie ? 'updated' : 'created'} successfully`, 'success');
      onSaved();
    } catch {
      toast('Failed to save movie metadata', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImdbUrlPasted = async (field, url) => {
    if (!url.includes('imdb.com/title/')) return;
    const match = url.match(/title\/(tt\d+)/);
    if (!match) return;

    toast(`Fetching real image from IMDB...`, 'info');
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/find/${match[1]}?external_source=imdb_id&api_key=141ea88387c1b631ada6119fa0c6c619`
      );
      const data = await res.json();
      if (data.movie_results?.length > 0) {
        const tm = data.movie_results[0];
        if (field === 'posterUrl' && tm.poster_path) {
          setForm((f) => ({
            ...f,
            posterUrl: `https://image.tmdb.org/t/p/w500${tm.poster_path}`,
          }));
          toast('Fetched Poster from IMDB!', 'success');
        } else if (field === 'bannerUrl' && tm.backdrop_path) {
          setForm((f) => ({
            ...f,
            bannerUrl: `https://image.tmdb.org/t/p/original${tm.backdrop_path}`,
          }));
          toast('Fetched Banner from IMDB!', 'success');
        }
      } else if (data.tv_results?.length > 0) {
        const tm = data.tv_results[0];
        if (field === 'posterUrl' && tm.poster_path) {
          setForm((f) => ({
            ...f,
            posterUrl: `https://image.tmdb.org/t/p/w500${tm.poster_path}`,
          }));
          toast('Fetched Poster from IMDB (TV Show Match)!', 'success');
        } else if (field === 'bannerUrl' && tm.backdrop_path) {
          setForm((f) => ({
            ...f,
            bannerUrl: `https://image.tmdb.org/t/p/original${tm.backdrop_path}`,
          }));
          toast('Fetched Banner from IMDB (TV Show Match)!', 'success');
        }
      }
    } catch {
      toast('Failed to fetch from IMDB link', 'error');
    }
  };

  const handleTrailerUrlBlur = () => {
    const url = form.trailerUrl;
    if (url && !url.includes('/embed/')) {
      const match = url.match(
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
      );
      if (match && match[2].length === 11) {
        setForm({
          ...form,
          trailerUrl: `https://www.youtube.com/embed/${match[2]}`,
        });
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {movie ? (
              <Pencil className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {movie ? 'Edit Movie' : 'Add New Movie'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={uploadingVideo}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {true && (
          <div
            className={`mb-6 p-4 rounded-xl border transition-all duration-300 ${videoFile ? 'bg-green-500/10 border-green-500/30' : 'bg-[#e63946]/10 border-[#e63946]/20'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Video
                    className={`w-4 h-4 ${videoFile ? 'text-green-400' : 'text-[#e63946]'}`}
                  />
                  {videoFile
                    ? 'Video Selected & Staged'
                    : 'Smart Auto-Fill from Video'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {videoFile
                    ? `Staged video: ${videoFile.name} (${formatBytes(videoFile.size)})`
                    : 'Select a video file to auto-extract runtime, stage for cloud upload, and fetch TMDB details.'}
                </p>
              </div>
              {videoFile && (
                <button
                  type="button"
                  onClick={() => setVideoFile(null)}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                  disabled={uploadingVideo}
                >
                  Clear Video
                </button>
              )}
            </div>
            {videoFile && (
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/5 space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Target
                  Storage Cloud:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('auto')}
                    className={`flex-1 py-1.5 px-2 text-[10px] rounded-lg font-bold border transition-all ${
                      selectedProvider === 'auto'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🔄 Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('backblaze_b2')}
                    className={`flex-1 py-1.5 px-2 text-[10px] rounded-lg font-bold border transition-all ${
                      selectedProvider === 'backblaze_b2'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🔥 Backblaze B2
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('google_drive')}
                    className={`flex-1 py-1.5 px-2 text-[10px] rounded-lg font-bold border transition-all ${
                      selectedProvider === 'google_drive'
                        ? 'bg-green-500/20 border-green-500 text-green-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🍀 Google Drive
                  </button>
                </div>
              </div>
            )}
            {!videoFile && (
              <label className="mt-3 flex items-center justify-center w-full h-12 px-4 transition border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#e63946]/50 bg-white/5 hover:bg-white/10">
                <span className="flex items-center space-x-2">
                  <Video className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">
                    Select MP4/MKV to Auto-Fill & Stage Upload
                  </span>
                </span>
                <input
                  type="file"
                  name="file_upload"
                  className="hidden"
                  accept="video/mp4,video/webm,video/x-matroska,video/quicktime,.mp4,.webm,.mkv,.mov"
                  onChange={handleSmartVideoSelect}
                />
              </label>
            )}
          </div>
        )}

        {showTmdbSearch ? (
          <div className="mb-6 bg-white/5 border border-white/10 p-4 rounded-xl">
            <h4 className="text-sm font-semibold text-[#ffd60a] mb-2 flex items-center gap-2">
              <Film className="w-4 h-4" /> Auto-fill from TMDB
            </h4>
            <form onSubmit={handleTmdbSearch} className="flex gap-2 mb-3">
              <input
                value={tmdbSearchQuery}
                onChange={(e) => setTmdbSearchQuery(e.target.value)}
                placeholder="Search movie title..."
                className="input-field flex-1"
              />
              <button
                type="submit"
                disabled={searchingTmdb}
                className="btn-primary whitespace-nowrap"
              >
                {searchingTmdb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Search TMDB'
                )}
              </button>
            </form>
            {tmdbSearchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-2 bg-black/20">
                {tmdbSearchResults.map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => autofillFromTmdb(tm)}
                    className="w-full text-left p-2 hover:bg-white/10 rounded flex items-center gap-3 transition-colors"
                  >
                    {tm.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${tm.poster_path}`}
                        className="w-8 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-gray-800 rounded"></div>
                    )}
                    <div>
                      <div className="text-white text-sm font-medium">
                        {tm.title}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {tm.release_date
                          ? tm.release_date.substring(0, 4)
                          : 'N/A'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowTmdbSearch(false)}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Skip auto-fill and enter manually
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setShowTmdbSearch(true)}
              className="text-xs text-[#ffd60a] hover:underline flex items-center gap-1"
            >
              <Search className="w-3 h-3" /> Search TMDB Again
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title *"
              className="input-field flex-1"
              required
              disabled={uploadingVideo}
            />
            <button
              type="button"
              onClick={async () => {
                if (!form.title.trim()) {
                  toast('Please enter a movie title first', 'error');
                  return;
                }
                setSearchingTmdb(true);
                try {
                  const res = await fetch(
                    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(form.title)}&api_key=141ea88387c1b631ada6119fa0c6c619`
                  );
                  const data = await res.json();
                  if (data.results && data.results.length > 0) {
                    await autofillFromTmdb(data.results[0]);
                  } else {
                    toast(`No TMDB match found for "${form.title}"`, 'warning');
                  }
                } catch (err) {
                  toast('Failed to fetch details from TMDB', 'error');
                } finally {
                  setSearchingTmdb(false);
                }
              }}
              disabled={searchingTmdb || uploadingVideo}
              className="px-4 py-2 bg-[#ffd60a] hover:bg-[#ffe040] text-black font-semibold rounded-lg text-sm transition-all duration-300 flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              {searchingTmdb ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Fetch from TMDB
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={form.genre}
              onChange={(e) => setForm({ ...form, genre: e.target.value })}
              placeholder="Genre *"
              className="input-field"
              required
              disabled={uploadingVideo}
            />
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="input-field"
              disabled={uploadingVideo}
            >
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
            <input
              value={form.videoResolution}
              onChange={(e) =>
                setForm({ ...form, videoResolution: e.target.value })
              }
              placeholder="Resolution (e.g. 1080p, 4K)"
              className="input-field"
              disabled={uploadingVideo}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="Duration (min)"
              className="input-field"
              disabled={uploadingVideo}
            />
            <input
              type="number"
              step="0.1"
              max="10"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              placeholder="Rating /10"
              className="input-field"
              disabled={uploadingVideo}
            />
            <div className="flex flex-col gap-1 justify-center pl-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isTrending}
                  onChange={(e) =>
                    setForm({ ...form, isTrending: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#e63946]"
                  disabled={uploadingVideo}
                />
                🔥 Trending
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.isOtt}
                  onChange={(e) =>
                    setForm({ ...form, isOtt: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#ffd60a]"
                  disabled={uploadingVideo}
                />
                📺 OTT Movie
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.downloadEnabled}
                  onChange={(e) =>
                    setForm({ ...form, downloadEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-500"
                  disabled={uploadingVideo}
                />
                📥 Enable Downloads
              </label>
            </div>
          </div>
          {form.isOtt && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <input
                value={form.ottPlatform}
                onChange={(e) =>
                  setForm({ ...form, ottPlatform: e.target.value })
                }
                placeholder="Platform (Netflix, Prime...)"
                className="input-field"
                disabled={uploadingVideo}
              />
              <input
                value={form.streamUrl}
                onChange={(e) =>
                  setForm({ ...form, streamUrl: e.target.value })
                }
                placeholder="Stream URL"
                className="input-field"
                disabled={uploadingVideo}
              />
            </div>
          )}
          <div className="space-y-1">
            <input
              value={form.posterUrl}
              onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
              onBlur={(e) => handleImdbUrlPasted('posterUrl', e.target.value)}
              placeholder="Poster URL (or paste IMDB link)"
              className="input-field w-full"
              disabled={uploadingVideo}
            />

            {form.posterUrl && (
              <div className="text-[10px] pl-2 text-left">
                <a
                  href={form.posterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1"
                >
                  🖼️ View Poster Link
                </a>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <input
              value={form.bannerUrl}
              onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
              onBlur={(e) => handleImdbUrlPasted('bannerUrl', e.target.value)}
              placeholder="Banner URL (or paste IMDB link)"
              className="input-field w-full"
              disabled={uploadingVideo}
            />

            {form.bannerUrl && (
              <div className="text-[10px] pl-2 text-left">
                <a
                  href={form.bannerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1"
                >
                  🖼️ View Banner Link
                </a>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <input
              value={form.trailerUrl}
              onChange={(e) => setForm({ ...form, trailerUrl: e.target.value })}
              onBlur={handleTrailerUrlBlur}
              placeholder="YouTube Embed URL"
              className="input-field w-full"
              disabled={uploadingVideo}
            />

            {form.trailerUrl && (
              <div className="text-[10px] pl-2 text-left">
                <a
                  href={form.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#e63946] hover:text-red-400 font-bold underline flex items-center gap-1"
                >
                  🎥 Watch Trailer Link
                </a>
              </div>
            )}
          </div>
          <input
            value={form.castList}
            onChange={(e) => setForm({ ...form, castList: e.target.value })}
            placeholder="Cast (comma separated)"
            className="input-field"
            disabled={uploadingVideo}
          />
          <textarea
            value={form.synopsis}
            onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
            placeholder="Synopsis"
            rows={3}
            className="input-field resize-none"
            disabled={uploadingVideo}
          />

          {/* Upload progress indicator */}
          {uploadingVideo && uploadProgress && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span className="text-white font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#e63946]" />
                  Uploading video to{' '}
                  {selectedProvider === 'google_drive'
                    ? 'Google Drive'
                    : selectedProvider === 'backblaze_b2'
                      ? 'Backblaze B2'
                      : 'Selected Cloud'}
                  ...
                </span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#e63946] to-[#ffd60a] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                <span>Speed: {uploadProgress.speed} KB/s</span>
                <span>ETA: {formatSeconds(uploadProgress.remaining)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || uploadingVideo}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving || uploadingVideo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />{' '}
                {uploadingVideo
                  ? 'Uploading Video...'
                  : 'Saving Movie Details...'}
              </>
            ) : (
              `${movie ? 'Update' : 'Create'} Movie`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function TheatresTab({ theatres, onRefresh }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    city: '',
    state: '',
    country: '',
    latitude: '',
    longitude: '',
    screens: '1',
    seatCapacity: '200',
    phone: '',
    website: '',
    hasParking: false,
    hasFoodCourt: false,
    isWheelchairAccessible: false,
    isBookingEnabled: true,
  });
  const [saving, setSaving] = useState(false);

  const emptyForm = () => ({
    name: '',
    location: '',
    city: '',
    state: '',
    country: '',
    latitude: '',
    longitude: '',
    screens: '1',
    seatCapacity: '200',
    phone: '',
    website: '',
    hasParking: false,
    hasFoodCourt: false,
    isWheelchairAccessible: false,
    isBookingEnabled: true,
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name,
      location: t.location,
      city: t.city || '',
      state: t.state || '',
      country: t.country || '',
      latitude: t.latitude?.toString() || '',
      longitude: t.longitude?.toString() || '',
      screens: t.screens.toString(),
      seatCapacity: t.seatCapacity?.toString() || '200',
      phone: t.phone || '',
      website: t.website || '',
      hasParking: t.hasParking ?? false,
      hasFoodCourt: t.hasFoodCourt ?? false,
      isWheelchairAccessible: t.isWheelchairAccessible ?? false,
      isBookingEnabled: t.isBookingEnabled ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      location: form.location,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      screens: parseInt(form.screens) || 1,
      seatCapacity: parseInt(form.seatCapacity) || 200,
      phone: form.phone || null,
      website: form.website || null,
      hasParking: form.hasParking,
      hasFoodCourt: form.hasFoodCourt,
      isWheelchairAccessible: form.isWheelchairAccessible,
      isBookingEnabled: form.isBookingEnabled,
    };
    try {
      if (editing) await theatresApi.update(editing.id, payload);
      else await theatresApi.create(payload);
      toast('Theatre saved', 'success');
      setShowForm(false);
      onRefresh();
    } catch {
      toast('Failed to save theatre', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this theatre?')) return;
    try {
      await theatresApi.delete(id);
      toast('Theatre deleted', 'success');
      onRefresh();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          Manage Theatres ({theatres.length})
        </h2>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Theatre
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {theatres.map((t) => (
          <div
            key={t.id}
            className="glass rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white">{t.name}</h3>
                  {t.isBookingEnabled ? (
                    <span className="badge badge-green text-[10px]">Open</span>
                  ) : (
                    <span className="badge badge-red text-[10px]">Closed</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  📍 {t.location}
                  {t.city ? `, ${t.city}` : ''}
                </p>
                <p className="text-xs text-[#ffd60a] mt-1">
                  🎬 {t.screens} screen(s){t.latitude ? ' • 📡 GPS' : ''}
                </p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {t.hasParking && (
                    <span className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-400">
                      🅿️
                    </span>
                  )}
                  {t.hasFoodCourt && (
                    <span className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-400">
                      🍿
                    </span>
                  )}
                  {t.isWheelchairAccessible && (
                    <span className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-400">
                      ♿
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(t)}
                  className="text-blue-400 hover:text-blue-300 p-1 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-red-400 hover:text-red-300 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="glass-strong rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editing ? 'Edit Theatre' : 'Add Theatre'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Basic Info */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Basic Info
                </p>
                <div className="space-y-3">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Theatre Name *"
                    className="input-field"
                    required
                  />
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="Full Address / Location *"
                    className="input-field"
                    required
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      placeholder="City"
                      className="input-field"
                    />
                    <input
                      value={form.state}
                      onChange={(e) =>
                        setForm({ ...form, state: e.target.value })
                      }
                      placeholder="State"
                      className="input-field"
                    />
                    <input
                      value={form.country}
                      onChange={(e) =>
                        setForm({ ...form, country: e.target.value })
                      }
                      placeholder="Country"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
              {/* GPS */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  GPS Coordinates (for map)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) =>
                      setForm({ ...form, latitude: e.target.value })
                    }
                    placeholder="Latitude (e.g. 17.385)"
                    className="input-field"
                  />
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) =>
                      setForm({ ...form, longitude: e.target.value })
                    }
                    placeholder="Longitude (e.g. 78.486)"
                    className="input-field"
                  />
                </div>
              </div>
              {/* Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Screens</p>
                  <input
                    type="number"
                    value={form.screens}
                    onChange={(e) =>
                      setForm({ ...form, screens: e.target.value })
                    }
                    placeholder="Screens"
                    className="input-field"
                    min="1"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Seat Capacity</p>
                  <input
                    type="number"
                    value={form.seatCapacity}
                    onChange={(e) =>
                      setForm({ ...form, seatCapacity: e.target.value })
                    }
                    placeholder="Seat Capacity"
                    className="input-field"
                  />
                </div>
              </div>
              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone Number"
                  className="input-field"
                />
                <input
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                  placeholder="Website URL"
                  className="input-field"
                />
              </div>
              {/* Facilities */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Facilities
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'hasParking', label: '🅿️ Parking' },
                    { key: 'hasFoodCourt', label: '🍿 Food Court' },
                    {
                      key: 'isWheelchairAccessible',
                      label: '♿ Wheelchair Access',
                    },
                    { key: 'isBookingEnabled', label: '🎟️ Booking Enabled' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer glass rounded-lg p-2 border border-white/10 hover:border-white/20"
                    >
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#e63946]"
                      />

                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  `${editing ? 'Update' : 'Add'} Theatre`
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ShowtimesTab({ showtimes, movies, theatres, onRefresh }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    movieId: '',
    theatreId: '',
    screenName: 'Screen 1',
    showDate: new Date().toISOString().split('T')[0],
    showTime: '18:00',
    pricePlatinum: '350',
    priceGold: '250',
    priceSilver: '150',
    rowsCount: '10',
    colsCount: '12',
  });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({
      movieId: movies[0]?.id?.toString() || '',
      theatreId: theatres[0]?.id?.toString() || '',
      screenName: 'Screen 1',
      showDate: new Date().toISOString().split('T')[0],
      showTime: '18:00',
      pricePlatinum: '350',
      priceGold: '250',
      priceSilver: '150',
      rowsCount: '10',
      colsCount: '12',
    });
    setShowForm(true);
  };
  const openEdit = (st) => {
    setEditing(st);
    setForm({
      movieId: st.movieId.toString(),
      theatreId: st.theatreId.toString(),
      screenName: st.screenName,
      showDate: st.showDate,
      showTime: st.showTime.slice(0, 5),
      pricePlatinum: st.pricePlatinum?.toString() || '350',
      priceGold: st.priceGold?.toString() || '250',
      priceSilver: st.priceSilver?.toString() || '150',
      rowsCount: st.rowsCount.toString(),
      colsCount: st.colsCount.toString(),
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      movieId: Number(form.movieId),
      theatreId: Number(form.theatreId),
      screenName: form.screenName,
      showDate: form.showDate,
      showTime: form.showTime,
      pricePlatinum: parseFloat(form.pricePlatinum) || 350,
      priceGold: parseFloat(form.priceGold) || 250,
      priceSilver: parseFloat(form.priceSilver) || 150,
      rowsCount: parseInt(form.rowsCount) || 10,
      colsCount: parseInt(form.colsCount) || 12,
    };
    try {
      if (editing) await showtimesApi.update(editing.id, payload);
      else await showtimesApi.create(payload);
      toast('Showtime saved', 'success');
      setShowForm(false);
      onRefresh();
    } catch {
      toast('Failed to save showtime', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this showtime?')) return;
    try {
      await showtimesApi.delete(id);
      toast('Showtime deleted', 'success');
      onRefresh();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          Manage Showtimes ({showtimes.length})
        </h2>
        <button
          onClick={openAdd}
          disabled={movies.length === 0 || theatres.length === 0}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Showtime
        </button>
      </div>
      <div className="space-y-3">
        {showtimes.map((st) => (
          <div
            key={st.id}
            className="glass rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-3">
              {st.movie?.posterUrl && (
                <img
                  src={st.movie.posterUrl}
                  alt=""
                  className="w-10 h-14 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {st.movie?.title}
                </h3>
                <p className="text-xs text-gray-400">
                  {st.theatre?.name} • {st.screenName}
                </p>
                <p className="text-xs text-[#ffd60a]">
                  {formatDate(st.showDate)} • {formatTime(st.showTime)} • Plat:{' '}
                  {formatPrice(st.pricePlatinum || 350)} | Gold:{' '}
                  {formatPrice(st.priceGold || 250)} | Silv:{' '}
                  {formatPrice(st.priceSilver || 150)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(st)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(st.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="glass-strong rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editing ? 'Edit Showtime' : 'Add Showtime'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <select
                value={form.movieId}
                onChange={(e) => setForm({ ...form, movieId: e.target.value })}
                className="input-field"
                required
              >
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <select
                value={form.theatreId}
                onChange={(e) =>
                  setForm({ ...form, theatreId: e.target.value })
                }
                className="input-field"
                required
              >
                {theatres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                value={form.screenName}
                onChange={(e) =>
                  setForm({ ...form, screenName: e.target.value })
                }
                placeholder="Screen Name"
                className="input-field"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.showDate}
                  onChange={(e) =>
                    setForm({ ...form, showDate: e.target.value })
                  }
                  className="input-field"
                />
                <input
                  type="time"
                  value={form.showTime}
                  onChange={(e) =>
                    setForm({ ...form, showTime: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  value={form.pricePlatinum}
                  onChange={(e) =>
                    setForm({ ...form, pricePlatinum: e.target.value })
                  }
                  placeholder="Plat ₹"
                  className="input-field"
                />
                <input
                  type="number"
                  value={form.priceGold}
                  onChange={(e) =>
                    setForm({ ...form, priceGold: e.target.value })
                  }
                  placeholder="Gold ₹"
                  className="input-field"
                />
                <input
                  type="number"
                  value={form.priceSilver}
                  onChange={(e) =>
                    setForm({ ...form, priceSilver: e.target.value })
                  }
                  placeholder="Silv ₹"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={form.rowsCount}
                  onChange={(e) =>
                    setForm({ ...form, rowsCount: e.target.value })
                  }
                  placeholder="Rows"
                  className="input-field"
                />
                <input
                  type="number"
                  value={form.colsCount}
                  onChange={(e) =>
                    setForm({ ...form, colsCount: e.target.value })
                  }
                  placeholder="Cols"
                  className="input-field"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Showtime'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingsTab({ bookings, onRefresh }) {
  const { toast } = useToast();
  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsApi.adminCancel(id);
      toast('Booking cancelled', 'success');
      onRefresh();
    } catch {
      toast('Failed to cancel', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">
        All Bookings ({bookings.length})
      </h2>
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No bookings yet.</p>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="glass rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/10"
            >
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {b.showtime?.movie?.title || 'Unknown'}
                </h3>
                <p className="text-xs text-gray-400">
                  {b.showtime?.theatre?.name} •{' '}
                  {b.showtime ? formatDate(b.showtime.showDate) : ''}{' '}
                  {b.showtime ? formatTime(b.showtime.showTime) : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Seats: {b.seats.join(', ')} • Customer:{' '}
                  <span className="text-gray-300">{b.userFullName}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400">
                  {b.bookingRef}
                </span>
                <span
                  className={`badge ${b.status === 'confirmed' ? 'badge-green' : 'badge-red'}`}
                >
                  {b.status.toUpperCase()}
                </span>
                <span className="text-[#ffd60a] font-bold text-sm">
                  {formatPrice(Number(b.totalAmount))}
                </span>
                {b.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    className="text-red-400 hover:text-red-300 text-xs border border-red-400/30 px-2 py-1 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function VouchersTab({ vouchers, onRefresh }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    partner: 'Netflix',
    validityDays: '30',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vouchersApi.create({
        code: form.code,
        partner: form.partner,
        validityDays: parseInt(form.validityDays) || 30,
      });
      toast('Voucher added', 'success');
      setShowForm(false);
      onRefresh();
    } catch {
      toast('Failed to add voucher', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this voucher?')) return;
    try {
      await vouchersApi.delete(id);
      toast('Voucher deleted', 'success');
      onRefresh();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          Manage Vouchers ({vouchers.length})
        </h2>
        <button
          onClick={() => {
            setForm({ code: '', partner: 'Netflix', validityDays: '30' });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Voucher
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vouchers.map((v) => (
          <div
            key={v.id}
            className={`glass rounded-xl p-4 border border-white/10 ${v.isRedeemed ? 'opacity-50 grayscale' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className={`px-2 py-1 text-[10px] font-bold rounded ${v.isRedeemed ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
              >
                {v.isRedeemed ? 'REDEEMED' : 'AVAILABLE'}
              </span>
              {!v.isRedeemed && (
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">{v.partner}</h3>
            <p className="text-sm font-mono text-[#ffd60a] bg-black/30 px-2 py-1 inline-block rounded mt-2">
              {v.code}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Valid for {v.validityDays} days
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="glass-strong rounded-2xl p-6 max-w-sm w-full animate-scale-in border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add Voucher</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <select
                value={form.partner}
                onChange={(e) => setForm({ ...form, partner: e.target.value })}
                className="input-field"
                required
              >
                <option value="Netflix">Netflix</option>
                <option value="Amazon Prime">Amazon Prime</option>
                <option value="Disney+ Hotstar">Disney+ Hotstar</option>
              </select>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Voucher Code *"
                className="input-field"
                required
              />
              <input
                type="number"
                value={form.validityDays}
                onChange={(e) =>
                  setForm({ ...form, validityDays: e.target.value })
                }
                placeholder="Validity Days"
                className="input-field"
                required
                min="1"
              />
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full mt-4 flex justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Voucher'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- OTT Management Tab Component ----
function OttTab({ movies, onRefresh, storageStats }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleEdit = (movie) => {
    setEditing(movie);
    setShowForm(true);
  };



  const ottMovies = movies.filter((m) => m.isOtt);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this OTT movie?'))
      return;
    try {
      await moviesApi.delete(id);
      toast('Movie deleted successfully', 'success');
      onRefresh();
    } catch {
      toast('Failed to delete movie', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            OTT Stream Management
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Upload, edit, and categorize movies for direct streaming
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Upload Movie
        </button>
      </div>

      {/* Storage Management Dashboard */}
      <div className="glass rounded-2xl p-6 border border-white/5 backdrop-blur-md mb-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-[#ffd60a]" />
          <h3 className="font-semibold text-white">
            Multi-Cloud Storage Status
          </h3>
          <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Active Provider:{' '}
            {storageStats?.activeProvider === 'backblaze_b2'
              ? 'Backblaze B2'
              : storageStats?.activeProvider === 'google_drive'
                ? 'Google Drive'
                : 'None'}
          </span>
        </div>

        {storageStats && storageStats.configured ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storageStats.providers
                .filter((p) => p.configured)
                .map((provider) => {
                  const pct =
                    provider.storageLimit > 0
                      ? (provider.storageUsed / provider.storageLimit) * 100
                      : 0;
                  return (
                    <div
                      key={provider.providerId}
                      className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${provider.healthy ? 'bg-green-400' : 'bg-red-500'}`}
                          />
                          {provider.name} ({provider.filesCount} files)
                        </h4>
                        {storageStats.activeProvider ===
                          provider.providerId && (
                          <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#e63946] to-[#ffd60a] rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-gray-400 font-mono">
                        <span>Used: {formatBytes(provider.storageUsed)}</span>
                        <span>
                          Limit:{' '}
                          {provider.storageLimit > 0
                            ? formatBytes(provider.storageLimit)
                            : 'No Limit'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-gray-400 text-sm">Loading Storage stats...</p>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-semibold uppercase">
              <th className="p-4">Movie Title</th>
              <th className="p-4">Language / Genre</th>
              <th className="p-4">Runtime</th>
              <th className="p-4">Toggles</th>
              <th className="p-4">Stream URL</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {ottMovies.map((movie) => (
              <tr key={movie.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-10 h-14 rounded object-cover border border-white/10"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      {movie.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {movie.censorCertificate}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-white">{movie.language}</div>
                  <div className="text-xs text-gray-400">{movie.genre}</div>
                </td>
                <td className="p-4 font-mono">{movie.duration} min</td>
                <td className="p-4 space-y-1">
                  {movie.isTrending && (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded border border-red-500/20 mr-1">
                      Trending
                    </span>
                  )}
                  {movie.rating >= 7.8 && (
                    <span className="px-2 py-0.5 bg-[#ffd60a]/10 text-[#ffd60a] text-[10px] rounded border border-[#ffd60a]/20">
                      Recommended
                    </span>
                  )}
                </td>
                <td
                  className="p-4 font-mono text-xs max-w-[200px] truncate"
                  title={movie.streamUrl}
                >
                  {movie.streamUrl}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(movie)}
                    className="p-2 bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 rounded-lg transition mr-1"
                    title="Edit Movie"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(movie.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-lg transition"
                    title="Delete Content"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {ottMovies.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No OTT videos uploaded yet. Add them here!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <MovieFormModal
          movie={editing}
          storageStats={storageStats}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
