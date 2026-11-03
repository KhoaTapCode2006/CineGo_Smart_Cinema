import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import { Movie } from '../../types/movie';
import AgeRatingBadge from '../ui/AgeRatingBadge';
import SpotlightCard from '../effects/SpotlightCard';

interface MovieCardProps {
  movie: Movie;
  onPreviewOpen?: (movie: Movie, anchor: HTMLElement) => void;
  onPreviewClose?: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onPreviewOpen,
  onPreviewClose,
}) => {
  const [imageError, setImageError] = useState(false);
  const isComingSoon = movie.status === 'coming_soon';

  const posterSrc = !imageError && movie.posterUrl ? movie.posterUrl : null;

  return (
    <div
      className="h-full"
      onPointerEnter={(e) => {
        // A tap should just follow the card's link. Checking the pointer in use, rather than
        // a hover media query, keeps the popup working for a mouse on touchscreen laptops.
        if (e.pointerType === 'mouse') onPreviewOpen?.(movie, e.currentTarget);
      }}
      onPointerLeave={onPreviewClose}
      onFocus={(e) => {
        if (e.target.matches(':focus-visible')) onPreviewOpen?.(movie, e.currentTarget);
      }}
      onBlur={onPreviewClose}
    >
      <SpotlightCard
        spotlightRadius={240}
        spotlightColor="rgba(245, 179, 1, 0.14)"
        borderGlowColor="rgba(245, 179, 1, 0.4)"
        hoverScale={1.025}
        className="h-full"
      >
      <div className="group relative flex flex-col h-full rounded-card bg-cinema-card border border-cinema-border/80 hover:border-cinema-muted/40 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/60 focus-within:ring-2 focus-within:ring-brand">
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
      </div>

      {/* Card Info Content */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {/* Main Title Link (max 2 lines) */}
          <Link
            to={`/movies/${movie.id}`}
            className="block text-sm sm:text-base font-bold text-cinema-text hover:text-brand line-clamp-2 leading-snug transition-colors focus:outline-none"
            title={movie.title}
          >
            {movie.title}
          </Link>

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
      </SpotlightCard>
    </div>
  );
};

export default MovieCard;
