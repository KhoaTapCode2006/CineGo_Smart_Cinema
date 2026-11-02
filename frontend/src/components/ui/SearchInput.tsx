import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  errorMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search movies by title...',
  errorMessage,
  isLoading = false,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <div className="relative flex items-center">
        <label htmlFor="movie-search-input" className="sr-only">
          {placeholder}
        </label>
        <Search
          className="absolute left-3.5 w-4 h-4 text-cinema-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="movie-search-input"
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? 'search-error-msg' : undefined}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 min-h-[44px] bg-cinema-surface text-cinema-text placeholder-cinema-muted rounded-btn border text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
            errorMessage
              ? 'border-brand-500 focus:ring-brand-500'
              : 'border-cinema-border hover:border-cinema-muted/40'
          )}
        />
        {isLoading ? (
          <div className="absolute right-3.5 w-4 h-4 border-2 border-cinema-muted border-t-brand rounded-full animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 p-1.5 min-w-[32px] min-h-[32px] text-cinema-muted hover:text-white rounded-md hover:bg-cinema-hover transition-colors"
            aria-label="Clear search input"
            title="Clear search (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      {errorMessage && (
        <p id="search-error-msg" className="mt-1 text-xs text-brand-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default SearchInput;
