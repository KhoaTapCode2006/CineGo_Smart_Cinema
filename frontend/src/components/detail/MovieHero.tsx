import React, { useRef, useState } from 'react';
import { CalendarClock, Film, Play, Ticket } from 'lucide-react';
import { Movie } from '../../types/movie';
import StatusBadge from '../ui/StatusBadge';
import AgeRatingBadge from '../ui/AgeRatingBadge';
import TrailerModal from '../ui/TrailerModal';

interface MovieHeroProps {
  movie: Movie;
}

/**
 * Top of the movie page, in the style of the Home hero: blurred poster backdrop,
 * sharp poster and the movie's details.
 */
export const MovieHero: React.FC<MovieHeroProps> = ({ movie }) => {
  const [posterError, setPosterError] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const trailerButtonRef = useRef<HTMLButtonElement>(null);

  const posterSrc = !posterError && movie.posterUrl ? movie.posterUrl : null;
  const isNowShowing = movie.status === 'now_showing';

  const scrollToShowtimes = () => {
    document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCloseTrailer = () => {
    setIsTrailerOpen(false);
    trailerButtonRef.current?.focus();
  };

  return (
    <section aria-label={movie.title} className="relative w-full -mt-16 overflow-hidden">
      {/* Backdrop: blurred poster with the Home hero's fades, faded out at the bottom */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)',
        }}
      >
        {posterSrc ? (
          <img
            src={posterSrc}
            alt=""
            className="w-full h-full object-cover object-center scale-[1.4] blur-2xl brightness-[0.45]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#070913] via-[#12162A] to-[#0A0D1B]" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(7, 9, 19, 0.94) 0%, rgba(7, 9, 19, 0.78) 35%, rgba(7, 9, 19, 0.25) 65%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7, 9, 19, 0.65) 0%, rgba(7, 9, 19, 0.2) 20%, transparent 40%)',
          }}
        />
      </div>

      {/* Content */}
      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-12"
        style={{ paddingTop: 'calc(var(--nav-h, 4rem) + 2rem)' }}
      >
        {/* Poster */}
        <div className="w-48 sm:w-56 md:w-64 lg:w-72 aspect-poster shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-cinema-surface shadow-[0_0_40px_rgba(0,0,0,0.85),0_0_25px_rgba(229,9,20,0.25)]">
          {posterSrc ? (
            <img
              src={posterSrc}
              alt={movie.title}
              onError={() => setPosterError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-cinema-surface to-cinema-card text-center">
              <Film className="w-12 h-12 text-cinema-muted/50 mb-2" />
              <span className="text-sm text-cinema-muted line-clamp-2">{movie.title}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="w-full max-w-2xl flex flex-col text-center md:text-left md:pt-2">
          <div className="flex justify-center md:justify-start mb-3">
            <StatusBadge status={movie.status} size="md" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12] mb-4 [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]">
            {movie.title}
          </h1>

          {/* Meta row: genre · duration · age rating · language */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-2.5 mb-5 text-xs sm:text-sm font-semibold text-slate-200 [text-shadow:_0_1px_4px_rgba(0,0,0,0.8)]">
            {movie.genre && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                {movie.genre}
              </span>
            )}
            {movie.durationMinutes > 0 && (
              <>
                {movie.genre && <span className="text-white/40 select-none">·</span>}
                <span className="text-slate-300">{movie.durationFormatted}</span>
              </>
            )}
            {movie.ageRating && (
              <>
                <span className="text-white/40 select-none">·</span>
                <AgeRatingBadge rating={movie.ageRating} size="sm" />
              </>
            )}
            {movie.language && (
              <>
                <span className="text-white/40 select-none">·</span>
                <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {movie.languageLabel}
                </span>
              </>
            )}
          </div>

          {movie.description && (
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-5 [text-shadow:_0_1px_3px_rgba(0,0,0,0.8)]">
              {movie.description}
            </p>
          )}

          {(movie.director || movie.castList.length > 0) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 mb-7 text-left text-sm">
              {movie.director && (
                <>
                  <dt className="text-cinema-subtle">Director</dt>
                  <dd className="text-slate-200">{movie.director}</dd>
                </>
              )}
              {movie.castList.length > 0 && (
                <>
                  <dt className="text-cinema-subtle">Cast</dt>
                  <dd className="text-slate-200">{movie.castList.join(', ')}</dd>
                </>
              )}
            </dl>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5">
            <button
              type="button"
              onClick={scrollToShowtimes}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 min-h-[44px] rounded-full bg-brand hover:bg-brand-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-brand/30 hover:shadow-brand/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {isNowShowing ? <Ticket className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
              <span>{isNowShowing ? 'Book Tickets' : 'See Showtimes'}</span>
            </button>

            {movie.trailerEmbedUrl && (
              <button
                ref={trailerButtonRef}
                type="button"
                onClick={() => setIsTrailerOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-semibold text-xs sm:text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Watch Trailer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={handleCloseTrailer}
        videoTitle={movie.title}
        embedUrl={movie.trailerEmbedUrl}
      />
    </section>
  );
};

export default MovieHero;
