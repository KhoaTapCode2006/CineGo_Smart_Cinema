import apiClient from './client';

export interface TicketItem {
  ticket_code: string;
  status: string;
  movie_title: string;
  cinema_name: string;
  hall_name: string;
  start_at: string;
  seat_label: string;
  qr_token: string;
  checked_in_at: string | null;
}

export async function getMyTickets(page = 1, pageSize = 50): Promise<TicketItem[]> {
  const { data } = await apiClient.get<TicketItem[]>('/tickets', {
    params: { page, page_size: pageSize },
  });
  return data || [];
}
