import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Film, Info, Play, Ticket } from 'lucide-react';
import { Movie, getYouTubeThumbnailUrl } from '../../types/movie';
import { computePopupPosition } from '../../hooks/useMoviePreview';
import AgeRatingBadge from '../ui/AgeRatingBadge';

interface MoviePopupProps {
  movie: Movie;
  anchor: HTMLElement;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDismiss: () => void;
  onWatchTrailer: (movie: Movie) => void;
}

/**
 * Small floating preview of a movie, opened by hovering a Discover card.
 * Rendered in a portal so the card's transform and the page layout can't clip it.
 */
export const MoviePopup: React.FC<MoviePopupProps> = ({
  movie,
  anchor,
  onMouseEnter,
  onMouseLeave,
  onDismiss,
  onWatchTrailer,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const thumbnailSrc = thumbnailError ? null : getYouTubeThumbnailUrl(movie.trailerUrl);
  const posterSrc = !posterError && movie.posterUrl ? movie.posterUrl : null;
  const isNowShowing = movie.status === 'now_showing';
  const detailPath = `/movies/${movie.id}`;

  useLayoutEffect(() => {
    if (!popupRef.current) return;
    setPosition(
      computePopupPosition(
        anchor.getBoundingClientRect(),
        { width: popupRef.current.offsetWidth, height: popupRef.current.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight }
      )
    );
  }, [anchor]);

  // The popup is pinned to the viewport, so anything that moves its card closes it.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', onDismiss, { passive: true });
    window.addEventListener('resize', onDismiss);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', onDismiss);
      window.removeEventListener('resize', onDismiss);
    };
  }, [onDismiss]);

  return createPortal(
    <div
      ref={popupRef}
      role="group"
      aria-label={`${movie.title} preview`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        left: position?.left,
        top: position?.top,
        visibility: position ? 'visible' : 'hidden',
      }}
      className="fixed z-40 w-[340px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden bg-[#070a1f]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/70 animate-fade-in"
    >
      {/* Small Screen: Trailer Thumbnail, or the Poster when there is no trailer */}
      <div className="relative w-full aspect-video bg-cinema-surface overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt=""
            onError={() => setThumbnailError(true)}
            className="w-full h-full object-cover"
          />
        ) : posterSrc ? (
          <img
            src={posterSrc}
            alt=""
            onError={() => setPosterError(true)}
            className="w-full h-full object-cover object-[center_20%]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-10 h-10 text-cinema-muted/50" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#070a1f] via-transparent to-black/40 pointer-events-none" />

        {movie.ageRating && (
          <div className="absolute top-2.5 left-2.5">
            <AgeRatingBadge rating={movie.ageRating} size="sm" />
          </div>
        )}

        {movie.status === 'coming_soon' && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-gold text-black shadow-md">
            Coming Soon
          </span>
        )}

        {movie.trailerEmbedUrl && (
          <button
            type="button"
            onClick={() => onWatchTrailer(movie)}
            aria-label={`Watch trailer for ${movie.title}`}
            className="group/play absolute inset-0 flex items-center justify-center cursor-pointer"
          >
            <span className="w-12 h-12 rounded-full bg-white/15 group-hover/play:bg-white/25 border border-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover/play:scale-110">
              <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
            </span>
          </button>
        )}
      </div>

      {/* Movie Information */}
      <div className="p-4 pt-3 flex flex-col gap-2">
        <Link
          to={detailPath}
          title={movie.title}
          className="text-base font-bold text-white hover:text-brand-300 line-clamp-2 leading-snug transition-colors"
        >
          {movie.title}
        </Link>

        <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-cinema-muted">
          {movie.genre && <span>{movie.genre}</span>}
          {movie.genre && movie.durationMinutes > 0 && <span aria-hidden="true">·</span>}
          {movie.durationMinutes > 0 && <span>{movie.durationFormatted}</span>}
          {movie.language && (
            <>
              <span aria-hidden="true">·</span>
              <span>{movie.languageLabel}</span>
            </>
          )}
        </div>

        {movie.description && (
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{movie.description}</p>
        )}

        {(movie.director || movie.castList.length > 0) && (
          <div className="text-[11px] leading-4 text-cinema-muted space-y-0.5">
            {movie.director && (
              <p className="truncate">
                <span className="text-cinema-subtle">Director:</span> {movie.director}
              </p>
            )}
            {movie.castList.length > 0 && (
              <p className="truncate">
                <span className="text-cinema-subtle">Cast:</span>{' '}
                {movie.castList.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        )}

        <Link
          to={detailPath}
          className="mt-1 w-full py-2.5 px-3 min-h-[40px] flex items-center justify-center gap-2 rounded-btn bg-brand hover:bg-brand-600 text-white font-semibold text-xs tracking-wide uppercase transition-colors shadow-lg"
        >
          {isNowShowing ? <Ticket className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
          <span>{isNowShowing ? 'Book Tickets' : 'View Details'}</span>
        </Link>
      </div>
    </div>,
    document.body
  );
};

export default MoviePopup;
