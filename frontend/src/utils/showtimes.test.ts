import { describe, expect, it } from 'vitest';
import { ShowtimeOut } from '../types/movie';
import {
  formatDayChip,
  formatDayHeading,
  getCinemaDate,
  groupShowtimesByDay,
  shortCinemaName,
} from './showtimes';

function showtime(overrides: Partial<ShowtimeOut>): ShowtimeOut {
  return {
    id: 'st-1',
    movie_id: 'movie-1',
    movie_title: 'Movie',
    cinema_id: 'cinema-1',
    cinema_name: 'CineGo Central',
    hall_id: 'hall-1',
    hall_name: 'Phòng 03',
    start_at: '2026-10-26T12:30:00+00:00',
    end_at: '2026-10-26T14:30:00+00:00',
    language: '2D phụ đề',
    base_price: '90000.00',
    available_seats: 42,
    ...overrides,
  };
}

const BEFORE_ALL = new Date('2026-10-26T00:00:00Z');

describe('getCinemaDate', () => {
  it('uses the cinema calendar day, not the UTC day', () => {
    // 18:30 UTC on the 26th is already 01:30 on the 27th in Vietnam.
    expect(getCinemaDate('2026-10-26T18:30:00+00:00')).toBe('2026-10-27');
  });
});

describe('groupShowtimesByDay', () => {
  it('groups by day then cinema, sorted by day and start time', () => {
    const days = groupShowtimesByDay(
      [
        showtime({ id: 'late', start_at: '2026-10-27T12:30:00+00:00' }),
        showtime({ id: 'b', start_at: '2026-10-26T12:30:00+00:00', cinema_id: 'cinema-2', cinema_name: 'CineGo West' }),
        showtime({ id: 'a2', start_at: '2026-10-26T14:45:00+00:00' }),
        showtime({ id: 'a1', start_at: '2026-10-26T10:00:00+00:00' }),
      ],
      BEFORE_ALL
    );

    expect(days.map((d) => d.date)).toEqual(['2026-10-26', '2026-10-27']);
    expect(days[0].cinemas.map((c) => c.cinemaName)).toEqual(['CineGo Central', 'CineGo West']);
    expect(days[0].cinemas[0].options.map((o) => o.showtime.id)).toEqual(['a1', 'a2']);
  });

  it('formats times in cinema time', () => {
    const [day] = groupShowtimesByDay([showtime({ start_at: '2026-10-26T12:30:00+00:00' })], BEFORE_ALL);
    expect(day.cinemas[0].options[0].time).toBe('19:30');
  });

  it('marks started and sold-out showtimes as unavailable', () => {
    const now = new Date('2026-10-26T11:00:00Z');
    const [day] = groupShowtimesByDay(
      [
        showtime({ id: 'started', start_at: '2026-10-26T07:00:00+00:00' }),
        showtime({ id: 'sold', start_at: '2026-10-26T12:30:00+00:00', available_seats: 0 }),
        showtime({ id: 'open', start_at: '2026-10-26T14:45:00+00:00' }),
      ],
      now
    );

    expect(day.cinemas[0].options.map((o) => [o.showtime.id, o.state])).toEqual([
      ['started', 'started'],
      ['sold', 'sold_out'],
      ['open', 'available'],
    ]);
  });

  it('reports the lowest price of the day from decimal strings', () => {
    const [day] = groupShowtimesByDay(
      [showtime({ id: 'a', base_price: '120000.00' }), showtime({ id: 'b', base_price: '90000.00' })],
      BEFORE_ALL
    );
    expect(day.minPrice).toBe(90000);
  });

  it('lists each language of a cinema once', () => {
    const [day] = groupShowtimesByDay(
      [
        showtime({ id: 'a', language: '2D phụ đề' }),
        showtime({ id: 'b', language: '2D phụ đề' }),
        showtime({ id: 'c', language: null }),
        showtime({ id: 'd', language: '2D lồng tiếng' }),
      ],
      BEFORE_ALL
    );
    expect(day.cinemas[0].languages).toEqual(['2D phụ đề', '2D lồng tiếng']);
  });

  it('returns nothing for no showtimes', () => {
    expect(groupShowtimesByDay([], BEFORE_ALL)).toEqual([]);
  });
});

describe('day labels', () => {
  it('labels today and weekdays like the design', () => {
    expect(formatDayChip('2026-10-26', '2026-10-26')).toBe('26/10 · Hôm nay');
    expect(formatDayChip('2026-10-27', '2026-10-26')).toBe('27/10 · Thứ Ba');
  });

  it('formats the section heading date', () => {
    expect(formatDayHeading('2026-10-26')).toBe('Thứ Hai, 26/10/2026');
  });
});

describe('shortCinemaName', () => {
  it('drops the brand prefix for the booking button', () => {
    expect(shortCinemaName('CineGo Central')).toBe('Central');
    expect(shortCinemaName('Galaxy Nguyễn Du')).toBe('Galaxy Nguyễn Du');
  });
});
