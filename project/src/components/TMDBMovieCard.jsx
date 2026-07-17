import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import SafeImage from './SafeImage';

export default function TMDBMovieCard({ movie, isUpcoming = false }) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '';

  return (
    <Link
      to={`/movie/${movie.id}`}
      state={{ isUpcoming }}
      className="group block"
    >
      <div className="relative rounded-2xl overflow-hidden card-hover">
        {/* Poster */}
        <div className="aspect-[2/3] bg-white/5 overflow-hidden">
          <SafeImage
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Rating */}
        <div className="absolute top-2 right-2 flex items-center gap-1 glass rounded-lg px-1.5 py-0.5 shadow-lg">
          <Star className="w-3 h-3 text-[#ffd60a] fill-current" />
          <span className="text-xs font-bold text-white">
            {movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}
          </span>
        </div>

        {/* Content */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-2 group-hover:translate-y-0 transition-all"
          style={{ transition: 'all 0.4s var(--ease-out-expo)' }}
        >
          <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-gray-300">
              {movie.release_date
                ? new Date(movie.release_date).getFullYear()
                : 'Upcoming'}
            </span>
          </div>
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all">
            <span className="inline-block bg-[#e63946] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Details →
            </span>
          </div>
        </div>
      </div>
      {/* Title below card */}
      <div className="mt-2 px-1">
        <p className="text-sm font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
          {movie.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {movie.release_date
            ? new Date(movie.release_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'TBD'}
        </p>
      </div>
    </Link>
  );
}
