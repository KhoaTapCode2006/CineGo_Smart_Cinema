import { useState, useEffect, useCallback } from 'react';
import { MovieStatus } from '../types/movie';

export type SortOption = 'title-asc' | 'title-desc' | 'duration-asc' | 'duration-desc';

export interface CatalogFilters {
  q: string;
  genre: string;
  tab: MovieStatus;
  sort: SortOption;
  page: number;
}

const FILTER_EVENT = 'catalog-filters-changed';

export function getFiltersFromURL(): CatalogFilters {
  if (typeof window === 'undefined') {
    return {
      q: '',
      genre: 'All',
      tab: 'now_showing',
      sort: 'title-asc',
      page: 1,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get('tab');
  const tab: MovieStatus = rawTab === 'coming_soon' ? 'coming_soon' : 'now_showing';
  const q = params.get('q') || '';
  const genre = params.get('genre') || 'All';
  const sort = (params.get('sort') as SortOption) || 'title-asc';
  const page = parseInt(params.get('page') || '1', 10);

  return {
    q,
    genre,
    tab,
    sort,
    page: isNaN(page) || page < 1 ? 1 : page,
  };
}

export function updateURLParams(
  newValues: Partial<CatalogFilters>,
  replace: boolean = true
) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);

  if (newValues.q !== undefined) {
    if (newValues.q.trim()) {
      params.set('q', newValues.q.trim());
    } else {
      params.delete('q');
    }
  }

  if (newValues.genre !== undefined) {
    if (newValues.genre.trim() && newValues.genre !== 'All') {
      params.set('genre', newValues.genre.trim());
    } else {
      params.delete('genre');
    }
  }

  if (newValues.tab !== undefined) {
    if (newValues.tab === 'coming_soon') {
      params.set('tab', 'coming_soon');
    } else {
      params.delete('tab');
    }
  }

  if (newValues.sort !== undefined) {
    if (newValues.sort !== 'title-asc') {
      params.set('sort', newValues.sort);
    } else {
      params.delete('sort');
    }
  }

  if (newValues.page !== undefined) {
    if (newValues.page > 1) {
      params.set('page', newValues.page.toString());
    } else {
      params.delete('page');
    }
  }

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const newUrl = `${window.location.pathname}${queryStr}${window.location.hash}`;

  if (replace) {
    window.history.replaceState({}, '', newUrl);
  } else {
    window.history.pushState({}, '', newUrl);
  }

  window.dispatchEvent(new CustomEvent(FILTER_EVENT));
}

/**
 * Shared hook to synchronize catalog filters (search query, genre, tab, sort, pagination)
 * across the Sticky Navbar, Discover section, and URL search parameters.
 */
export function useCatalogFilters() {
  const [filters, setFilters] = useState<CatalogFilters>(getFiltersFromURL);

  useEffect(() => {
    const handleSync = () => {
      setFilters(getFiltersFromURL());
    };

    window.addEventListener(FILTER_EVENT, handleSync);
    window.addEventListener('popstate', handleSync);
    return () => {
      window.removeEventListener(FILTER_EVENT, handleSync);
      window.removeEventListener('popstate', handleSync);
    };
  }, []);

  const scrollToDiscover = useCallback(() => {
    if (typeof window === 'undefined') return;
    const isHome = window.location.pathname === '/' || window.location.pathname === '';
    if (isHome) {
      const el = document.getElementById('discover') || document.getElementById('discovery');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = `/${window.location.search}#discover`;
    }
  }, []);

  const setQuery = useCallback(
    (query: string, navigateToSection: boolean = false) => {
      updateURLParams({ q: query, page: 1 });
      if (navigateToSection) {
        scrollToDiscover();
      }
    },
    [scrollToDiscover]
  );

  const setGenre = useCallback((genre: string) => {
    updateURLParams({ genre, page: 1 });
  }, []);

  const setTab = useCallback((tab: MovieStatus) => {
    updateURLParams({ tab, page: 1 });
  }, []);

  const setSort = useCallback((sort: SortOption) => {
    updateURLParams({ sort });
  }, []);

  const setPage = useCallback((page: number) => {
    updateURLParams({ page });
  }, []);

  const clearSearch = useCallback(() => {
    updateURLParams({ q: '', page: 1 });
  }, []);

  const clearGenre = useCallback(() => {
    updateURLParams({ genre: 'All', page: 1 });
  }, []);

  const clearAll = useCallback(() => {
    updateURLParams({ q: '', genre: 'All', sort: 'title-asc', page: 1 });
  }, []);

  return {
    filters,
    setQuery,
    setGenre,
    setTab,
    setSort,
    setPage,
    clearSearch,
    clearGenre,
    clearAll,
    scrollToDiscover,
  };
}

export default useCatalogFilters;
