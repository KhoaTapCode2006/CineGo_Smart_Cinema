// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShowtimePicker } from './ShowtimePicker';
import { useBookingStore } from '../../store/bookingStore';
import * as moviesHook from '../../hooks/useMovies';
import * as bookingApi from '../../api/booking';
import { Movie } from '../../types/movie';

vi.mock('../../hooks/useMovies', () => ({
  useShowtimes: vi.fn(),
  useCinemas: vi.fn(),
}));

vi.mock('../effects/ScrollReveal', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../api/booking', () => ({
  releaseHold: vi.fn().mockResolvedValue(undefined),
}));

const mockMovie: Movie = {
  id: 'mov-1',
  title: 'Avatar: The Way of Water',
  description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.',
  director: 'James Cameron',
  casts: 'Sam Worthington, Zoe Saldana',
  castList: ['Sam Worthington', 'Zoe Saldana'],
  genre: 'Action, Sci-Fi',
  durationMinutes: 192,
  durationFormatted: '3h 12m',
  language: 'Tiếng Anh',
  languageLabel: 'Tiếng Anh',
  ageRating: 'P',
  trailerUrl: 'https://example.com/trailer.mp4',
  trailerEmbedUrl: 'https://example.com/trailer.mp4',
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: 'https://example.com/backdrop.jpg',
  heroImageUrl: 'https://example.com/backdrop.jpg',
  status: 'now_showing',
};

const mockCinemas = [
  { id: 'cin-1', name: 'CineGo Landmark 81', address: 'B1 Landmark 81', city: 'Hồ Chí Minh', status: 'active' },
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowIso = tomorrow.toISOString();

const mockShowtimes = [
  {
    id: 'st-new-1',
    movie_id: 'mov-1',
    cinema_id: 'cin-1',
    cinema_name: 'CineGo Landmark 81',
    hall_id: 'hall-1',
    hall_name: 'Hall 1',
    start_at: tomorrowIso,
    end_at: tomorrowIso,
    base_price: 75000,
    language: 'Tiếng Anh',
    format: '2D',
    available_seats: 50,
    status: 'scheduled',
  },
];

describe('ShowtimePicker - Reset on New Showtime', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.matchMedia =
      window.matchMedia ||
      function () {
        return {
          matches: false,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      };

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useBookingStore.getState().reset();
    vi.clearAllMocks();

    (moviesHook.useShowtimes as any).mockReturnValue({
      data: mockShowtimes,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    (moviesHook.useCinemas as any).mockReturnValue({
      data: mockCinemas,
    });
  });

  it('resets bookingStore when user selects a NEW showtime, preventing stale seats/prices', async () => {
    // Populate store with old showtime, old seats (e.g. price 65000), and old holds
    useBookingStore.getState().setShowtime({
      id: 'st-old-previous',
      movieTitle: 'Old Movie',
      cinemaName: 'Old Cinema',
      hallName: 'Hall Old',
      startAt: '2026-11-20T10:00:00Z',
      basePrice: 65000,
    });
    useBookingStore.getState().setSelectedSeats([
      { id: 'old-seat-1', label: 'A1', price: 65000, seat_type: 'standard' },
    ]);
    useBookingStore.getState().setHolds(['old-hold-1'], '2026-11-20T10:05:00Z');

    expect(useBookingStore.getState().showtime?.id).toBe('st-old-previous');
    expect(useBookingStore.getState().selectedSeats).toHaveLength(1);
    expect(useBookingStore.getState().holdIds).toHaveLength(1);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/movies/mov-1']}>
          <Routes>
            <Route path="/movies/:id" element={<ShowtimePicker movie={mockMovie} />} />
            <Route path="/showtimes/:showtimeId/seats" element={<div>Seat Selection Mock</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click on the showtime option to select it
    const showtimeBtn = screen.getByRole('button', { name: /\d{1,2}:\d{2}/ });
    fireEvent.click(showtimeBtn);

    // Click "Book Tickets" button
    const bookBtn = screen.getByRole('button', { name: /Book Tickets/i });
    fireEvent.click(bookBtn);

    // Verify booking store was cleanly reset and updated for the new showtime
    const storeState = useBookingStore.getState();
    expect(storeState.showtime?.id).toBe('st-new-1');
    expect(storeState.showtime?.basePrice).toBe(75000);
    // Old seats and old holds MUST be gone
    expect(storeState.selectedSeats).toEqual([]);
    expect(storeState.holdIds).toEqual([]);

    // Old hold was released to prevent backend leak
    expect(bookingApi.releaseHold).toHaveBeenCalledWith('old-hold-1');

    await waitFor(() => {
      expect(screen.getByText('Seat Selection Mock')).toBeDefined();
    });
  });
});
