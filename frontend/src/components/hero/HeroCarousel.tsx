import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Film, AlertCircle, RefreshCw } from 'lucide-react';
import { Movie } from '../../types/movie';
import HeroSlide from './HeroSlide';
import HeroControls from './HeroControls';
import TrailerModal from '../ui/TrailerModal';
import useAutoplay from './useAutoplay';

export interface HeroCarouselProps {
  movies: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onBookNow?: (movie: Movie) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  movies = [],
  isLoading = false,
  isError = false,
  onRetry,
  onBookNow,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef<HTMLElement>(null);
  const trailerTriggerRef = useRef<HTMLElement | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch swipe refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const count = movies.length;

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // 2. Track document visibility (tab active/hidden)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsDocumentHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 3. Slide navigation with smooth simultaneous drift & fade transition
  const goToSlide = useCallback(
    (newIndex: number, forcedDir?: 'next' | 'prev') => {
      if (newIndex === activeIndex || count <= 1) return;

      let dir = forcedDir;
      if (!dir) {
        if (newIndex > activeIndex) {
          dir = activeIndex === 0 && newIndex === count - 1 ? 'prev' : 'next';
        } else {
          dir = activeIndex === count - 1 && newIndex === 0 ? 'next' : 'prev';
        }
      }

      setDirection(dir);
      setPrevIndex(activeIndex);
      setActiveIndex(newIndex);
      setIsTransitioning(true);

      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setPrevIndex(null);
      }, 1100);
    },
    [activeIndex, count]
  );

  const handleNext = useCallback(() => {
    if (count <= 1) return;
    const nextIdx = (activeIndex + 1) % count;
    goToSlide(nextIdx, 'next');
  }, [activeIndex, count, goToSlide]);

  const handlePrev = useCallback(() => {
    if (count <= 1) return;
    const prevIdx = (activeIndex - 1 + count) % count;
    goToSlide(prevIdx, 'prev');
  }, [activeIndex, count, goToSlide]);

  const handleSelectDot = useCallback(
    (targetIndex: number) => {
      if (targetIndex === activeIndex) return;
      goToSlide(targetIndex);
    },
    [activeIndex, goToSlide]
  );

  // 4. Autoplay logic (6s interval, pause on hover/focus/tab hidden/trailer modal/reduced motion)
  const isPaused =
    count <= 1 ||
    isHovered ||
    isFocused ||
    isDocumentHidden ||
    Boolean(activeTrailerMovie) ||
    prefersReducedMotion;

  const { cycleKey } = useAutoplay({
    duration: 6000,
    isPaused,
    onNext: handleNext,
    resetTrigger: activeIndex,
  });

  // 5. Preload the next slide's image
  useEffect(() => {
    if (count <= 1) return;
    const nextIdx = (activeIndex + 1) % count;
    const nextMovie = movies[nextIdx];
    const targetUrl = nextMovie?.backdropUrl || nextMovie?.posterUrl;
    if (targetUrl) {
      const img = new Image();
      img.src = targetUrl;
    }
  }, [activeIndex, count, movies]);

  // 6. Keyboard Navigation (ArrowLeft / ArrowRight)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  // 7. Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Minimum swipe threshold 45px and predominantly horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // 8. Trailer Modal Handlers with Focus Restoration
  const handleOpenTrailer = (movie: Movie, triggerEl: HTMLElement) => {
    trailerTriggerRef.current = triggerEl;
    setActiveTrailerMovie(movie);
  };

  const handleCloseTrailer = () => {
    setActiveTrailerMovie(null);
    setTimeout(() => {
      trailerTriggerRef.current?.focus();
    }, 50);
  };

  // --------------------------------------------------------------------------
  // SKELETON LOADING STATE
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <section
        aria-label="Loading featured movies"
        style={{
          height: 'clamp(560px, 82vh, 800px)',
        }}
        className="relative w-full -mt-16 bg-transparent overflow-hidden flex items-center justify-center select-none"
      >
        <div
          className="max-w-[1280px] mx-auto w-full h-full px-6 flex items-center justify-between"
          style={{
            paddingTop: 'var(--nav-h, 4rem)',
            paddingBottom: '120px',
          }}
        >
          <div className="max-w-[560px] w-full space-y-4">
            <div className="w-28 h-6 rounded-full bg-white/10 animate-pulse" />
            <div className="w-3/4 h-10 sm:h-12 rounded-lg bg-white/10 animate-pulse" />
            <div className="flex gap-2">
              <div className="w-20 h-6 rounded-full bg-white/10 animate-pulse" />
              <div className="w-16 h-6 rounded-full bg-white/10 animate-pulse" />
              <div className="w-12 h-6 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="w-full h-4 rounded bg-white/10 animate-pulse" />
              <div className="w-5/6 h-4 rounded bg-white/10 animate-pulse" />
              <div className="w-2/3 h-4 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="flex gap-3 pt-4">
              <div className="w-36 h-12 rounded-full bg-brand/30 animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="hidden lg:flex h-full max-h-[560px] aspect-[2/3] shrink-0 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------------------------------
  if (isError) {
    return (
      <section
        aria-label="Featured movies error"
        style={{
          height: 'clamp(560px, 82vh, 800px)',
        }}
        className="relative w-full -mt-16 bg-transparent overflow-hidden flex items-center justify-center select-none"
      >
        <div className="text-center p-6 max-w-md mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-brand mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Showcase</h2>
          <p className="text-sm text-slate-400 mb-6">
            We couldn't load the featured lineup. Please check your connection and try again.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-lg shadow-brand/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // EMPTY STATE
  // --------------------------------------------------------------------------
  if (count === 0) {
    return (
      <section
        aria-label="No featured movies"
        style={{
          height: 'clamp(560px, 82vh, 800px)',
        }}
        className="relative w-full -mt-16 bg-transparent overflow-hidden flex items-center justify-center select-none"
      >
        <div className="text-center p-6 max-w-md mx-auto flex flex-col items-center">
          <Film className="w-16 h-16 text-white/20 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Featured Lineup</h2>
          <p className="text-sm text-slate-400">
            Check back soon for upcoming blockbuster releases and premieres.
          </p>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN CINEMATIC HERO BANNER CAROUSEL
  // --------------------------------------------------------------------------
  return (
    <section
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Movies Carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        height: 'clamp(560px, 82vh, 800px)',
      }}
      className="relative w-full -mt-16 bg-transparent overflow-hidden flex items-center justify-center select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
    >
      {/* Slides Container: All slides stay mounted, stacked absolute inset-0 */}
      <div className="absolute inset-0 w-full h-full">
        {movies.map((movie, idx) => (
          <HeroSlide
            key={movie.id}
            movie={movie}
            index={idx}
            total={count}
            isActive={idx === activeIndex}
            isOutgoing={idx === prevIndex && isTransitioning}
            direction={direction}
            isTransitioning={isTransitioning}
            isFirstSlide={idx === 0}
            prefersReducedMotion={prefersReducedMotion}
            onWatchTrailer={handleOpenTrailer}
            onBookNow={onBookNow}
          />
        ))}
      </div>

      {/* Hero Controls: Prev/Next Circular Arrow Buttons + Progress Dots */}
      <HeroControls
        total={count}
        activeIndex={activeIndex}
        isPaused={isPaused}
        cycleKey={cycleKey}
        prefersReducedMotion={prefersReducedMotion}
        onPrev={handlePrev}
        onNext={handleNext}
        onSelect={handleSelectDot}
      />

      {/* Trailer Modal (Accessible YouTube Embed with z-index 70) */}
      {activeTrailerMovie && (
        <TrailerModal
          isOpen={Boolean(activeTrailerMovie)}
          onClose={handleCloseTrailer}
          videoTitle={activeTrailerMovie.title}
          embedUrl={activeTrailerMovie.trailerEmbedUrl}
        />
      )}
    </section>
  );
};

export default HeroCarousel;
