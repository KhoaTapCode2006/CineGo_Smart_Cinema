// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from './CheckoutPage';
import { useBookingStore } from '../store/bookingStore';
import * as ordersApi from '../api/orders';

vi.mock('../components/effects/AmbientEffects', () => ({ default: () => null }));
vi.mock('../components/layout/Navbar', () => ({ default: () => null }));
vi.mock('../components/layout/Footer', () => ({ default: () => null }));

vi.mock('../api/orders', () => ({
  listFood: vi.fn(),
  createOrder: vi.fn(),
  cancelOrder: vi.fn(),
  payOrder: vi.fn(),
}));

const mockShowtime = {
  id: 'showtime-101',
  movieTitle: 'Inception',
  cinemaName: 'CineGo Landmark 81',
  hallName: 'Hall 1',
  startAt: '2026-11-25T19:00:00Z',
  basePrice: 85000,
};

const mockSeats = [
  { id: 'seat-1', label: 'D5', price: 105000, seat_type: 'vip' },
  { id: 'seat-2', label: 'D6', price: 105000, seat_type: 'vip' },
];

describe('CheckoutPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useBookingStore.getState().reset();
    window.sessionStorage.clear();
    vi.clearAllMocks();

    window.matchMedia =
      window.matchMedia ||
      vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects to home if holdIds is empty after hydration', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Home Page')).toBeDefined();
  });

  it('renders checkout summary when holdIds and showtime exist', async () => {
    (ordersApi.listFood as any).mockResolvedValue([
      { id: 'food-1', name: 'Bắp rang bơ M', category: 'Bắp', price: 45000, image_url: null },
      { id: 'food-2', name: 'Coca-Cola L', category: 'Nước', price: 35000, image_url: null },
    ]);

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Inception')).toBeDefined();
    expect(screen.getByText('Ghế D5')).toBeDefined();
    expect(screen.getByText('Ghế D6')).toBeDefined();
    expect(screen.getByText(/Thời gian giữ ghế còn:/)).toBeDefined();

    // Food items load
    await waitFor(() => {
      expect(screen.getByText('Bắp rang bơ M')).toBeDefined();
      expect(screen.getByText('Coca-Cola L')).toBeDefined();
    });
  });

  it('button "Xác nhận đơn" is ENABLED even without food, without voucher, and while food is loading or errored', async () => {
    // Simulate pending food query
    (ordersApi.listFood as any).mockImplementation(() => new Promise(() => {}));

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Button must be enabled!
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đơn hàng/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    expect(screen.queryByTestId('confirm-disabled-reason')).toBeNull();
  });

  it('button is DISABLED with explanation when seat hold is expired without redirecting to home', async () => {
    (ordersApi.listFood as any).mockResolvedValue([]);

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    // Expired in past
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() - 10000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đơn hàng/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    const reasonEl = screen.getByTestId('confirm-disabled-reason');
    expect(reasonEl.textContent).toContain('Thời gian giữ ghế đã hết hạn. Vui lòng quay lại chọn ghế.');
  });

  it('displays ErrorState when GET /food fails and allows retry without disabling confirm button', async () => {
    (ordersApi.listFood as any).mockRejectedValue(new Error('Network error'));

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Không thể tải danh sách bắp nước')).toBeDefined();
      expect(screen.getByRole('button', { name: /Tải lại bắp nước/i })).toBeDefined();
    });

    // Confirm button must remain enabled despite food error
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đơn hàng/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);

    // Clicking retry calls listFood again
    (ordersApi.listFood as any).mockResolvedValue([
      { id: 'food-1', name: 'Bắp rang bơ M', category: 'Bắp', price: 45000, image_url: null },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Tải lại bắp nước/i }));

    await waitFor(() => {
      expect(screen.getByText('Bắp rang bơ M')).toBeDefined();
    });
  });

  it('displays "Hiện chưa có bắp nước" when GET /food returns empty array', async () => {
    (ordersApi.listFood as any).mockResolvedValue([]);

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Hiện chưa có bắp nước')).toBeDefined();
    });
  });

  it('handles voucher invalid error 422 cleanly without crashing', async () => {
    (ordersApi.listFood as any).mockResolvedValue([]);
    (ordersApi.createOrder as any).mockRejectedValue({
      response: {
        status: 422,
        data: { detail: 'Voucher is invalid or not applicable' },
      },
    });

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Enter invalid voucher
    const voucherInput = screen.getByPlaceholderText(/VD: CINEGO10/i);
    fireEvent.change(voucherInput, { target: { value: 'EXPIRED' } });

    // Click Confirm Order
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đơn hàng/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng/i)
      ).toBeDefined();
    });
  });

  it('confirms order, disables confirm button with reason, locks editing, and enables payment', async () => {
    (ordersApi.listFood as any).mockResolvedValue([]);
    (ordersApi.createOrder as any).mockResolvedValue({
      id: 'order-123',
      order_code: 'CG12345678',
      showtime_id: mockShowtime.id,
      subtotal: 210000,
      discount: 20000,
      total: 190000,
      payment_status: 'pending',
      order_status: 'pending_payment',
      created_at: new Date().toISOString(),
      items: [],
      seat_ids: ['seat-1', 'seat-2'],
    });

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đơn hàng/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/CG12345678/)).toBeDefined();
      expect(screen.getByText('Chọn phương thức thanh toán')).toBeDefined();
      expect(screen.getByRole('button', { name: /Thanh toán/i })).toBeDefined();

      // Confirm button is now disabled with reason
      const disabledConfirmBtn = screen.getByRole('button', { name: /Đã xác nhận đơn hàng/i }) as HTMLButtonElement;
      expect(disabledConfirmBtn.disabled).toBe(true);

      const reasonEl = screen.getByTestId('confirm-disabled-reason');
      expect(reasonEl.textContent).toContain('Đơn hàng đã được xác nhận thành công.');
    });
  });

  it('executes successful payment and navigates to tickets with query param', async () => {
    (ordersApi.listFood as any).mockResolvedValue([]);
    (ordersApi.createOrder as any).mockResolvedValue({
      id: 'order-123',
      order_code: 'CG12345678',
      showtime_id: mockShowtime.id,
      subtotal: 210000,
      discount: 0,
      total: 210000,
      payment_status: 'pending',
      order_status: 'pending_payment',
      created_at: new Date().toISOString(),
      items: [],
      seat_ids: ['seat-1', 'seat-2'],
    });
    (ordersApi.payOrder as any).mockResolvedValue({
      payment_id: 'pay-123',
      order_id: 'order-123',
      status: 'succeeded',
      amount: 210000,
      ticket_codes: ['TK123', 'TK124'],
      qr_tokens: ['qr1', 'qr2'],
    });

    useBookingStore.getState().setShowtime(mockShowtime);
    useBookingStore.getState().setSelectedSeats(mockSeats);
    useBookingStore.getState().setHolds(
      ['hold-1', 'hold-2'],
      new Date(Date.now() + 5 * 60 * 1000).toISOString()
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/tickets" element={<div>My Tickets Page</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Confirm order
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đơn hàng/i }));

    // Wait for pay button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thanh toán/i })).toBeDefined();
    });

    // Click pay
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán/i }));

    await waitFor(() => {
      expect(screen.getByText('My Tickets Page')).toBeDefined();
    });

    // Booking store should be reset
    expect(useBookingStore.getState().holdIds).toEqual([]);
    expect(useBookingStore.getState().showtime).toBeNull();
  });
});
