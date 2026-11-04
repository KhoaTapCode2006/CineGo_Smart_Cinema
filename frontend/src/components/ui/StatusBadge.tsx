import React from 'react';
import { cn } from '../../utils/cn';
import { MovieStatus } from '../../types/movie';

interface StatusBadgeProps {
  status: MovieStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const isNowShowing = status === 'now_showing';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full tracking-wide uppercase',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        isNowShowing
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isNowShowing ? 'bg-emerald-400 animate-pulse' : 'bg-accent-gold'
        )}
        aria-hidden="true"
      />
      {isNowShowing ? 'Now Showing' : 'Coming Soon'}
    </span>
  );
};

export default StatusBadge;
