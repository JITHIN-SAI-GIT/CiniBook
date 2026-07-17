import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Trash2, RotateCcw, Clock, Film } from 'lucide-react';
import { watchHistoryApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDuration } from '../lib/utils';

export default function WatchHistoryPage() {
  const { profile, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    if (!profile) return;
    setLoading(true);
    watchHistoryApi
      .getUserHistory(profile.id)
      .then((res) => setHistory(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isLoggedIn && profile) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, profile]);

  const handleRemove = async (movieId) => {
    if (!profile) return;
    try {
      await watchHistoryApi.remove(profile.id, movieId);
      toast('Removed from Watch History', 'success');
      fetchHistory();
    } catch {
      toast('Failed to remove from history', 'error');
    }
  };

  const handleRestart = async (movieId) => {
    if (!profile) return;
    try {
      await watchHistoryApi.restart(profile.id, movieId);
      toast('Progress restarted!', 'success');
      fetchHistory();
    } catch {
      toast('Failed to restart movie', 'error');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-24 bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 max-w-sm text-center border border-white/10">
          <Clock className="w-12 h-12 text-[#e63946] mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 text-sm mb-6">
            Please log in to view your watch history.
          </p>
          <Link to="/login" className="btn-primary w-full inline-block">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0f] min-h-screen pt-24 pb-16 page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-[#ffd60a]" />
          <div>
            <h1 className="text-3xl font-bold text-white font-outfit">
              My Watch History
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Resume, restart, or manage your streaming history
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-white/5 max-w-xl mx-auto mt-12">
            <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              No History Yet
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              You haven't watched any OTT movies on our platform yet.
            </p>
            <Link to="/ott" className="btn-primary px-8">
              Browse OTT Movies
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((record) => {
              const movie = record.movie;
              if (!movie) return null;
              const durationSec = (movie.duration || 120) * 60;
              const percent =
                Math.min(
                  100,
                  Math.round((record.progressSeconds / durationSec) * 100)
                ) || 10;

              return (
                <div
                  key={record.id}
                  className="glass rounded-2xl p-4 flex flex-col md:flex-row items-center gap-6 border border-white/5 hover:border-white/10 transition-all"
                >
                  <img
                    src={
                      movie.posterUrl ||
                      'https://placehold.co/500x750/0c0c14/333?text=No+Poster'
                    }
                    alt={movie.title}
                    className="w-24 h-36 rounded-lg object-cover shadow-lg border border-white/10 shrink-0"
                    onError={(e) => {
                      e.target.src =
                        'https://placehold.co/500x750/0c0c14/333?text=No+Poster';
                    }}
                  />

                  <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
                    <h3 className="text-lg font-bold text-white truncate">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {movie.language} • {movie.genre} •{' '}
                      {formatDuration(movie.duration)}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>Progress: {percent}%</span>
                        <span>
                          {Math.floor(record.progressSeconds / 60)}m watched
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full max-w-md mx-auto md:mx-0">
                        <div
                          className="h-full bg-[#e63946]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/ott/movie/${movie.id}`}
                      className="btn-primary flex items-center gap-1.5 !px-4 !py-2.5 text-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Resume
                    </Link>
                    <button
                      onClick={() => handleRestart(movie.id)}
                      className="btn-ghost flex items-center gap-1.5 !px-3 !py-2.5 text-xs bg-white/5 hover:bg-white/10 text-white"
                      title="Restart from beginning"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restart
                    </button>
                    <button
                      onClick={() => handleRemove(movie.id)}
                      className="btn-ghost flex items-center justify-center !p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
