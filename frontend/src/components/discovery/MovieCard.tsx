import React, { useState } from 'react';
import { Film, Play, Ticket, Info } from 'lucide-react';
import { Movie } from '../../types/movie';
import AgeRatingBadge from '../ui/AgeRatingBadge';

interface MovieCardProps {
  movie: Movie;
  onWatchTrailer?: (movie: Movie) => void;
  onBookNow?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onWatchTrailer,
  onBookNow,
}) => {
  const [imageError, setImageError] = useState(false);
  const isComingSoon = movie.status === 'coming_soon';

  const posterSrc = !imageError && movie.posterUrl ? movie.posterUrl : null;

  return (
    <div className="group relative flex flex-col rounded-card bg-cinema-card border border-cinema-border/80 hover:border-cinema-muted/40 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/60 focus-within:ring-2 focus-within:ring-brand">
      {/* 2:3 Portrait Poster Container */}
      <div className="relative w-full aspect-poster bg-cinema-surface overflow-hidden">
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={movie.title}
            onError={() => setImageError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-cinema-surface to-cinema-card text-center">
            <Film className="w-10 h-10 text-cinema-muted/50 mb-2" />
            <span className="text-xs text-cinema-muted line-clamp-2 px-1">
              {movie.title}
            </span>
          </div>
        )}

        {/* Dark Gradient Overlay for Badges */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

        {/* Top-Left: Age Rating Badge */}
        {movie.ageRating && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <AgeRatingBadge rating={movie.ageRating} size="sm" />
          </div>
        )}

        {/* Top-Right: Coming Soon Ribbon / Badge */}
        {isComingSoon && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-gold text-black shadow-md">
              Coming Soon
            </span>
          </div>
        )}

        {/* Desktop Hover Quick Action Overlay */}
        <div className="hidden lg:flex absolute inset-0 bg-black/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 p-4 flex-col justify-end gap-2.5 z-20">
          {movie.status === 'now_showing' ? (
            <a
              href={`/movies/${movie.id}`}
              onClick={(e) => {
                if (onBookNow) {
                  e.preventDefault();
                  onBookNow(movie);
                }
              }}
              className="w-full py-2.5 px-3 min-h-[40px] flex items-center justify-center gap-2 rounded-btn bg-brand hover:bg-brand-600 text-white font-semibold text-xs tracking-wide uppercase transition-colors shadow-lg"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Book Tickets</span>
            </a>
          ) : (
            <a
              href={`/movies/${movie.id}`}
              className="w-full py-2.5 px-3 min-h-[40px] flex items-center justify-center gap-2 rounded-btn bg-cinema-card hover:bg-cinema-hover text-white font-semibold text-xs tracking-wide uppercase border border-cinema-border transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-accent-gold" />
              <span>View Details</span>
            </a>
          )}

          {movie.trailerEmbedUrl && onWatchTrailer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWatchTrailer(movie);
              }}
              className="w-full py-2 px-3 min-h-[36px] flex items-center justify-center gap-1.5 rounded-btn bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-colors"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Trailer</span>
            </button>
          )}
        </div>
      </div>

      {/* Card Info Content */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {/* Main Title Link (max 2 lines) */}
          <a
            href={`/movies/${movie.id}`}
            className="block text-sm sm:text-base font-bold text-cinema-text hover:text-brand line-clamp-2 leading-snug transition-colors focus:outline-none"
            title={movie.title}
          >
            {movie.title}
          </a>

          {/* Meta line: Genre · Duration */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-cinema-muted truncate">
            {movie.genre && <span>{movie.genre}</span>}
            {movie.genre && movie.durationMinutes > 0 && <span aria-hidden="true">·</span>}
            {movie.durationMinutes > 0 && <span>{movie.durationFormatted}</span>}
            {movie.languageLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="uppercase text-[11px] text-cinema-subtle">{movie.languageLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
