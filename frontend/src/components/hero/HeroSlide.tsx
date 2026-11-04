import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Play, Ticket, Info } from 'lucide-react';
import { Movie } from '../../types/movie';
import StatusBadge from '../ui/StatusBadge';
import AgeRatingBadge from '../ui/AgeRatingBadge';

export interface HeroSlideProps {
  movie: Movie;
  index: number;
  total: number;
  isActive: boolean;
  isOutgoing: boolean;
  direction: 'next' | 'prev';
  isTransitioning: boolean;
  isFirstSlide: boolean;
  prefersReducedMotion: boolean;
  onWatchTrailer?: (movie: Movie, triggerEl: HTMLElement) => void;
}

export const HeroSlide: React.FC<HeroSlideProps> = ({
  movie,
  index,
  total,
  isActive,
  isOutgoing,
  direction,
  isTransitioning,
  isFirstSlide,
  prefersReducedMotion,
  onWatchTrailer,
}) => {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const hasBackdrop = Boolean(movie.backdropUrl) && !backdropError;
  const hasPoster = Boolean(movie.posterUrl) && !posterError;
  const isNowShowing = movie.status === 'now_showing';

  const durationDisplay =
    movie.durationFormatted ||
    (movie.durationMinutes > 0 ? `${movie.durationMinutes} min` : null) ||
    (movie.durationMin && movie.durationMin > 0 ? `${movie.durationMin} min` : null);

  const isVisible = isActive || isOutgoing;

  // Determine drift animations for background image
  const getBgAnimationStyle = () => {
    if (prefersReducedMotion) {
      return {
        opacity: isActive ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      };
    }

    if (isActive && isTransitioning) {
      return {
        animation: `${direction === 'next' ? 'slideInNextBg' : 'slideInPrevBg'} 1100ms cubic-bezier(0.22, 0.8, 0.24, 1) forwards`,
        willChange: 'transform, opacity',
      };
    }

    if (isOutgoing && isTransitioning) {
      return {
        animation: `${direction === 'next' ? 'slideOutNextBg' : 'slideOutPrevBg'} 1100ms cubic-bezier(0.22, 0.8, 0.24, 1) forwards`,
        willChange: 'transform, opacity',
      };
    }

    return {
      opacity: isActive ? 1 : 0,
      transform: 'translateX(0)',
    };
  };

  // Determine drift animations for foreground sharp poster (Only horizontal translateX, NEVER translateY)
  const getPosterAnimationStyle = () => {
    if (prefersReducedMotion) {
      return {
        opacity: isActive ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      };
    }

    if (isActive && isTransitioning) {
      return {
        animation: `${direction === 'next' ? 'slideInNextPoster' : 'slideInPrevPoster'} 1100ms cubic-bezier(0.22, 0.8, 0.24, 1) forwards`,
        willChange: 'transform, opacity',
      };
    }

    if (isOutgoing && isTransitioning) {
      return {
        animation: `${direction === 'next' ? 'slideOutNextPoster' : 'slideOutPrevPoster'} 1100ms cubic-bezier(0.22, 0.8, 0.24, 1) forwards`,
        willChange: 'transform, opacity',
      };
    }

    return {
      opacity: isActive ? 1 : 0,
      transform: 'translateX(0)',
    };
  };

  // Text animation styles
  const getTextAnimation = (delayMs: number) => {
    if (prefersReducedMotion) {
      return {
        opacity: isActive ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      };
    }

    if (isOutgoing && isTransitioning) {
      return {
        animation: 'heroTextFadeOut 300ms ease-out forwards',
        willChange: 'opacity',
      };
    }

    if (isActive && isTransitioning) {
      return {
        animation: `heroContentSlideUp 450ms cubic-bezier(0.22, 0.8, 0.24, 1) ${delayMs}ms both`,
        willChange: 'transform, opacity',
      };
    }

    return {
      opacity: isActive ? 1 : 0,
    };
  };

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}`}
      aria-hidden={!isActive}
      className="absolute inset-0 w-full h-full select-none"
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: isActive ? 10 : isOutgoing ? 5 : 0,
      }}
    >
      {/* ---------------------------------------------------------------------- */}
      {/* LAYER A: Backdrop Layer (absolute inset-0)                             */}
      {/* Background image + gradients. ONLY this layer gets the bottom fade mask*/}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 65%, transparent 100%)',
        }}
      >
        {/* Animated Background Container (Drifts ~4% horizontally via translateX) */}
        <div className="absolute inset-0 w-full h-full" style={getBgAnimationStyle()}>
          {hasBackdrop ? (
            /* Landscape Backdrop with Ken Burns Zoom */
            <img
              src={movie.backdropUrl!}
              alt={`${movie.title} banner`}
              loading={isFirstSlide ? 'eager' : 'lazy'}
              fetchPriority={isFirstSlide ? 'high' : 'auto'}
              onError={() => setBackdropError(true)}
              className="w-full h-full object-cover object-center"
              style={{
                animation: prefersReducedMotion ? 'none' : 'kenBurns 8s ease-out forwards',
              }}
            />
          ) : hasPoster ? (
            /* Scaled, heavily blurred poster fallback as backdrop */
            <img
              src={movie.posterUrl!}
              alt=""
              loading={isFirstSlide ? 'eager' : 'lazy'}
              fetchPriority={isFirstSlide ? 'high' : 'auto'}
              onError={() => setPosterError(true)}
              className="w-full h-full object-cover object-center scale-[1.4] blur-2xl brightness-[0.45]"
            />
          ) : (
            /* Fallback gradient with a film icon */
            <div className="w-full h-full bg-gradient-to-tr from-[#070913] via-[#12162A] to-[#0A0D1B] flex items-center justify-center">
              <Film className="w-24 h-24 text-white/10" />
            </div>
          )}

          {/* Left-to-Right cinematic dark fade for text readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to right, rgba(7, 9, 19, 0.94) 0%, rgba(7, 9, 19, 0.78) 35%, rgba(7, 9, 19, 0.25) 65%, transparent 100%)',
            }}
          />

          {/* Bottom fade into page dark background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, #070913 0%, rgba(7, 9, 19, 0.8) 18%, transparent 50%)',
            }}
          />

          {/* Subtle top fade under the navbar */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(7, 9, 19, 0.65) 0%, rgba(7, 9, 19, 0.2) 20%, transparent 40%)',
            }}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* LAYER B: Content Layer (relative z-10, NOT masked)                      */}
      {/* One flex row: items-center, justify-between, max-w-[1280px], px-6      */}
      {/* pt = navbar height (--nav-h), pb = 120px so text & poster share center  */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="relative z-10 max-w-[1280px] mx-auto w-full h-full px-6 flex flex-row items-center justify-between pointer-events-none"
        style={{
          paddingTop: 'var(--nav-h, 4rem)',
          paddingBottom: '120px',
        }}
      >
        {/* Left: Text Block */}
        <div className="max-w-[560px] w-full text-left pointer-events-auto flex flex-col justify-center">
          {/* Status Badge */}
          <div className="flex items-center mb-2.5 sm:mb-3" style={getTextAnimation(180)}>
            <StatusBadge status={movie.status} size="md" />
          </div>

          {/* Title */}
          <h1
            aria-live={isActive ? 'polite' : 'off'}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight line-clamp-2 leading-[1.12] mb-3 [text-shadow:_0_2px_12px_rgba(0,0,0,0.9)]"
            style={getTextAnimation(240)}
          >
            {movie.title}
          </h1>

          {/* Meta row: genre · duration · age-rating chip · language */}
          <div
            className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-slate-200 [text-shadow:_0_1px_4px_rgba(0,0,0,0.8)]"
            style={getTextAnimation(300)}
          >
            {movie.genre && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white">
                {movie.genre}
              </span>
            )}

            {durationDisplay && (
              <>
                {movie.genre && <span className="text-white/40 select-none">·</span>}
                <span className="text-slate-300">{durationDisplay}</span>
              </>
            )}

            {movie.ageRating && (
              <>
                <span className="text-white/40 select-none">·</span>
                <AgeRatingBadge rating={movie.ageRating} size="sm" />
              </>
            )}

            {movie.languageLabel && (
              <>
                <span className="text-white/40 select-none">·</span>
                <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {movie.languageLabel}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p
            className="text-xs sm:text-sm md:text-base text-slate-300 line-clamp-3 leading-relaxed mb-5 sm:mb-6 max-w-xl [text-shadow:_0_1px_3px_rgba(0,0,0,0.8)]"
            style={getTextAnimation(360)}
          >
            {movie.description ||
              'Experience high-definition projection, immersive Dolby Atmos sound, and seamless seat booking.'}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3.5 w-full" style={getTextAnimation(420)}>
            {/* Primary Pill Button */}
            <Link
              to={`/movies/${movie.id}`}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 min-h-[44px] rounded-full bg-brand hover:bg-brand-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-brand/30 hover:shadow-brand/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isNowShowing ? (
                <>
                  <Ticket className="w-4 h-4" />
                  <span>Book Now</span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4" />
                  <span>View Details</span>
                </>
              )}
            </Link>

            {/* Round Play Button for Trailer */}
            {movie.trailerUrl && (
              <button
                type="button"
                onClick={(e) => {
                  if (onWatchTrailer) {
                    onWatchTrailer(movie, e.currentTarget);
                  }
                }}
                aria-label={`Watch trailer for ${movie.title}`}
                className="group/btn flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white translate-x-0.5 group-hover/btn:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Sharp Poster Container (100% of content box, max-h-[560px], aspect-2/3, shrink-0, NOT masked) */}
        {!hasBackdrop && hasPoster && (
          <div
            className="hidden lg:flex h-full max-h-[560px] aspect-[2/3] shrink-0 items-center justify-center pointer-events-none"
            style={getPosterAnimationStyle()}
          >
            <img
              src={movie.posterUrl!}
              alt={movie.title}
              loading={isFirstSlide ? 'eager' : 'lazy'}
              className="w-full h-full object-cover rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.85),0_0_25px_rgba(229,9,20,0.25)] border border-white/10"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroSlide;
