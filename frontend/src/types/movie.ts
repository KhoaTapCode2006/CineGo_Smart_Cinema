export type MovieStatus = 'now_showing' | 'coming_soon' | 'inactive';

/**
 * Raw Movie representation directly returned from the FastAPI backend (MovieOut).
 */
export interface MovieOut {
  id: string;
  title: string;
  description: string | null;
  director: string | null;
  casts: string | null;
  genre: string | null;
  duration_minutes: number;
  language: string | null;
  age_rating: string | null;
  trailer_url: string | null;
  poster_url: string | null;
  status: MovieStatus;
}

/**
 * Paginated API response from GET /api/v1/movies.
 */
export interface MoviePageResponse {
  items: MovieOut[];
  page: number;
  page_size: number;
  total: number;
}

/**
 * Clean, idiomatic Frontend Movie model.
 */
export interface Movie {
  id: string;
  title: string;
  description: string | null;
  director: string | null;
  casts: string | null;
  castList: string[];
  genre: string | null;
  durationMinutes: number;
  durationFormatted: string;
  language: string | null;
  languageLabel: string;
  ageRating: string | null;
  trailerUrl: string | null;
  trailerEmbedUrl: string | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  heroImageUrl: string | null;
  durationMin?: number;
  status: MovieStatus;
}

/**
 * Raw ShowtimeOut from GET /api/v1/showtimes.
 */
export interface ShowtimeOut {
  id: string;
  movie_id: string;
  movie_title: string;
  cinema_id: string;
  cinema_name: string;
  hall_id: string;
  hall_name: string;
  start_at: string;
  end_at: string;
  language: string | null;
  base_price: string | number;
  available_seats: number;
}

/**
 * Raw CinemaOut from GET /api/v1/cinemas.
 */
export interface CinemaOut {
  id: string;
  name: string;
  address: string;
  status: string;
}

/**
 * Format duration minutes into "Xh Ym" or "Xm".
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return 'TBA';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/**
 * Convert ISO language code to human-readable label via Intl.DisplayNames.
 */
export function formatLanguage(code: string | null): string {
  if (!code) return 'Standard';
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const name = displayNames.of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Extract the 11-character video ID from standard YouTube URLs.
 */
function getYouTubeVideoId(url: string): string | null {
  // Pattern 1: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:watch\?v=|v\/|embed\/|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return watchMatch ? watchMatch[1] : null;
}

/**
 * Extract YouTube embed URL from standard YouTube URLs.
 */
export function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    // If it's already an embed URL
    if (url.includes('/embed/')) return url;

    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Get the 16:9 thumbnail YouTube publishes for every video.
 */
export function getYouTubeThumbnailUrl(url: string | null): string | null {
  const videoId = url ? getYouTubeVideoId(url) : null;
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
}

/**
 * Map raw backend MovieOut to frontend Movie model.
 */
export function mapMovieOutToMovie(raw: MovieOut): Movie {
  const castList = raw.casts
    ? raw.casts
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  const trailerEmbedUrl = getYouTubeEmbedUrl(raw.trailer_url);

  // Use higher resolution /w780/ for hero image if it is a TMDB URL
  const heroImageUrl = raw.poster_url
    ? raw.poster_url.replace('/w500/', '/w780/')
    : null;

  return {
    id: raw.id,
    title: raw.title || 'Untitled Movie',
    description: raw.description,
    director: raw.director,
    casts: raw.casts,
    castList,
    genre: raw.genre ? raw.genre.trim() : null,
    durationMinutes: raw.duration_minutes || 0,
    durationFormatted: formatDuration(raw.duration_minutes),
    language: raw.language,
    languageLabel: formatLanguage(raw.language),
    ageRating: raw.age_rating,
    trailerUrl: raw.trailer_url,
    trailerEmbedUrl,
    posterUrl: raw.poster_url,
    backdropUrl: (raw as any).backdrop_url || (raw as any).backdropUrl || null,
    heroImageUrl,
    durationMin: raw.duration_minutes || 0,
    status: raw.status,
  };
}
