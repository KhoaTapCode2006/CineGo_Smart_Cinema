import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroControlsProps {
  total: number;
  activeIndex: number;
  progressPercent: number; // 0 to 100 for current active slide
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  className?: string;
}

export const HeroControls: React.FC<HeroControlsProps> = ({
  total,
  activeIndex,
  progressPercent,
  onPrev,
  onNext,
  onSelect,
  className = '',
}) => {
  if (total <= 1) return null;

  return (
    <div
      className={`flex items-center justify-center gap-3 select-none ${className}`}
      aria-label="Carousel navigation"
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous movie"
        className="flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] rounded-full bg-cinema-card/80 hover:bg-cinema-hover text-cinema-muted hover:text-white border border-cinema-border/90 backdrop-blur-md transition-all duration-200 active:scale-95 shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* 5 Dots with Progress Bar inside the Active Dot */}
      <div className="flex items-center gap-2 px-1">
        {Array.from({ length: total }).map((_, idx) => {
          const isActive = idx === activeIndex;

          return (
            <button
              key={`dot-${idx}`}
              type="button"
              onClick={() => onSelect(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={isActive ? 'true' : undefined}
              className={`relative h-2 rounded-full overflow-hidden transition-all duration-300 min-h-[16px] cursor-pointer flex items-center ${
                isActive ? 'w-10 sm:w-12 bg-white/20' : 'w-2.5 sm:w-3 bg-white/30 hover:bg-white/50'
              }`}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-brand rounded-full transition-all ease-linear"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={onNext}
        aria-label="Next movie"
        className="flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] rounded-full bg-cinema-card/80 hover:bg-cinema-hover text-cinema-muted hover:text-white border border-cinema-border/90 backdrop-blur-md transition-all duration-200 active:scale-95 shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default HeroControls;
