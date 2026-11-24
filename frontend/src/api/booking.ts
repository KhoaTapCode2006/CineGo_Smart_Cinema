import apiClient from './client';

export interface SeatItem {
  id: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number;
  status: 'available' | 'held' | 'sold';
}

export interface SeatMapResponse {
  showtime_id: string;
  hold_expires_in_minutes: number;
  seats: SeatItem[];
}

export interface SocketTicketResponse {
  ticket: string;
  expires_at: string;
}

export interface SmartSeatParams {
  count: number;
  together?: boolean;
  preferred_zone?: 'front' | 'middle' | 'back' | null;
}

export interface SmartSeatResponse {
  recommendations: string[][];
  seats_together: boolean;
}

export interface HoldSeatsResponse {
  hold_ids: string[];
  seat_ids: string[];
  expires_at: string;
}

/**
 * Fetch seat map for a showtime.
 * Endpoint: GET /api/v1/showtimes/:showtimeId/seats
 */
export async function getSeatMap(showtimeId: string): Promise<SeatMapResponse> {
  const { data } = await apiClient.get<SeatMapResponse>(`/showtimes/${showtimeId}/seats`);
  return {
    ...data,
    seats: (data.seats || []).map((seat) => ({
      ...seat,
      price: Number(seat.price),
    })),
  };
}

/**
 * Create a one-use 30-second ticket for WebSocket live seat updates.
 * Endpoint: POST /api/v1/auth/socket-ticket
 */
export async function createSocketTicket(): Promise<SocketTicketResponse> {
  const { data } = await apiClient.post<SocketTicketResponse>('/auth/socket-ticket');
  return data;
}

/**
 * Request smart seat recommendations.
 * Endpoint: POST /api/v1/showtimes/:showtimeId/smart-seat
 */
export async function smartSeat(
  showtimeId: string,
  params: SmartSeatParams
): Promise<SmartSeatResponse> {
  const { data } = await apiClient.post<SmartSeatResponse>(
    `/showtimes/${showtimeId}/smart-seat`,
    {
      count: params.count,
      together: params.together ?? true,
      preferred_zone: params.preferred_zone || null,
    }
  );
  return data;
}

/**
 * Atomically hold selected seats for 5 minutes.
 * Endpoint: POST /api/v1/showtimes/:showtimeId/seat-holds
 */
export async function holdSeats(
  showtimeId: string,
  seatIds: string[]
): Promise<HoldSeatsResponse> {
  const { data } = await apiClient.post<HoldSeatsResponse>(
    `/showtimes/${showtimeId}/seat-holds`,
    {
      seat_ids: seatIds,
    }
  );
  return data;
}

/**
 * Release a single seat hold.
 * Endpoint: DELETE /api/v1/seat-holds/:holdId
 */
export async function releaseHold(holdId: string): Promise<void> {
  await apiClient.delete(`/seat-holds/${holdId}`);
}
