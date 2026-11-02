import React from 'react';
import { cn } from '../../utils/cn';

interface AgeRatingBadgeProps {
  rating: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export const AgeRatingBadge: React.FC<AgeRatingBadgeProps> = ({
  rating,
  size = 'md',
  className,
}) => {
  if (!rating) return null;

  const normalized = rating.trim().toUpperCase();

  // Color styles based on Vietnamese / International cinema rating standards
  let colorClasses = 'bg-cinema-border/70 text-cinema-text border-cinema-border';
  if (normalized === 'P' || normalized === 'G') {
    colorClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  } else if (normalized === 'K' || normalized === 'PG') {
    colorClasses = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
  } else if (normalized.includes('13')) {
    colorClasses = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  } else if (normalized.includes('16')) {
    colorClasses = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
  } else if (normalized.includes('18')) {
    colorClasses = 'bg-brand/20 text-brand-400 border-brand/40';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold tracking-tight border backdrop-blur-md rounded-md',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        colorClasses,
        className
      )}
      title={`Age rating: ${rating}`}
      aria-label={`Age rating ${rating}`}
    >
      {rating}
    </span>
  );
};

export default AgeRatingBadge;
