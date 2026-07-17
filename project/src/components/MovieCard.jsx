import { Link } from 'react-router-dom';
import { Star, Clock } from 'lucide-react';
import SafeImage from './SafeImage';

import { formatDuration } from '../lib/utils';

export default function MovieCard({ movie }) {
  return (
    <Link to={`/movie/${movie.id}`} className="group block">
      <div className="relative rounded-2xl overflow-hidden card-hover">
        {/* Poster */}
        <div className="aspect-[2/3] bg-white/5 overflow-hidden">
          <SafeImage
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {movie.isTrending && (
            <span className="badge badge-red text-[10px]">🔥 Trending</span>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-2 right-2 flex items-center gap-1 glass rounded-lg px-1.5 py-0.5">
          <Star className="w-3 h-3 star-filled" />
          <span className="text-xs font-bold text-white">
            {movie.rating.toFixed(1)}
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
            <span className="text-[10px] text-gray-300">{movie.genre}</span>
            <span className="text-gray-500">•</span>
            <span className="flex items-center gap-0.5 text-[10px] text-gray-300">
              <Clock className="w-2.5 h-2.5" /> {formatDuration(movie.duration)}
            </span>
          </div>
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all">
            <span className="inline-block bg-[#e63946] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Book Now →
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
          {movie.language} • {movie.genre}
        </p>
      </div>
    </Link>
  );
}
