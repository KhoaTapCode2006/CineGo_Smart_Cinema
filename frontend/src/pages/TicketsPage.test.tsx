// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketsPage from './TicketsPage';
import * as ticketsApi from '../api/tickets';

vi.mock('../components/effects/AmbientEffects', () => ({ default: () => null }));
vi.mock('../components/layout/Navbar', () => ({ default: () => null }));
vi.mock('../components/layout/Footer', () => ({ default: () => null }));

vi.mock('../api/tickets', () => ({
  getMyTickets: vi.fn(),
  getTicketDetail: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement, initialEntry = '/tickets') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockTickets: ticketsApi.TicketItem[] = [
  {
    ticket_code: 'TK_ISSUED',
    status: 'issued',
    movie_title: 'Dune: Part Two',
    cinema_name: 'CineGo Landmark 81',
    hall_name: 'Hall 1',
    start_at: '2026-11-25T12:00:00Z', // 19:00 VN, Thứ 4, 25/11/2026
    seat_label: 'D5',
    qr_token: 'qr-token-issued-1234567890',
    checked_in_at: null,
    poster_url: 'https://image.tmdb.org/t/p/w500/dune.jpg',
  },
  {
    ticket_code: 'TK_CHECKED_IN',
    status: 'checked_in',
    movie_title: 'Lật Mặt 7',
    cinema_name: 'CineGo Thủ Đức',
    hall_name: 'Hall 2',
    start_at: '2026-11-24T10:00:00Z', // 17:00 VN, Thứ 3, 24/11/2026
    seat_label: 'F1',
    qr_token: 'qr-token-checked-1234567890',
    checked_in_at: '2026-11-24T09:45:00Z', // 16:45 VN
    poster_url: null,
  },
  {
    ticket_code: 'TK_EXPIRED',
    status: 'expired',
    movie_title: 'Deadpool 3',
    cinema_name: 'CineGo Landmark 81',
    hall_name: 'Hall 1',
    start_at: '2026-11-20T03:00:00Z', // 10:00 VN
    seat_label: 'A1',
    qr_token: 'qr-token-expired-1234567890',
    checked_in_at: null,
    poster_url: null,
  },
  {
    ticket_code: 'TK_CANCELLED',
    status: 'cancelled',
    movie_title: 'Kung Fu Panda 4',
    cinema_name: 'CineGo Thủ Đức',
    hall_name: 'Hall 2',
    start_at: '2026-11-21T06:30:00Z', // 13:30 VN
    seat_label: 'B3',
    qr_token: 'qr-token-cancelled-1234567890',
    checked_in_at: null,
    poster_url: null,
  },
];

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders EmptyState when user has no tickets', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce([]);

    renderWithClient(<TicketsPage />);

    expect(await screen.findByText('Chưa có vé nào')).toBeDefined();
    expect(screen.getByText('Khám phá phim')).toBeDefined();
  });

  it('renders all TicketOut fields with Vietnam timezone and Vietnamese status badges', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(mockTickets);

    renderWithClient(<TicketsPage />);

    // 1. ticket_code is NOT shown on the card
    await screen.findByText('Dune: Part Two');
    expect(screen.queryByText('TK_ISSUED')).toBeNull();
    expect(screen.queryByText('TK_CHECKED_IN')).toBeNull();

    // 2. movie_title
    expect(screen.getByText('Dune: Part Two')).toBeDefined();
    expect(screen.getByText('Lật Mặt 7')).toBeDefined();

    // 3 & 4. cinema_name & hall_name ("Tên rạp - Phòng")
    expect(screen.getAllByText(/CineGo Landmark 81 - Hall 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CineGo Thủ Đức - Hall 2/).length).toBeGreaterThan(0);

    // 5. start_at in Vietnam timezone (HH:mm & Thứ X, DD/MM/YYYY)
    expect(screen.getByText('19:00')).toBeDefined();
    expect(screen.getByText(/Thứ 4, 25\/11\/2026/)).toBeDefined();
    expect(screen.getByText('17:00')).toBeDefined();
    expect(screen.getByText(/Thứ 3, 24\/11\/2026/)).toBeDefined();

    // 6. seat_label
    expect(screen.getByText('D5')).toBeDefined();
    expect(screen.getByText('F1')).toBeDefined();

    // 7. status badges in Vietnamese
    expect(screen.getByText('Đã phát hành')).toBeDefined();
    expect(screen.getByText('Đã check-in')).toBeDefined();
    expect(screen.getByText('Hết hạn')).toBeDefined();
    expect(screen.getByText('Đã hủy')).toBeDefined();

    // 8. checked_in_at
    expect(screen.getByText(/Đã check-in: 24\/11\/2026 16:45/)).toBeDefined();
  });

  it('sorts upcoming tickets first (sắp chiếu lên trước)', async () => {
    // Ticket 1: 3 days in future
    // Ticket 2: 1 day in future (soonest upcoming)
    // Ticket 3: in the past
    const unsortedTickets: ticketsApi.TicketItem[] = [
      {
        ticket_code: 'TK_FUTURE_LATER',
        status: 'issued',
        movie_title: 'Movie Later',
        cinema_name: 'Cinema A',
        hall_name: 'Hall 1',
        start_at: '2026-11-28T12:00:00Z',
        seat_label: 'A1',
        qr_token: 'token-later',
        checked_in_at: null,
      },
      {
        ticket_code: 'TK_PAST',
        status: 'expired',
        movie_title: 'Movie Past',
        cinema_name: 'Cinema A',
        hall_name: 'Hall 1',
        start_at: '2026-11-20T12:00:00Z',
        seat_label: 'A2',
        qr_token: 'token-past',
        checked_in_at: null,
      },
      {
        ticket_code: 'TK_FUTURE_SOONEST',
        status: 'issued',
        movie_title: 'Movie Soonest',
        cinema_name: 'Cinema A',
        hall_name: 'Hall 1',
        start_at: '2026-11-25T12:00:00Z',
        seat_label: 'A3',
        qr_token: 'token-soon',
        checked_in_at: null,
      },
    ];

    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(unsortedTickets);

    renderWithClient(<TicketsPage />);

    await screen.findByText('Movie Soonest');

    // Check DOM order of cards by movie title heading
    const titles = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(titles).toEqual(['Movie Soonest', 'Movie Later', 'Movie Past']);
  });

  it('highlights tickets specified in ?new= query parameter', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(mockTickets);

    renderWithClient(<TicketsPage />, '/tickets?new=TK_ISSUED');

    await screen.findByText('Dune: Part Two');

    // Success alert banner is displayed
    expect(screen.getByText('Đặt vé thành công!')).toBeDefined();

    // "✨ Mới" badge is displayed for the matching ticket
    expect(screen.getByText('✨ Mới')).toBeDefined();
  });

  it('opens detail modal, calls GET /tickets/{ticket_code}, and displays large QR code with qr_token and ticket_code', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(mockTickets);

    const detailedTicket: ticketsApi.TicketItem = {
      ...mockTickets[0],
      qr_token: 'fresh-qr-token-from-get-ticket-detail',
    };
    vi.mocked(ticketsApi.getTicketDetail).mockResolvedValueOnce(detailedTicket);

    renderWithClient(<TicketsPage />);

    await screen.findByText('Dune: Part Two');

    // Click "Xem QR" button for TK_ISSUED
    const qrButtons = screen.getAllByRole('button', { name: /xem qr/i });
    fireEvent.click(qrButtons[0]);

    // Modal dialog is opened
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(screen.getByText('Chi tiết vé điện tử')).toBeDefined();

    // Verify GET /tickets/TK_ISSUED was called
    await waitFor(() => {
      expect(ticketsApi.getTicketDetail).toHaveBeenCalledWith('TK_ISSUED');
    });

    // Verify ticket_code is displayed in the modal
    expect(await screen.findByText('TK_ISSUED')).toBeDefined();

    // Verify QR token is displayed in modal
    expect(await screen.findByText('fresh-qr-token-from-get-ticket-detail')).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /đóng modal qr/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('renders poster image when poster_url is provided, and fallback when poster_url is null', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(mockTickets);

    renderWithClient(<TicketsPage />);

    const poster = await screen.findByAltText('Dune: Part Two');
    expect(poster.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w500/dune.jpg');

    // Fallback block for ticket without poster
    expect(screen.getAllByText('CineGo').length).toBeGreaterThan(0);
  });
});
