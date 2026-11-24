// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore, BookingShowtime, SelectedSeat } from './bookingStore';

const mockShowtime: BookingShowtime = {
  id: 'showtime-123',
  movieTitle: 'Interstellar',
  cinemaName: 'CineGo Landmark',
  hallName: 'Hall 1',
  startAt: '2026-11-25T19:00:00Z',
  basePrice: 85000,
};

const mockSeat1: SelectedSeat = {
  id: 'seat-1',
  label: 'A1',
  price: 85000,
  seat_type: 'standard',
};

const mockSeat2: SelectedSeat = {
  id: 'seat-2',
  label: 'A2',
  price: 85000,
  seat_type: 'standard',
};

describe('bookingStore', () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    window.sessionStorage.clear();
  });

  it('initializes with empty booking state', () => {
    const state = useBookingStore.getState();
    expect(state.showtime).toBeNull();
    expect(state.selectedSeats).toEqual([]);
    expect(state.holdIds).toEqual([]);
    expect(state.expiresAt).toBeNull();
  });

  it('sets showtime and resets previous seats', () => {
    useBookingStore.getState().toggleSeat(mockSeat1);
    expect(useBookingStore.getState().selectedSeats).toHaveLength(1);

    useBookingStore.getState().setShowtime(mockShowtime);

    const state = useBookingStore.getState();
    expect(state.showtime).toEqual(mockShowtime);
    expect(state.selectedSeats).toEqual([]);
  });

  it('toggles seat selection', () => {
    // Add seat 1
    useBookingStore.getState().toggleSeat(mockSeat1);
    expect(useBookingStore.getState().selectedSeats).toEqual([mockSeat1]);

    // Add seat 2
    useBookingStore.getState().toggleSeat(mockSeat2);
    expect(useBookingStore.getState().selectedSeats).toEqual([mockSeat1, mockSeat2]);

    // Remove seat 1
    useBookingStore.getState().toggleSeat(mockSeat1);
    expect(useBookingStore.getState().selectedSeats).toEqual([mockSeat2]);
  });

  it('enforces maximum 8 seats limit', () => {
    for (let i = 1; i <= 8; i++) {
      useBookingStore.getState().toggleSeat({
        id: `seat-${i}`,
        label: `A${i}`,
        price: 85000,
        seat_type: 'standard',
      });
    }

    expect(useBookingStore.getState().selectedSeats).toHaveLength(8);

    // Attempt to add 9th seat
    useBookingStore.getState().toggleSeat({
      id: 'seat-9',
      label: 'A9',
      price: 85000,
      seat_type: 'standard',
    });

    // Should still be capped at 8
    expect(useBookingStore.getState().selectedSeats).toHaveLength(8);
  });

  it('sets holdIds and expiresAt', () => {
    const holdIds = ['hold-1', 'hold-2'];
    const expiresAt = '2026-11-25T19:05:00Z';

    useBookingStore.getState().setHolds(holdIds, expiresAt);

    const state = useBookingStore.getState();
    expect(state.holdIds).toEqual(holdIds);
    expect(state.expiresAt).toBe(expiresAt);
  });

  it('resets entire state on reset()', () => {
    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().toggleSeat(mockSeat1);
    useBookingStore.getState().setHolds(['hold-1'], '2026-11-25T19:05:00Z');

    useBookingStore.getState().reset();

    const state = useBookingStore.getState();
    expect(state.showtime).toBeNull();
    expect(state.selectedSeats).toEqual([]);
    expect(state.holdIds).toEqual([]);
    expect(state.expiresAt).toBeNull();
  });
});
