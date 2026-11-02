import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Film, Loader2 } from 'lucide-react';
import { useCatalogFilters } from '../../hooks/useCatalogFilters';
import { getMovies } from '../../api/catalog';
import { Movie } from '../../types/movie';
import { cn } from '../../utils/cn';

interface NavbarSearchProps {
  className?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const NavbarSearch: React.FC<NavbarSearchProps> = ({
  className,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { filters, setQuery } = useCatalogFilters();
  const [inputValue, setInputValue] = useState(filters.q);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize internal input value with URL query param if it changes externally
  useEffect(() => {
    setInputValue(filters.q);
  }, [filters.q]);

  // 1. Keyboard Shortcut "/" to focus search input; "Esc" to blur/clear
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 2. Fetch top 5 suggestions when typing
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await getMovies({ q: query.trim(), pageSize: 5 });
      setSuggestions(res.items || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 3. Handle debounced typing (400ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setShowDropdown(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setQuery(val, false);
      fetchSuggestions(val);
    }, 400);
  };

  // 4. Pressing Enter applies query immediately and scrolls to #discover
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setQuery(inputValue, true);
      setShowDropdown(false);
      inputRef.current?.blur();
      if (onCloseMobile) onCloseMobile();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      inputRef.current?.blur();
      if (onCloseMobile) onCloseMobile();
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuery('', false);
    inputRef.current?.focus();
  };

  // 5. Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (movie: Movie) => {
    setShowDropdown(false);
    if (onCloseMobile) onCloseMobile();
    // Navigate to movie detail or apply search
    window.location.href = `/movies/${movie.id}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative transition-all duration-300 ease-out', className)}
    >
      <div
        className={cn(
          'relative flex items-center transition-all duration-300',
          'w-full md:w-[280px] focus-within:md:w-[360px]'
        )}
      >
        {/* Search Icon */}
        <Search
          className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (inputValue.trim()) {
              setShowDropdown(true);
              fetchSuggestions(inputValue);
            }
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Search movies... (press '/' to focus)"
          aria-label="Search movies"
          className="w-full pl-9 pr-9 py-1.5 min-h-[38px] bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/30 backdrop-blur-md rounded-full text-xs sm:text-sm text-white placeholder-slate-400 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white/10"
        />

        {/* Keyboard shortcut indicator "/" (shown when empty & not focused) */}
        {!inputValue && !isFocused && (
          <span className="hidden lg:inline-flex absolute right-3 items-center justify-center w-5 h-5 text-[10px] font-semibold text-slate-400 bg-white/10 rounded border border-white/10 pointer-events-none select-none">
            /
          </span>
        )}

        {/* Loading Spinner or Clear Button */}
        {isSearching ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-slate-400 animate-spin" />
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Suggestion Dropdown (Top 5 matches with thumbnail) */}
      {showDropdown && suggestions.length > 0 && (
        <div
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full mt-2 bg-[#070a1f]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-60 animate-fade-in"
        >
          <div className="p-1.5 space-y-1">
            {suggestions.map((movie) => (
              <button
                key={movie.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => handleSelectSuggestion(movie)}
                className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-white/10 transition-colors group cursor-pointer focus:outline-none focus:bg-white/10"
              >
                {/* Poster Thumbnail */}
                <div className="w-9 h-12 rounded bg-black/40 overflow-hidden flex-shrink-0 border border-white/10">
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </div>

                {/* Movie Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                    {movie.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    {movie.genre && <span>{movie.genre}</span>}
                    {movie.genre && movie.durationFormatted && <span>·</span>}
                    {movie.durationFormatted && <span>{movie.durationFormatted}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer of dropdown: View all results in discover section */}
          <button
            type="button"
            onClick={() => {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              setQuery(inputValue, true);
              setShowDropdown(false);
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full py-2.5 px-3 bg-white/5 border-t border-white/10 text-center text-xs font-semibold text-brand hover:text-brand-300 hover:bg-white/10 transition-colors block"
          >
            See all results for "{inputValue}" →
          </button>
        </div>
      )}
    </div>
  );
};

export default NavbarSearch;
