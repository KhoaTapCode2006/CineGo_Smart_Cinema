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
    start_at: '2026-11-25T12:00:00Z', // 19:00 VN
    seat_label: 'D5',
    qr_token: 'qr-token-issued-1234567890',
    checked_in_at: null,
  },
  {
    ticket_code: 'TK_CHECKED_IN',
    status: 'checked_in',
    movie_title: 'Lật Mặt 7',
    cinema_name: 'CineGo Thủ Đức',
    hall_name: 'Hall 2',
    start_at: '2026-11-24T10:00:00Z', // 17:00 VN
    seat_label: 'F1',
    qr_token: 'qr-token-checked-1234567890',
    checked_in_at: '2026-11-24T09:45:00Z', // 16:45 VN
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

    // 1. ticket_code
    expect(await screen.findByText('TK_ISSUED')).toBeDefined();
    expect(screen.getByText('TK_CHECKED_IN')).toBeDefined();
    expect(screen.getByText('TK_EXPIRED')).toBeDefined();
    expect(screen.getByText('TK_CANCELLED')).toBeDefined();

    // 2. movie_title
    expect(screen.getByText('Dune: Part Two')).toBeDefined();
    expect(screen.getByText('Lật Mặt 7')).toBeDefined();

    // 3 & 4. cinema_name & hall_name
    expect(screen.getAllByText(/CineGo Landmark 81 · Hall 1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CineGo Thủ Đức · Hall 2/).length).toBeGreaterThan(0);

    // 5. start_at in Vietnam timezone (25/11/2026 19:00 for 12:00:00Z)
    expect(screen.getByText('25/11/2026 19:00')).toBeDefined();
    expect(screen.getByText('24/11/2026 17:00')).toBeDefined();

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

    await screen.findByText('TK_FUTURE_SOONEST');

    // Check DOM order of cards
    const codes = screen.getAllByText(/^TK_/).map((el) => el.textContent);
    expect(codes).toEqual(['TK_FUTURE_SOONEST', 'TK_FUTURE_LATER', 'TK_PAST']);
  });

  it('highlights tickets specified in ?new= query parameter', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(mockTickets);

    renderWithClient(<TicketsPage />, '/tickets?new=TK_ISSUED');

    await screen.findByText('TK_ISSUED');

    // Success alert banner is displayed
    expect(screen.getByText('Đặt vé thành công!')).toBeDefined();

    // "✨ Mới" badge is displayed for the matching ticket
    expect(screen.getByText('✨ Mới')).toBeDefined();
  });

  it('opens detail modal, calls GET /tickets/{ticket_code}, and displays large QR code with qr_token', async () => {
    vi.mocked(ticketsApi.getMyTickets).mockResolvedValueOnce(mockTickets);

    const detailedTicket: ticketsApi.TicketItem = {
      ...mockTickets[0],
      qr_token: 'fresh-qr-token-from-get-ticket-detail',
    };
    vi.mocked(ticketsApi.getTicketDetail).mockResolvedValueOnce(detailedTicket);

    renderWithClient(<TicketsPage />);

    await screen.findByText('TK_ISSUED');

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

    // Verify QR token is displayed in modal
    expect(await screen.findByText('fresh-qr-token-from-get-ticket-detail')).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /đóng modal qr/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
