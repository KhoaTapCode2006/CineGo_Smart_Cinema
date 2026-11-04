import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, RotateCcw, X } from 'lucide-react';
import { Movie } from '../../types/movie';
import Tabs, { TabItem } from '../ui/Tabs';
import MovieCard from './MovieCard';
import MoviePopup from './MoviePopup';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { MovieCardSkeleton } from '../ui/Skeletons';
import TrailerModal from '../ui/TrailerModal';
import ScrollReveal from '../effects/ScrollReveal';
import { useMovies } from '../../hooks/useMovies';
import { useMoviePreview } from '../../hooks/useMoviePreview';
import { useCatalogFilters, SortOption } from '../../hooks/useCatalogFilters';
import { cn } from '../../utils/cn';

export const MovieDiscovery: React.FC = () => {
  const {
    filters,
    setGenre,
    setTab,
    setSort,
    setPage,
    clearSearch,
    clearGenre,
    clearAll,
  } = useCatalogFilters();

  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const { preview, open, close, keepOpen, dismiss } = useMoviePreview();

  // 1. Fetch movies from React Query synced with URL search params
  const { data, isLoading, isError, refetch } = useMovies({
    status: filters.tab,
    q: filters.q,
    genre: filters.genre !== 'All' ? filters.genre : undefined,
    page: filters.page,
    pageSize: 18,
  });

  // 2. Client-side sorting on fetched items
  const sortedMovies = useMemo(() => {
    if (!data?.items) return [];
    const list = [...data.items];

    switch (filters.sort) {
      case 'title-asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'duration-asc':
        return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
      case 'duration-desc':
        return list.sort((a, b) => b.durationMinutes - a.durationMinutes);
      default:
        return list;
    }
  }, [data?.items, filters.sort]);

  // Cards unmount without a mouseleave when the list changes, leaving the popup orphaned.
  useEffect(() => {
    dismiss();
  }, [sortedMovies, dismiss]);

  const hasActiveFilters = Boolean(
    filters.q || (filters.genre && filters.genre !== 'All') || filters.sort !== 'title-asc'
  );

  const tabs: TabItem[] = [
    { id: 'now_showing', label: 'Now Showing' },
    { id: 'coming_soon', label: 'Coming Soon' },
  ];

  return (
    <section
      id="discover"
      className="scroll-mt-[var(--nav-h,4rem)] relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pt-24 pb-14 bg-transparent select-none"
    >
      {/* Section Header with Tabs & Sort */}
      <ScrollReveal distance={16} duration={500}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-3">
          <div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)]">
              Discover Movies
            </h2>
          </div>

          {/* Tabs: Now Showing | Coming Soon */}
          <Tabs
            tabs={tabs}
            activeTab={filters.tab}
            onChange={(tabId) => setTab(tabId as any)}
            className="w-full md:w-auto"
          />
        </div>
      </ScrollReveal>

      {/* Discover Toolbar: Glass Sort dropdown & Active Controls */}
      <div className="py-2.5 flex items-center justify-between gap-3 border-b border-white/10">
        <div className="text-xs sm:text-sm text-slate-300">
          {filters.tab === 'now_showing' ? 'Currently playing in theatres' : 'Upcoming blockbuster premieres'}
        </div>

        {/* Sort Select */}
        <div className="relative flex items-center">
          <label htmlFor="movie-sort" className="sr-only">
            Sort movies
          </label>
          <div className="relative">
            <select
              id="movie-sort"
              value={filters.sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none pl-9 pr-8 py-1.5 min-h-[38px] bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 rounded-btn text-xs sm:text-sm text-white font-medium [text-shadow:_0_1px_2px_rgba(0,0,0,0.7)] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand focus:border-white/20"
            >
              <option className="bg-[#0b0e1a] text-white" value="title-asc">Title (A – Z)</option>
              <option className="bg-[#0b0e1a] text-white" value="title-desc">Title (Z – A)</option>
              <option className="bg-[#0b0e1a] text-white" value="duration-asc">Duration (Shortest)</option>
              <option className="bg-[#0b0e1a] text-white" value="duration-desc">Duration (Longest)</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filter Chips & Results Count Notification */}
      <div className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-300 [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Removable Chip for Active Genre Filter */}
          {filters.genre && filters.genre !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold backdrop-blur-md animate-fade-in shadow-sm">
              <span>Genre: <strong className="text-accent-gold">{filters.genre}</strong></span>
              <button
                type="button"
                onClick={clearGenre}
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
                aria-label={`Remove genre filter ${filters.genre}`}
                title="Remove genre filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {/* Removable Chip for Active Search Query */}
          {filters.q && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold backdrop-blur-md animate-fade-in shadow-sm">
              <span>Search: <strong className="text-white">"{filters.q}"</strong></span>
              <button
                type="button"
                onClick={clearSearch}
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
                aria-label={`Remove search filter ${filters.q}`}
                title="Remove search filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {/* Clear all link */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-300 ml-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Results Count */}
        {data && (
          <span className="font-semibold text-cinema-text">
            {data.total} {data.total === 1 ? 'movie' : 'movies'} found
          </span>
        )}
      </div>

      {/* Main Content States */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 mt-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <MovieCardSkeleton key={`skeleton-${idx}`} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          onRetry={() => refetch()}
          message="Failed to load movie catalog from the backend. Click Retry to reload."
        />
      ) : sortedMovies.length === 0 ? (
        filters.q || filters.genre !== 'All' ? (
          <EmptyState
            type="search"
            title="No matching movies found"
            description={`We couldn't find any ${filters.tab === 'now_showing' ? 'now showing' : 'upcoming'} movies matching your criteria.`}
            actionText="Clear all filters"
            onAction={clearAll}
          />
        ) : filters.tab === 'now_showing' ? (
          <EmptyState
            type="now_showing"
            onAction={() => setTab('coming_soon')}
          />
        ) : (
          <EmptyState
            type="general"
            title="No upcoming movies scheduled"
            description="Please check back later for exciting upcoming movie releases!"
            onAction={() => setTab('now_showing')}
            actionText="View Now Showing"
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 mt-4">
            {sortedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPreviewOpen={open}
                onPreviewClose={close}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > data.pageSize && (
            <div className="mt-12 flex justify-center">
              <Pagination
                currentPage={filters.page}
                totalItems={data.total}
                pageSize={data.pageSize}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </>
      )}

      {/* Hover Movie Popup */}
      {preview && (
        <MoviePopup
          key={preview.movie.id}
          movie={preview.movie}
          anchor={preview.anchor}
          onMouseEnter={keepOpen}
          onMouseLeave={close}
          onDismiss={dismiss}
          onWatchTrailer={(m) => {
            dismiss();
            setActiveTrailerMovie(m);
          }}
        />
      )}

      {/* Trailer Modal */}
      {activeTrailerMovie && (
        <TrailerModal
          isOpen={Boolean(activeTrailerMovie)}
          onClose={() => setActiveTrailerMovie(null)}
          videoTitle={activeTrailerMovie.title}
          embedUrl={activeTrailerMovie.trailerEmbedUrl}
        />
      )}
    </section>
  );
};

export default MovieDiscovery;
