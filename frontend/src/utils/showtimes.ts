import { ShowtimeOut } from '../types/movie';

/** Showtimes are always shown in the cinemas' local time, wherever the viewer is. */
const CINEMA_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type ShowtimeState = 'available' | 'started' | 'sold_out';

export interface ShowtimeOption {
  showtime: ShowtimeOut;
  time: string;
  state: ShowtimeState;
}

export interface CinemaShowtimes {
  cinemaId: string;
  cinemaName: string;
  languages: string[];
  options: ShowtimeOption[];
}

export interface ShowtimeDay {
  /** Cinema-local calendar day as YYYY-MM-DD. */
  date: string;
  minPrice: number;
  cinemas: CinemaShowtimes[];
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CINEMA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CINEMA_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'long' });

/**
 * Get the cinema-local calendar day (YYYY-MM-DD) of an instant.
 */
export function getCinemaDate(instant: string | Date): string {
  return dateFormatter.format(new Date(instant));
}

function getShowtimeState(showtime: ShowtimeOut, now: Date): ShowtimeState {
  if (new Date(showtime.start_at) <= now) return 'started';
  if (showtime.available_seats <= 0) return 'sold_out';
  return 'available';
}

/**
 * Group flat showtimes into days and cinemas, ordered by day, cinema name and start time.
 */
export function groupShowtimesByDay(showtimes: ShowtimeOut[], now: Date = new Date()): ShowtimeDay[] {
  const sorted = [...showtimes].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  const days = new Map<string, ShowtimeDay>();

  sorted.forEach((showtime) => {
    const date = getCinemaDate(showtime.start_at);
    const price = Number(showtime.base_price);

    let day = days.get(date);
    if (!day) {
      day = { date, minPrice: price, cinemas: [] };
      days.set(date, day);
    }
    day.minPrice = Math.min(day.minPrice, price);

    let cinema = day.cinemas.find((c) => c.cinemaId === showtime.cinema_id);
    if (!cinema) {
      cinema = {
        cinemaId: showtime.cinema_id,
        cinemaName: showtime.cinema_name,
        languages: [],
        options: [],
      };
      day.cinemas.push(cinema);
    }

    if (showtime.language && !cinema.languages.includes(showtime.language)) {
      cinema.languages.push(showtime.language);
    }

    cinema.options.push({
      showtime,
      time: timeFormatter.format(new Date(showtime.start_at)),
      state: getShowtimeState(showtime, now),
    });
  });

  return Array.from(days.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      ...day,
      cinemas: day.cinemas.sort((a, b) => a.cinemaName.localeCompare(b.cinemaName)),
    }));
}

function getWeekday(date: string): string {
  return weekdayFormatter.format(new Date(`${date}T12:00:00Z`));
}

/**
 * Date selector label, e.g. "26/10 · Hôm nay" or "27/10 · Thứ Ba".
 */
export function formatDayChip(date: string, today: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month} · ${date === today ? 'Hôm nay' : getWeekday(date)}`;
}

/**
 * Section heading date, e.g. "Thứ Hai, 26/10/2026".
 */
export function formatDayHeading(date: string): string {
  const [year, month, day] = date.split('-');
  return `${getWeekday(date)}, ${day}/${month}/${year}`;
}

/**
 * Cinema name for the booking button, e.g. "CineGo Central" becomes "Central".
 */
export function shortCinemaName(name: string): string {
  return name.replace(/^CineGo\s+/i, '');
}
