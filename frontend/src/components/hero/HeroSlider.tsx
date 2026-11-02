import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Film } from 'lucide-react';
import { Movie } from '../../types/movie';
import Ring3D from './Ring3D';
import HeroInfoPanel from './HeroInfoPanel';
import HeroControls from './HeroControls';
import TrailerModal from '../ui/TrailerModal';
import ErrorState from '../ui/ErrorState';
import useRingGeometry from './useRingGeometry';
import useAutoplay from './useAutoplay';

interface HeroSliderProps {
  movies: Movie[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onBookNow?: (movie: Movie) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  movies,
  isLoading = false,
  isError = false,
  onRetry,
  onBookNow,
}) => {
  // Ever-increasing / decreasing rotation counter (never resets 360 -> 0)
  const [rotationCount, setRotationCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const heroSectionRef = useRef<HTMLElement>(null);
  const stageColRef = useRef<HTMLDivElement>(null);
  const trailerBtnTriggerRef = useRef<HTMLElement | null>(null);

  const count = movies.length;
  // Compute geometry using ResizeObserver
  const geometry = useRingGeometry(stageColRef, count);

  // Active movie index: normalized [0..count-1]
  const activeIndex = count > 0 ? ((rotationCount % count) + count) % count : 0;
  const activeMovie = movies[activeIndex] || null;

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 2. Track document visibility (pause autoplay when tab is inactive)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsDocumentHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Step rotation helpers
  const handleRotateStep = useCallback((steps: number) => {
    setRotationCount((prev) => prev + steps);
  }, []);

  const handleNext = useCallback(() => {
    handleRotateStep(1);
  }, [handleRotateStep]);

  const handlePrev = useCallback(() => {
    handleRotateStep(-1);
  }, [handleRotateStep]);

  const handleSelectDot = useCallback(
    (targetIndex: number) => {
      if (count <= 1) return;
      let diff = (targetIndex - activeIndex) % count;
      if (diff > count / 2) diff -= count;
      if (diff < -count / 2) diff += count;
      handleRotateStep(diff);
    },
    [count, activeIndex, handleRotateStep]
  );

  // 3. Autoplay Hook (4.5s interval, pauses on hover, focus, tab hidden, trailer modal, or reduced motion)
  const isAutoplayPaused =
    count <= 1 ||
    isHovered ||
    isFocused ||
    isDocumentHidden ||
    Boolean(activeTrailerMovie) ||
    prefersReducedMotion;

  const { progress } = useAutoplay({
    duration: 4500,
    isPaused: isAutoplayPaused,
    onNext: handleNext,
    resetTrigger: rotationCount,
  });

  // 4. Keyboard Navigation (ArrowLeft / ArrowRight)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  // 5. Open Trailer Modal (stores trigger ref for focus return)
  const handleOpenTrailer = (movie: Movie) => {
    trailerBtnTriggerRef.current = document.activeElement as HTMLElement;
    setActiveTrailerMovie(movie);
  };

  const handleCloseTrailer = () => {
    setActiveTrailerMovie(null);
    if (trailerBtnTriggerRef.current) {
      trailerBtnTriggerRef.current.focus();
    }
  };

  // 6. Loading State (pulsing 3D-styled placeholders + text skeleton)
  if (isLoading) {
    return (
      <section className="relative w-full min-h-[560px] max-h-[720px] lg:h-[650px] bg-cinema-dark border-b border-cinema-border overflow-hidden flex items-center justify-center animate-pulse">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col-reverse lg:flex-row items-center justify-between gap-8">
          {/* Left Text Placeholder */}
          <div className="w-full lg:w-[42%] space-y-4">
            <div className="w-24 h-6 bg-cinema-border/60 rounded-full" />
            <div className="w-4/5 h-10 bg-cinema-border/60 rounded-lg" />
            <div className="flex gap-2">
              <div className="w-16 h-6 bg-cinema-border/40 rounded-full" />
              <div className="w-16 h-6 bg-cinema-border/40 rounded-full" />
              <div className="w-14 h-6 bg-cinema-border/40 rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="w-full h-3.5 bg-cinema-border/30 rounded" />
              <div className="w-5/6 h-3.5 bg-cinema-border/30 rounded" />
              <div className="w-3/5 h-3.5 bg-cinema-border/30 rounded" />
            </div>
            <div className="flex gap-3 pt-3">
              <div className="w-32 h-11 bg-cinema-border/60 rounded-btn" />
              <div className="w-32 h-11 bg-cinema-border/40 rounded-btn" />
            </div>
          </div>
          {/* Right 3D Stage Placeholder */}
          <div className="w-full lg:w-[58%] h-[380px] flex items-center justify-center relative">
            <div className="w-48 h-72 bg-cinema-border/60 rounded-2xl shadow-2xl scale-105 border border-cinema-border" />
            <div className="absolute w-40 h-60 bg-cinema-border/30 rounded-2xl -translate-x-32 scale-90 blur-[1px]" />
            <div className="absolute w-40 h-60 bg-cinema-border/30 rounded-2xl translate-x-32 scale-90 blur-[1px]" />
          </div>
        </div>
      </section>
    );
  }

  // 7. Error State
  if (isError) {
    return (
      <section className="relative w-full min-h-[560px] max-h-[720px] lg:h-[600px] bg-cinema-dark border-b border-cinema-border overflow-hidden flex items-center justify-center p-6">
        <ErrorState onRetry={onRetry || (() => window.location.reload())} />
      </section>
    );
  }

  // 8. Empty State (Friendly Banner)
  if (count === 0) {
    return (
      <section className="relative w-full min-h-[400px] bg-cinema-dark border-b border-cinema-border overflow-hidden flex items-center justify-center p-8 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-cinema-card flex items-center justify-center text-brand">
            <Film className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome to CineGo Smart Cinema</h2>
          <p className="text-sm text-cinema-muted">
            Check out our upcoming movie lineup below to discover showtimes and reserve your seats!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={heroSectionRef}
      aria-label="Featured Movies 3D Showcase"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // Only set unfocused if focus actually moved outside the hero container
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      className="relative w-full min-h-[560px] max-h-[720px] lg:h-[660px] bg-cinema-dark border-b border-cinema-border/80 overflow-hidden flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand select-none"
    >
      {/* Ambient Blurred Backdrop from Active Movie Poster (strictly clipped by outer overflow-hidden) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {activeMovie?.posterUrl ? (
          <img
            src={activeMovie.posterUrl}
            alt=""
            className="w-full h-full object-cover scale-125 filter blur-3xl opacity-20 brightness-50 transition-opacity duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-cinema-dark via-cinema-surface to-cinema-bg opacity-40" />
        )}
        {/* Layered dark gradients for contrast & smooth blend into page */}
        <div className="absolute inset-0 bg-gradient-to-r from-cinema-dark via-cinema-dark/90 to-cinema-dark/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-dark via-transparent to-cinema-dark/70" />
      </div>

      {/* Main Container (Desktop 2-column layout; Mobile/Tablet vertical stack) */}
      <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-12">
        
        {/* 
          MOBILE/TABLET (< 1024px): Stage first, Info Panel below.
          DESKTOP (≥ 1024px): Info Panel on LEFT (40%), Stage on RIGHT (60%).
        */}

        {/* LEFT COLUMN: Active Movie Info Panel (Desktop: 40% width) */}
        <div className="w-full lg:w-[42%] order-2 lg:order-1 flex flex-col justify-center">
          <HeroInfoPanel
            movie={activeMovie}
            onWatchTrailer={handleOpenTrailer}
            onBookNow={onBookNow}
          />
        </div>

        {/* RIGHT COLUMN: 3D Stage & Controls (Desktop: 58% width, Stage centered) */}
        <div
          ref={stageColRef}
          className="w-full lg:w-[58%] order-1 lg:order-2 flex flex-col items-center justify-center relative"
        >
          {/* 3D Rotating Ring */}
          <Ring3D
            movies={movies}
            rotationCount={rotationCount}
            geometry={geometry}
            prefersReducedMotion={prefersReducedMotion}
            onRotateStep={handleRotateStep}
            onCardClick={(m) => {
              if (onBookNow) onBookNow(m);
              else window.location.href = `/movies/${m.id}`;
            }}
          />

          {/* Controls: Prev arrow + 5 Dots with Progress Bar + Next arrow (sitting BELOW the stage) */}
          <div className="w-full flex justify-center mt-3 sm:mt-5">
            <HeroControls
              total={count}
              activeIndex={activeIndex}
              progressPercent={progress}
              onPrev={handlePrev}
              onNext={handleNext}
              onSelect={handleSelectDot}
            />
          </div>
        </div>

      </div>

      {/* Video Trailer Modal */}
      <TrailerModal
        isOpen={Boolean(activeTrailerMovie)}
        onClose={handleCloseTrailer}
        videoTitle={activeTrailerMovie?.title || ''}
        embedUrl={activeTrailerMovie?.trailerEmbedUrl || null}
      />
    </section>
  );
};

export default HeroSlider;
