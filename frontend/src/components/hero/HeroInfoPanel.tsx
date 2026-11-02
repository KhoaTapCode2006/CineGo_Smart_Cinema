import React, { useState, useEffect } from 'react';
import { Ticket, Info, Play } from 'lucide-react';
import { Movie } from '../../types/movie';
import StatusBadge from '../ui/StatusBadge';
import AgeRatingBadge from '../ui/AgeRatingBadge';

interface HeroInfoPanelProps {
  movie: Movie | null;
  onWatchTrailer?: (movie: Movie) => void;
  onBookNow?: (movie: Movie) => void;
}

export const HeroInfoPanel: React.FC<HeroInfoPanelProps> = ({
  movie,
  onWatchTrailer,
  onBookNow,
}) => {
  // Current displayed movie for crossfade transition
  const [displayedMovie, setDisplayedMovie] = useState<Movie | null>(movie);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!movie) return;
    if (movie.id !== displayedMovie?.id) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayedMovie(movie);
        setIsFading(false);
      }, 180); // 180ms fade out, then swap & fade in
      return () => clearTimeout(timer);
    }
  }, [movie, displayedMovie?.id]);

  if (!displayedMovie) {
    return null;
  }

  const isNowShowing = displayedMovie.status === 'now_showing';

  return (
    <div
      className={`w-full flex flex-col justify-center text-center lg:text-left transition-opacity duration-200 ease-out ${
        isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* 1. Status Badge */}
      <div className="flex justify-center lg:justify-start mb-3">
        <StatusBadge status={displayedMovie.status} size="md" />
      </div>

      {/* 2. Movie Title (Max 2 lines, aria-live="polite") */}
      <h1
        aria-live="polite"
        className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight line-clamp-2 leading-[1.15] mb-3"
      >
        {displayedMovie.title}
      </h1>

      {/* 3. Metadata Chips: Genre, Duration, Age-Rating, Language (flex-wrap with gap-2) */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4 text-xs font-semibold">
        {displayedMovie.genre && (
          <span className="px-3 py-1 rounded-full bg-cinema-card/90 border border-cinema-border text-cinema-text">
            {displayedMovie.genre}
          </span>
        )}

        {displayedMovie.durationMinutes > 0 && (
          <span className="px-3 py-1 rounded-full bg-cinema-card/90 border border-cinema-border text-cinema-muted">
            {displayedMovie.durationFormatted}
          </span>
        )}

        {displayedMovie.ageRating && (
          <AgeRatingBadge rating={displayedMovie.ageRating} size="sm" />
        )}

        {displayedMovie.languageLabel && (
          <span className="px-2.5 py-1 rounded-full bg-cinema-card/90 border border-cinema-border text-cinema-subtle uppercase text-[11px]">
            {displayedMovie.languageLabel}
          </span>
        )}
      </div>

      {/* 4. Clamped Description (max 3 lines) */}
      <p className="text-xs sm:text-sm lg:text-base text-cinema-muted line-clamp-3 leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
        {displayedMovie.description ||
          'Experience state-of-the-art projection and immersive sound exclusively at CineGo Smart Cinema.'}
      </p>

      {/* 5. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 w-full">
        {isNowShowing ? (
          <a
            href={`/movies/${displayedMovie.id}`}
            onClick={(e) => {
              if (onBookNow) {
                e.preventDefault();
                onBookNow(displayedMovie);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-brand hover:bg-brand-600 text-white font-bold text-sm sm:text-base rounded-btn shadow-lg shadow-brand/30 transition-all duration-200 cursor-pointer text-center"
          >
            <Ticket className="w-4 h-4" />
            <span>Book Now</span>
          </a>
        ) : (
          <a
            href={`/movies/${displayedMovie.id}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-cinema-card hover:bg-cinema-hover text-white font-bold text-sm sm:text-base rounded-btn border border-cinema-border hover:border-cinema-muted/50 transition-all duration-200 text-center"
          >
            <Info className="w-4 h-4 text-accent-gold" />
            <span>View Details</span>
          </a>
        )}

        {displayedMovie.trailerEmbedUrl && onWatchTrailer && (
          <button
            type="button"
            onClick={() => onWatchTrailer(displayedMovie)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base rounded-btn border border-white/20 backdrop-blur-sm transition-all duration-200 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Watch Trailer</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default HeroInfoPanel;
