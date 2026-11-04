import apiClient from './client';
import {
  CinemaOut,
  Movie,
  MovieOut,
  MoviePageResponse,
  MovieStatus,
  ShowtimeOut,
  mapMovieOutToMovie,
} from '../types/movie';
import { MOCK_MOVIES } from '../data/mockMovies';

export interface FetchMoviesParams {
  q?: string;
  genre?: string;
  status?: MovieStatus;
  page?: number;
  pageSize?: number;
}

export interface FetchMoviesResult {
  items: Movie[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Filter mock movies locally for seamless mock/offline testing.
 */
function filterMockMovies(params: FetchMoviesParams): FetchMoviesResult {
  let list = [...MOCK_MOVIES];

  if (params.status) {
    list = list.filter((m) => m.status === params.status);
  } else {
    list = list.filter((m) => m.status !== 'inactive');
  }

  if (params.q && params.q.trim()) {
    const query = params.q.trim().toLowerCase();
    list = list.filter((m) => m.title.toLowerCase().includes(query));
  }

  if (params.genre && params.genre.trim() && params.genre !== 'All') {
    const g = params.genre.trim().toLowerCase();
    list = list.filter((m) => m.genre?.toLowerCase() === g);
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const total = list.length;
  const start = (page - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);

  return {
    items: paged.map(mapMovieOutToMovie),
    total,
    page,
    pageSize,
  };
}

/**
 * Fetch movies from the real API with query parameters.
 */
export async function getMovies(params: FetchMoviesParams = {}): Promise<FetchMoviesResult> {
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  if (isMock) {
    // Add small simulated latency for natural UI testing
    await new Promise((resolve) => setTimeout(resolve, 250));
    return filterMockMovies(params);
  }

  try {
    const queryParams: Record<string, string | number> = {
      page: params.page || 1,
      page_size: params.pageSize || 20,
    };

    if (params.q?.trim()) {
      queryParams.q = params.q.trim();
    }
    if (params.genre?.trim() && params.genre !== 'All') {
      queryParams.genre = params.genre.trim();
    }
    if (params.status) {
      queryParams.status = params.status;
    }

    const { data } = await apiClient.get<MoviePageResponse>('/movies', {
      params: queryParams,
    });

    // If server returned 0 items but mock is allowed as fallback
    if ((!data.items || data.items.length === 0) && isMock) {
      return filterMockMovies(params);
    }

    return {
      items: (data.items || []).map(mapMovieOutToMovie),
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.page_size || 20,
    };
  } catch (error) {
    // Fallback to mock data if backend is offline or not yet connected
    console.warn('API error, falling back to mock dataset:', error);
    return filterMockMovies(params);
  }
}

/** Error message of a missing movie, matching the API's 404 detail. */
export const MOVIE_NOT_FOUND = 'Movie not found';

/**
 * Fetch a single movie by ID.
 */
export async function getMovieById(id: string): Promise<Movie> {
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  let apiError: unknown;

  if (!isMock) {
    try {
      const { data } = await apiClient.get<MovieOut>(`/movies/${id}`);
      return mapMovieOutToMovie(data);
    } catch (error) {
      console.warn(`Failed to fetch movie ${id} from API, checking mock data...`);
      apiError = error;
    }
  }

  const mock = MOCK_MOVIES.find((m) => m.id === id);
  if (mock) {
    return mapMovieOutToMovie(mock);
  }
  throw apiError ?? new Error(MOVIE_NOT_FOUND);
}

/**
 * Fetch showtimes for a movie / cinema / date.
 * Failures propagate: an empty list means the movie really has no showtimes.
 */
export async function getShowtimes(params: {
  movieId?: string;
  cinemaId?: string;
  date?: string;
}): Promise<ShowtimeOut[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') return [];

  const queryParams: Record<string, string> = {};
  if (params.movieId) queryParams.movie_id = params.movieId;
  if (params.cinemaId) queryParams.cinema_id = params.cinemaId;
  if (params.date) queryParams.date = params.date;

  const { data } = await apiClient.get<ShowtimeOut[]>('/showtimes', {
    params: queryParams,
  });
  return data || [];
}

/**
 * Fetch active cinemas.
 */
export async function getCinemas(): Promise<CinemaOut[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') return [];

  const { data } = await apiClient.get<CinemaOut[]>('/cinemas');
  return data || [];
}
