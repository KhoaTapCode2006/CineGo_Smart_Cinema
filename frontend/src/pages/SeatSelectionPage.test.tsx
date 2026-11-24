// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SeatSelectionPage from './SeatSelectionPage';
import CheckoutPage from './CheckoutPage';
import { useBookingStore } from '../store/bookingStore';
import * as bookingApi from '../api/booking';
import * as ordersApi from '../api/orders';

vi.mock('../components/effects/AmbientEffects', () => ({ default: () => null }));
vi.mock('../components/layout/Navbar', () => ({ default: () => null }));
vi.mock('../components/layout/Footer', () => ({ default: () => null }));

vi.mock('../api/booking', () => ({
  getSeatMap: vi.fn(),
  createSocketTicket: vi.fn(),
  smartSeat: vi.fn(),
  holdSeats: vi.fn(),
  releaseHold: vi.fn(),
}));

vi.mock('../api/orders', () => ({
  listFood: vi.fn().mockResolvedValue([]),
  createOrder: vi.fn(),
  cancelOrder: vi.fn(),
  payOrder: vi.fn(),
}));

class MockWebSocket {
  onopen: any = null;
  onmessage: any = null;
  onclose: any = null;
  onerror: any = null;
  close() {}
  send() {}
}
(global as any).WebSocket = MockWebSocket;

const mockShowtime = {
  id: 'st-101',
  movieTitle: 'Interstellar',
  cinemaName: 'CineGo Landmark 81',
  hallName: 'Hall 1',
  startAt: '2026-11-25T19:00:00Z',
  basePrice: 85000,
};

const mockSeatMap = {
  showtime_id: 'st-101',
  hold_expires_in_minutes: 5,
  seats: [
    { id: 's-1', row_label: 'A', seat_number: 1, seat_type: 'standard', price: 85000, status: 'available' },
    { id: 's-2', row_label: 'A', seat_number: 2, seat_type: 'standard', price: 85000, status: 'available' },
    { id: 's-3', row_label: 'A', seat_number: 3, seat_type: 'standard', price: 85000, status: 'available' },
  ],
};

describe('SeatSelectionPage - Hold Lifecycle & Bug Fix', () => {
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
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useBookingStore.getState().reset();
    window.sessionStorage.clear();
    vi.clearAllMocks();

    (bookingApi.getSeatMap as any).mockResolvedValue(mockSeatMap);
    (bookingApi.createSocketTicket as any).mockResolvedValue({
      ticket: 'mock-socket-ticket',
      expires_at: new Date(Date.now() + 30000).toISOString(),
    });
    (bookingApi.releaseHold as any).mockResolvedValue(undefined);
    (ordersApi.listFood as any).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('Bug regression test: holding seats and proceeding to checkout does NOT delete seat-holds', async () => {
    (bookingApi.holdSeats as any).mockResolvedValue({
      hold_ids: ['new-hold-1', 'new-hold-2'],
      seat_ids: ['s-1', 's-2'],
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    useBookingStore.getState().setShowtime(mockShowtime);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/showtimes/st-101/seats']}>
          <Routes>
            <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPage />} />
            <Route path="/checkout" element={<div>Checkout Page Mock</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for seat map to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seat A1/i })).toBeDefined();
    });

    // Select seat A1 and A2
    const seatA1 = screen.getByRole('button', { name: /Seat A1/i });
    const seatA2 = screen.getByRole('button', { name: /Seat A2/i });
    fireEvent.click(seatA1);
    fireEvent.click(seatA2);

    expect(useBookingStore.getState().selectedSeats).toHaveLength(2);

    // Click Proceed / Tiếp tục
    const proceedBtn = screen.getByRole('button', { name: /Tiếp tục/i });
    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(bookingApi.holdSeats).toHaveBeenCalledWith('st-101', ['s-1', 's-2']);
    });

    // CRITICAL BUG VERIFICATION:
    // releaseHold must NOT be called when holdIds changes during the session!
    expect(bookingApi.releaseHold).not.toHaveBeenCalled();

    // holdIds must remain in the store for checkout
    const storeState = useBookingStore.getState();
    expect(storeState.holdIds).toEqual(['new-hold-1', 'new-hold-2']);

    // Navigation to checkout succeeded
    await waitFor(() => {
      expect(screen.getByText('Checkout Page Mock')).toBeDefined();
    });
  });

  it('Back from checkout test: mounting with existing holds releases old holds to avoid self-conflict', async () => {
    // Simulate user having holds in store from a previous checkout visit
    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats([
      { id: 's-1', label: 'A1', price: 85000, seat_type: 'standard' },
    ]);
    useBookingStore.getState().setHolds(
      ['prev-hold-1', 'prev-hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    expect(useBookingStore.getState().holdIds).toHaveLength(2);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/showtimes/st-101/seats']}>
          <Routes>
            <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // On mount, it should have released the previous holds
    await waitFor(() => {
      expect(bookingApi.releaseHold).toHaveBeenCalledWith('prev-hold-1');
      expect(bookingApi.releaseHold).toHaveBeenCalledWith('prev-hold-2');
    });

    // The store's holdIds should now be cleared
    expect(useBookingStore.getState().holdIds).toEqual([]);
  });

  it('Integration test: chọn ghế → Tiếp tục → sang Checkout thì holdIds khác rỗng, giá đúng, nút Xác nhận đơn bật; không có releaseHold', async () => {
    (bookingApi.holdSeats as any).mockResolvedValue({
      hold_ids: ['hold-xyz-456'],
      seat_ids: ['s-1'],
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    // Start with showtime st-101
    useBookingStore.getState().setShowtime(mockShowtime);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/showtimes/st-101/seats']}>
          <Routes>
            <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Wait for seat map to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seat A1/i })).toBeDefined();
    });

    // 2. Select seat A1 (seat price 85000 in mockSeatMap)
    const seatA1 = screen.getByRole('button', { name: /Seat A1/i });
    fireEvent.click(seatA1);

    // 3. Click Proceed / Tiếp tục
    const proceedBtn = screen.getByRole('button', { name: /Tiếp tục/i });
    fireEvent.click(proceedBtn);

    // 4. Verify arrival at CheckoutPage
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận đơn đặt vé/i)).toBeDefined();
    });

    // 5. Verify holdIds is NOT empty in store
    const storeState = useBookingStore.getState();
    expect(storeState.holdIds).toEqual(['hold-xyz-456']);
    expect(storeState.holdIds.length).toBeGreaterThan(0);

    // 6. Verify seat price matches current seat map (85,000đ, not stale)
    expect(storeState.selectedSeats).toHaveLength(1);
    expect(storeState.selectedSeats[0].price).toBe(85000);
    expect(screen.getAllByText('85.000 ₫').length).toBeGreaterThan(0);

    // 7. Verify "Xác nhận đơn hàng" button is ENABLED
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đơn hàng/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    expect(screen.queryByTestId('confirm-disabled-reason')).toBeNull();

    // 8. Verify releaseHold was NEVER called during this flow
    expect(bookingApi.releaseHold).not.toHaveBeenCalled();
  });
});
