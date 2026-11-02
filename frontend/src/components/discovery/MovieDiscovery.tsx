import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowUpDown, RotateCcw } from 'lucide-react';
import { Movie, MovieStatus } from '../../types/movie';
import Tabs, { TabItem } from '../ui/Tabs';
import SearchInput from '../ui/SearchInput';
import GenreChip from '../ui/GenreChip';
import MovieCard from './MovieCard';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { MovieCardSkeleton } from '../ui/Skeletons';
import TrailerModal from '../ui/TrailerModal';
import { useMovies, useGenres } from '../../hooks/useMovies';

type SortOption = 'title-asc' | 'title-desc' | 'duration-asc' | 'duration-desc';

interface MovieDiscoveryProps {
  onBookNow?: (movie: Movie) => void;
}

export const MovieDiscovery: React.FC<MovieDiscoveryProps> = ({ onBookNow }) => {
  // 1. Initialize filters from URL query parameters
  const getInitialParams = (): {
    tab: MovieStatus;
    q: string;
    genre: string;
    sort: SortOption;
    page: number;
  } => {
    if (typeof window === 'undefined') {
      return { tab: 'now_showing', q: '', genre: 'All', sort: 'title-asc', page: 1 };
    }
    const searchParams = new URLSearchParams(window.location.search);
    const rawTab = searchParams.get('tab');
    const tab: MovieStatus = rawTab === 'coming_soon' ? 'coming_soon' : 'now_showing';
    return {
      tab,
      q: searchParams.get('q') || '',
      genre: searchParams.get('genre') || 'All',
      sort: (searchParams.get('sort') as SortOption) || 'title-asc',
      page: parseInt(searchParams.get('page') || '1', 10),
    };
  };

  const initial = getInitialParams();
  const [activeTab, setActiveTab] = useState<MovieStatus>(initial.tab);
  const [searchInput, setSearchInput] = useState(initial.q);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.q);
  const [selectedGenre, setSelectedGenre] = useState(initial.genre);
  const [sortBy, setSortBy] = useState<SortOption>(initial.sort);
  const [currentPage, setCurrentPage] = useState(initial.page);
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);

  const genres = useGenres();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Debounce search input (400ms)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchInput]);

  // 3. Sync state back to URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (activeTab !== 'now_showing') params.set('tab', activeTab);
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (selectedGenre !== 'All') params.set('genre', selectedGenre);
    if (sortBy !== 'title-asc') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, debouncedSearch, selectedGenre, sortBy, currentPage]);

  // 4. Fetch movies from React Query
  const { data, isLoading, isError, refetch } = useMovies({
    status: activeTab,
    q: debouncedSearch,
    genre: selectedGenre !== 'All' ? selectedGenre : undefined,
    page: currentPage,
    pageSize: 18,
  });

  // 5. Client-side sorting on fetched items
  const sortedMovies = useMemo(() => {
    if (!data?.items) return [];
    const list = [...data.items];

    switch (sortBy) {
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
  }, [data?.items, sortBy]);

  // Handlers
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as MovieStatus);
    setCurrentPage(1);
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedGenre('All');
    setSortBy('title-asc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchInput || selectedGenre !== 'All' || sortBy !== 'title-asc');

  const tabs: TabItem[] = [
    { id: 'now_showing', label: 'Now Showing' },
    { id: 'coming_soon', label: 'Coming Soon' },
  ];

  return (
    <section id="discovery" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand mb-1 block">
            CineGo Catalog
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Discover Movies
          </h2>
        </div>

        {/* Tabs: Now Showing | Coming Soon */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="w-full md:w-auto"
        />
      </div>

      {/* Sticky Toolbar under Navbar */}
      <div className="sticky top-16 z-30 py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-cinema-bg/95 backdrop-blur-md border-b border-cinema-border/80 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onClear={() => setSearchInput('')}
              placeholder={`Search ${activeTab === 'now_showing' ? 'now showing' : 'upcoming'} movies...`}
            />
          </div>

          {/* Right Toolbar Controls: Sort dropdown & Clear filters */}
          <div className="flex items-center gap-3 justify-between lg:justify-end">
            {/* Sort Select */}
            <div className="relative flex items-center">
              <label htmlFor="movie-sort" className="sr-only">
                Sort movies
              </label>
              <div className="relative">
                <select
                  id="movie-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-9 pr-8 py-2 min-h-[44px] bg-cinema-surface border border-cinema-border hover:border-cinema-muted/50 rounded-btn text-xs sm:text-sm text-cinema-text font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="title-asc">Title (A – Z)</option>
                  <option value="title-desc">Title (Z – A)</option>
                  <option value="duration-asc">Duration (Shortest)</option>
                  <option value="duration-desc">Duration (Longest)</option>
                </select>
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinema-muted pointer-events-none" />
              </div>
            </div>

            {/* Clear Filters Link */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs sm:text-sm font-semibold text-brand hover:text-brand-400 transition-colors cursor-pointer rounded-btn"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scrollable Genre Filter Chips */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {genres.map((genre) => (
            <GenreChip
              key={genre}
              genre={genre}
              isSelected={selectedGenre === genre}
              onClick={handleGenreChange}
            />
          ))}
        </div>
      </div>

      {/* Active Filter & Results Count Notification */}
      <div className="py-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-cinema-muted">
        <div>
          {debouncedSearch ? (
            <span>
              Search results for{' '}
              <strong className="text-white">"{debouncedSearch}"</strong>
              {selectedGenre !== 'All' && (
                <> in <strong className="text-accent-gold">{selectedGenre}</strong></>
              )}
            </span>
          ) : selectedGenre !== 'All' ? (
            <span>
              Showing <strong className="text-accent-gold">{selectedGenre}</strong> movies
            </span>
          ) : (
            <span>
              Showing all {activeTab === 'now_showing' ? 'current' : 'upcoming'} releases
            </span>
          )}
        </div>

        {data && (
          <span className="font-medium text-cinema-text">
            {data.total} {data.total === 1 ? 'movie' : 'movies'} found
          </span>
        )}
      </div>

      {/* Main Content States */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
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
        debouncedSearch || selectedGenre !== 'All' ? (
          <EmptyState
            type="search"
            title="No matching movies found"
            description={`We couldn't find any ${activeTab === 'now_showing' ? 'now showing' : 'upcoming'} movies matching your criteria.`}
            actionText="Clear all filters"
            onAction={handleClearFilters}
          />
        ) : activeTab === 'now_showing' ? (
          <EmptyState
            type="now_showing"
            onAction={() => setActiveTab('coming_soon')}
          />
        ) : (
          <EmptyState
            type="general"
            title="No upcoming movies scheduled"
            description="Please check back later for exciting upcoming movie releases!"
            onAction={() => setActiveTab('now_showing')}
            actionText="View Now Showing"
          />
        )
      ) : (
        <>
          {/* Responsive Movie Grid: 2 cols on mobile (390), 3-4 cols on tablet (834), 5-6 on desktop (1440) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5 lg:gap-6">
            {sortedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onWatchTrailer={(m) => setActiveTrailerMovie(m)}
                onBookNow={onBookNow}
              />
            ))}
          </div>

          {/* Bottom Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={data?.total || sortedMovies.length}
            pageSize={18}
            onPageChange={(p) => {
              setCurrentPage(p);
              // Smooth scroll to top of discovery section
              document.getElementById('discovery')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </>
      )}

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={Boolean(activeTrailerMovie)}
        onClose={() => setActiveTrailerMovie(null)}
        videoTitle={activeTrailerMovie?.title || ''}
        embedUrl={activeTrailerMovie?.trailerEmbedUrl || null}
      />
    </section>
  );
};

export default MovieDiscovery;
