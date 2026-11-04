import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface HeroControlsProps {
  total: number;
  activeIndex: number;
  isPaused: boolean;
  cycleKey: number;
  prefersReducedMotion?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

export const HeroControls: React.FC<HeroControlsProps> = ({
  total,
  activeIndex,
  isPaused,
  cycleKey,
  prefersReducedMotion = false,
  onPrev,
  onNext,
  onSelect,
}) => {
  if (total <= 1) return null;

  return (
    <>
      {/* 1. Prev & Next Circular Arrow Buttons (Vertically centered in content box) */}
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous slide"
        style={{
          top: 'calc(50% + (var(--nav-h, 4rem) - 120px) / 2)',
        }}
        className="hidden md:flex absolute left-4 lg:left-8 -translate-y-1/2 z-30 w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-[#070a1f]/50 hover:bg-[#070a1f]/85 text-white/80 hover:text-white border border-white/15 backdrop-blur-md items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 -translate-x-0.5" />
      </button>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next slide"
        style={{
          top: 'calc(50% + (var(--nav-h, 4rem) - 120px) / 2)',
        }}
        className="hidden md:flex absolute right-4 lg:right-8 -translate-y-1/2 z-30 w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-[#070a1f]/50 hover:bg-[#070a1f]/85 text-white/80 hover:text-white border border-white/15 backdrop-blur-md items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 translate-x-0.5" />
      </button>

      {/* 2. Progress Dots: Bottom-center of hero banner */}
      <div className="absolute inset-x-0 bottom-5 sm:bottom-6 pointer-events-none z-30">
        <div className="max-w-[1280px] mx-auto px-6 flex justify-center">
          <nav
            aria-label="Carousel pagination"
            className="pointer-events-auto flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-md"
          >
            {Array.from({ length: total }).map((_, idx) => {
              const isActive = idx === activeIndex;

              return (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  onClick={() => onSelect(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  className="group relative py-1 px-0.5 cursor-pointer flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full"
                >
                  <span
                    className={`relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-300 block ${
                      isActive
                        ? 'w-6 sm:w-8 bg-white/20'
                        : 'w-1.5 sm:w-2 bg-white/35 group-hover:bg-white/70'
                    }`}
                  >
                    {isActive && (
                      <span
                        key={`progress-fill-${cycleKey}`}
                        className="absolute inset-0 bg-brand rounded-full origin-left"
                        style={{
                          animation: prefersReducedMotion
                            ? 'none'
                            : 'progressBarFill 6s linear forwards',
                          animationPlayState: isPaused ? 'paused' : 'running',
                          transform: prefersReducedMotion ? 'scaleX(1)' : undefined,
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};

export default HeroControls;
