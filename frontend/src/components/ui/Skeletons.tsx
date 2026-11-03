import React from 'react';
import { cn } from '../../utils/cn';

export const MovieCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex flex-col rounded-card bg-cinema-card border border-cinema-border overflow-hidden animate-pulse',
        className
      )}
    >
      {/* 2:3 Poster Placeholder */}
      <div className="relative w-full aspect-poster bg-cinema-border/50" />
      {/* Meta Content */}
      <div className="p-3.5 space-y-2.5">
        <div className="h-4 bg-cinema-border/60 rounded w-3/4" />
        <div className="h-3 bg-cinema-border/40 rounded w-1/2" />
      </div>
    </div>
  );
};

export const HeroSliderSkeleton: React.FC = () => {
  return (
    <div className="relative w-full min-h-[480px] md:h-[70vh] bg-cinema-card border-b border-cinema-border overflow-hidden animate-pulse flex items-center">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col-reverse md:flex-row items-center justify-between gap-8">
        {/* Left Text Block */}
        <div className="w-full md:w-3/5 space-y-4">
          <div className="w-24 h-6 bg-cinema-border/60 rounded-full" />
          <div className="w-4/5 h-10 bg-cinema-border/60 rounded" />
          <div className="flex gap-2">
            <div className="w-16 h-6 bg-cinema-border/40 rounded-full" />
            <div className="w-16 h-6 bg-cinema-border/40 rounded-full" />
            <div className="w-12 h-6 bg-cinema-border/40 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="w-full h-3.5 bg-cinema-border/30 rounded" />
            <div className="w-5/6 h-3.5 bg-cinema-border/30 rounded" />
            <div className="w-2/3 h-3.5 bg-cinema-border/30 rounded" />
          </div>
          <div className="flex gap-3 pt-3">
            <div className="w-32 h-11 bg-cinema-border/60 rounded-btn" />
            <div className="w-32 h-11 bg-cinema-border/40 rounded-btn" />
          </div>
        </div>

        {/* Right Poster Card */}
        <div className="w-44 sm:w-56 md:w-64 aspect-poster bg-cinema-border/60 rounded-card shadow-2xl" />
      </div>
    </div>
  );
};

export const MovieDetailSkeleton: React.FC = () => {
  return (
    <div aria-label="Đang tải phim" className="flex flex-col gap-6 w-full animate-pulse">
      <div className="flex items-start gap-8 w-full">
        <div className="flex-1 md:flex-none md:w-[280px] h-[280px] md:h-[340px] rounded-xl bg-cinema-raised" />
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="h-4 w-40 max-w-full rounded bg-cinema-raised" />
          <div className="h-10 w-3/5 rounded bg-cinema-raised" />
          <div className="h-5 w-2/5 rounded bg-cinema-raised" />
          <div className="h-16 w-full rounded bg-cinema-raised" />
          <div className="h-24 w-full rounded-card bg-cinema-raised" />
        </div>
      </div>
      <div className="h-8 w-52 max-w-full rounded bg-cinema-raised" />
      <div className="h-44 w-full rounded-card bg-cinema-raised" />
    </div>
  );
};
