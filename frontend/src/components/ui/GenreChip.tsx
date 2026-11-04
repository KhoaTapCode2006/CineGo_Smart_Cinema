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
          ? 'bg-brand text-white border border-brand shadow-lg shadow-brand/30 font-semibold [text-shadow:_0_1px_2px_rgba(0,0,0,0.5)]'
          : 'bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 text-slate-200 hover:text-white [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]',
        className
      )}
    >
      {genre}
    </button>
  );
};

export default GenreChip;
