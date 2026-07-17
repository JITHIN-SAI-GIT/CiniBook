import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { watchlistApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function WatchlistPage() {
  const { profile, isLoggedIn } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !profile?.id) return;
    watchlistApi
      .getUserWatchlist(profile.id)
      .then((res) => {
        setWatchlist(res.data);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, profile]);

  const handleRemove = (movieId) => {
    watchlistApi.toggleWatchlist(profile.id, movieId).then(() => {
      setWatchlist(watchlist.filter((item) => item.movie.id !== movieId));
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center bg-[#0a0a0f]">
        <div className="glass p-8 rounded-2xl text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-2">My List</h2>
          <p className="text-gray-400">Log in to view your saved movies!</p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen pt-24 text-center text-white bg-[#0a0a0f]">
        Loading My List...
      </div>
    );

  return (
    <div className="bg-[#0a0a0f] min-h-screen pt-24 px-4 pb-16 page-enter">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl md:text-5xl font-bold text-white font-outfit">
          My List
        </h1>

        {watchlist.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border-dashed border-2 border-white/10">
            <p className="text-gray-400">Your list is empty.</p>
            <Link to="/ott" className="btn-primary mt-4">
              Discover Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {watchlist.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-xl overflow-hidden shadow-lg border border-white/10"
              >
                <div className="aspect-[2/3] w-full bg-gray-900">
                  <img
                    src={
                      item.movie.posterUrl ||
                      'https://placehold.co/500x750/0c0c14/333?text=No+Poster'
                    }
                    alt={item.movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.target.src =
                        'https://placehold.co/500x750/0c0c14/333?text=No+Poster';
                    }}
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#ffd60a] font-bold text-sm">
                      ★ {item.movie.rating}
                    </span>
                    <span className="px-2 py-0.5 bg-[#e63946] text-white text-[10px] font-bold rounded uppercase">
                      {item.movie.ottPlatform || 'OTT'}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2 line-clamp-1">
                    {item.movie.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => handleRemove(item.movie.id)}
                      className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white border border-red-500/30 transition-all flex-1 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
