import { useQuery } from '@tanstack/react-query';
import { getMovies, getMovieById, FetchMoviesParams, FetchMoviesResult } from '../api/catalog';
import { Movie } from '../types/movie';


/**
 * Hook to fetch paginated/filtered movies list with caching.
 */
export function useMovies(params: FetchMoviesParams = {}) {
  return useQuery<FetchMoviesResult>({
    queryKey: ['movies', params],
    queryFn: () => getMovies(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Daily stable pseudo-random seed generator (seeded by YYYY-MM-DD).
 */
function getDaySeed(): number {
  const dateStr = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Hook for Hero Slider: selects exactly 5 movies using a stable daily shuffle.
 * Prioritizes now_showing movies with poster & description, filling with coming_soon.
 */
export function useFeaturedMovies() {
  return useQuery<Movie[]>({
    queryKey: ['featured-movies-ring-5', new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const seed = getDaySeed();

      // 1. Fetch now_showing movies
      const nowShowingRes = await getMovies({ status: 'now_showing', pageSize: 25 });
      const nowShowingEligible = nowShowingRes.items.filter(
        (m) => Boolean(m.posterUrl) && Boolean(m.description)
      );
      const shuffledNowShowing = seededShuffle(nowShowingEligible, seed);

      const selected: Movie[] = shuffledNowShowing.slice(0, 5);

      // 2. If fewer than 5, fill with coming_soon movies
      if (selected.length < 5) {
        const comingSoonRes = await getMovies({ status: 'coming_soon', pageSize: 25 });
        const existingIds = new Set(selected.map((m) => m.id));
        const comingSoonEligible = comingSoonRes.items.filter(
          (m) => Boolean(m.posterUrl) && !existingIds.has(m.id)
        );
        const shuffledComingSoon = seededShuffle(comingSoonEligible, seed + 1);

        for (const m of shuffledComingSoon) {
          if (selected.length >= 5) break;
          selected.push(m);
        }
      }

      // 3. Fallback: if still fewer than 5, take any movies with poster
      if (selected.length < 5) {
        const existingIds = new Set(selected.map((m) => m.id));
        const remaining = [...nowShowingRes.items].filter((m) => !existingIds.has(m.id));
        for (const m of remaining) {
          if (selected.length >= 5) break;
          selected.push(m);
        }
      }

      return selected;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook to extract available genres dynamically ONLY from distinct `genre` values in real data.
 * One cached request (pageSize: 100 across statuses). No hard-coded fallbacks.
 * Sorted alphabetically, deduplicated case-insensitively.
 */
export function useGenres() {
  const { data: genres = [] } = useQuery<string[]>({
    queryKey: ['distinct-catalog-genres'],
    queryFn: async () => {
      const res = await getMovies({ pageSize: 100 });
      const genreMap = new Map<string, string>();

      (res.items || []).forEach((m) => {
        if (m.genre && typeof m.genre === 'string') {
          const parts = m.genre.split(',').map((g) => g.trim()).filter(Boolean);
          parts.forEach((g) => {
            const key = g.toLowerCase();
            if (!genreMap.has(key)) {
              genreMap.set(key, g);
            }
          });
        }
      });

      return Array.from(genreMap.values()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return genres;
}

/**
 * Hook to fetch detail of a single movie.
 */
export function useMovieDetail(id: string | undefined) {
  return useQuery<Movie>({
    queryKey: ['movie-detail', id],
    queryFn: () => {
      if (!id) throw new Error('Movie ID is required');
      return getMovieById(id);
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
