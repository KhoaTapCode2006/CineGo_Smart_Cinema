import React, { useRef, useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { Movie } from '../../types/movie';
import { RingGeometry } from './useRingGeometry';

interface Ring3DProps {
  movies: Movie[];
  rotationCount: number;
  geometry: RingGeometry;
  prefersReducedMotion: boolean;
  onRotateStep: (steps: number) => void;
  onCardClick: (movie: Movie) => void;
}

export const Ring3D: React.FC<Ring3DProps> = ({
  movies,
  rotationCount,
  geometry,
  prefersReducedMotion,
  onRotateStep,
  onCardClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const count = movies.length;
  const { W, H, R, angleStep, perspective, stageHeight } = geometry;

  // Active front index in [0..count-1]
  const activeIndex = ((rotationCount % count) + count) % count;

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        onRotateStep(1); // Swipe left -> Next
      } else {
        onRotateStep(-1); // Swipe right -> Prev
      }
    }
  };

  // When user clicks card i
  const handleCardClick = (index: number, movie: Movie, isFront: boolean) => {
    if (isFront) {
      onCardClick(movie);
      return;
    }

    // Calculate shortest angular step to bring card `index` to the front
    let diff = (index - activeIndex) % count;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;

    onRotateStep(diff);
  };

  // If prefers-reduced-motion is active, render simple 2D fade stack
  if (prefersReducedMotion) {
    return (
      <div
        style={{ height: `${stageHeight}px` }}
        className="relative w-full flex items-center justify-center select-none"
      >
        {movies.map((movie, i) => {
          const isFront = i === activeIndex;
          const hasImageError = failedImages[movie.id];
          const posterSrc = !hasImageError && movie.posterUrl ? movie.posterUrl : null;

          return (
            <div
              key={movie.id}
              onClick={() => isFront && onCardClick(movie)}
              style={{
                width: `${W}px`,
                height: `${H}px`,
              }}
              className={`absolute transition-opacity duration-300 rounded-2xl overflow-hidden shadow-2xl border-2 cursor-pointer ${
                isFront
                  ? 'opacity-100 z-10 border-accent-gold shadow-[0_0_25px_rgba(245,179,1,0.4)] scale-100'
                  : 'opacity-0 z-0 pointer-events-none border-transparent scale-95'
              }`}
            >
              {posterSrc ? (
                <img
                  src={posterSrc}
                  alt={movie.title}
                  onError={() => setFailedImages((prev) => ({ ...prev, [movie.id]: true }))}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cinema-card to-cinema-surface flex flex-col items-center justify-center p-4 text-center">
                  <Film className="w-10 h-10 text-cinema-muted/60 mb-2" />
                  <span className="text-xs text-cinema-muted line-clamp-2">{movie.title}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Ring rotation angle: -rotationCount * angleStep (ever-increasing/decreasing, never resets 360->0)
  const ringRotation = -rotationCount * angleStep;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        perspective: `${perspective}px`,
        perspectiveOrigin: '50% 40%',
        height: `${stageHeight}px`,
      }}
      className="relative w-full select-none flex items-center justify-center"
    >
      {/* 3D Ring Element */}
      <div
        style={{
          transform: `rotateY(${ringRotation}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 900ms cubic-bezier(.22,.8,.24,1)',
          willChange: 'transform',
        }}
        className="absolute inset-0 m-auto flex items-center justify-center pointer-events-auto"
      >
        {movies.map((movie, i) => {
          const cardAngle = i * angleStep;

          // Compute angular distance from the front
          let diff = (i - activeIndex) % count;
          if (diff < 0) diff += count;

          // Normalized distance: 0 = front, 1 / count-1 = adjacent, 2 / count-2 = back
          const isFront = diff === 0;
          const isAdjacent = diff === 1 || diff === count - 1;

          let opacity = 0.25;
          let filter = 'brightness(0.35) blur(1.5px)';
          let pointerEvents: 'auto' | 'none' = 'none';

          if (isFront) {
            opacity = 1;
            filter = 'brightness(1)';
            pointerEvents = 'auto';
          } else if (isAdjacent) {
            opacity = 0.65;
            filter = 'brightness(0.7)';
            pointerEvents = 'auto';
          }

          const hasImageError = failedImages[movie.id];
          const posterSrc = !hasImageError && movie.posterUrl ? movie.posterUrl : null;

          return (
            <div
              key={movie.id}
              role="button"
              tabIndex={isFront ? 0 : -1}
              aria-label={`${movie.title}${isFront ? ' (Selected)' : ''}`}
              onClick={() => handleCardClick(i, movie, isFront)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(i, movie, isFront);
                }
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${W}px`,
                height: `${H}px`,
                marginLeft: `-${W / 2}px`,
                marginTop: `-${H / 2}px`,
                transform: `rotateY(${cardAngle}deg) translateZ(${R}px) ${
                  isFront ? 'scale(1.05)' : 'scale(1)'
                }`,
                opacity,
                filter,
                pointerEvents,
                transition:
                  'transform 900ms cubic-bezier(.22,.8,.24,1), opacity 400ms ease, filter 400ms ease',
                WebkitBoxReflect:
                  'below 6px linear-gradient(transparent 80%, rgba(0,0,0,0.25))',
              }}
              className={`rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isFront
                  ? 'border-2 border-accent-gold shadow-[0_0_30px_rgba(245,179,1,0.45)] z-20'
                  : 'border border-white/10 hover:border-white/30 z-10'
              }`}
            >
              {posterSrc ? (
                <img
                  src={posterSrc}
                  alt={movie.title}
                  loading={isFront ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={() => setFailedImages((prev) => ({ ...prev, [movie.id]: true }))}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cinema-card to-cinema-surface flex flex-col items-center justify-center p-4 text-center select-none">
                  <Film className="w-10 h-10 text-cinema-muted/60 mb-2" />
                  <span className="text-xs font-bold text-cinema-muted line-clamp-2">
                    {movie.title}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Ring3D;
