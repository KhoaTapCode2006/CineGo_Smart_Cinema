import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { useCatalogFilters } from '../../hooks/useCatalogFilters';
import { useGenres } from '../../hooks/useMovies';
import { cn } from '../../utils/cn';

interface NavbarGenreDropdownProps {
  className?: string;
  isMobileSheet?: boolean;
  onCloseMobile?: () => void;
}

export const NavbarGenreDropdown: React.FC<NavbarGenreDropdownProps> = ({
  className,
  isMobileSheet = false,
  onCloseMobile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const { filters, setGenre, scrollToDiscover } = useCatalogFilters();
  const genres = useGenres(); // Fetched dynamically from real data, no hardcoded fallback

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // List of all options including "All genres"
  const allOptions = ['All', ...genres];
  const selectedGenre = filters.genre || 'All';
  const buttonLabel = selectedGenre === 'All' ? 'Genres' : selectedGenre;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation inside dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % allOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + allOptions.length) % allOptions.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < allOptions.length) {
        handleSelectGenre(allOptions[focusedIndex]);
      }
    }
  };

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  const handleSelectGenre = (genre: string) => {
    setGenre(genre);
    setIsOpen(false);
    buttonRef.current?.focus();
    if (onCloseMobile) onCloseMobile();
    // Scroll smoothly to discover section on select
    scrollToDiscover();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by genre"
        className={cn(
          'inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand select-none',
          selectedGenre !== 'All'
            ? 'bg-brand text-white border border-brand shadow-md shadow-brand/25'
            : 'bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/10 hover:border-white/20 backdrop-blur-md'
        )}
      >
        <span className="truncate max-w-[110px]">{buttonLabel}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200 opacity-70',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>

      {/* Glass Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop on mobile for bottom sheet effect */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={dropdownRef}
            role="listbox"
            aria-label="Movie genres list"
            className={cn(
              'fixed md:absolute z-60 bg-[#070a1f]/95 md:bg-[#070a1f]/85 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-150 origin-top-left',
              // Desktop layout: Popover dropdown panel with 2-3 columns grid
              'md:left-0 md:top-full md:mt-2 md:w-[380px] md:rounded-2xl md:p-3.5',
              // Mobile layout: Bottom sheet or full width
              'bottom-0 left-0 right-0 max-h-[75vh] rounded-t-3xl p-5 overflow-y-auto md:max-h-[460px] md:bottom-auto'
            )}
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
                Select Genre
              </span>
              <span className="text-[11px] text-slate-400">
                {genres.length} genres available
              </span>
            </div>

            {/* Grid of options: "All genres" option first, then 2-3 column grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {allOptions.map((genre, idx) => {
                const isSelected = selectedGenre === genre;
                const isAll = genre === 'All';

                return (
                  <button
                    key={genre}
                    ref={(el) => (optionsRef.current[idx] = el)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectGenre(genre)}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      isSelected
                        ? 'bg-brand text-white font-bold shadow-md shadow-brand/30 border border-brand'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/5 hover:border-white/15'
                    )}
                  >
                    <span className="truncate">{isAll ? 'All Genres' : genre}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NavbarGenreDropdown;
