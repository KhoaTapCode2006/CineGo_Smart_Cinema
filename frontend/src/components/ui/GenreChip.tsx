import React from 'react';
import { cn } from '../../utils/cn';

interface GenreChipProps {
  genre: string;
  isSelected?: boolean;
  onClick: (genre: string) => void;
  className?: string;
}

export const GenreChip: React.FC<GenreChipProps> = ({
  genre,
  isSelected = false,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(genre)}
      aria-pressed={isSelected}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-cinema-bg',
        isSelected
          ? 'bg-brand text-white shadow-lg shadow-brand/25 font-semibold'
          : 'bg-cinema-surface hover:bg-cinema-hover text-cinema-muted hover:text-cinema-text border border-cinema-border hover:border-cinema-muted/30',
        className
      )}
    >
      {genre}
    </button>
  );
};

export default GenreChip;
