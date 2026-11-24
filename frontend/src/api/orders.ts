import apiClient from './client';

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
}

export interface FoodQuantity {
  food_item_id: string;
  quantity: number;
}

export interface OrderCreatePayload {
  showtime_id: string;
  seat_ids: string[];
  food_items?: FoodQuantity[];
  voucher_code?: string;
}

export interface OrderItemResponse {
  id: string;
  item_type: string;
  ref_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface OrderResponse {
  id: string;
  order_code: string;
  showtime_id: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: 'pending_payment' | 'confirmed' | 'cancelled' | 'expired';
  created_at: string;
  items: OrderItemResponse[];
  seat_ids: string[];
}

export interface PaymentPayload {
  idempotency_key: string;
  payment_method: 'mock_card' | 'mock_wallet' | 'mock_cash';
  simulated_result: 'succeeded' | 'failed';
}

export interface PaymentResponse {
  payment_id: string;
  order_id: string;
  status: 'succeeded' | 'failed';
  amount: number;
  ticket_codes: string[];
  qr_tokens: string[];
}

/**
 * Fetch available concessions (food & drinks).
 * Endpoint: GET /api/v1/food
 */
export async function listFood(): Promise<FoodItem[]> {
  const { data } = await apiClient.get<FoodItem[]>('/food');
  return (data || []).map((item) => ({
    ...item,
    price: Number(item.price),
  }));
}

/**
 * Create a new order with held seats, optional food items, and voucher.
 * Endpoint: POST /api/v1/orders
 */
export async function createOrder(payload: OrderCreatePayload): Promise<OrderResponse> {
  const body: Record<string, unknown> = {
    showtime_id: payload.showtime_id,
    seat_ids: payload.seat_ids,
    food_items: payload.food_items || [],
  };
  if (payload.voucher_code) {
    body.voucher_code = payload.voucher_code;
  }

  const { data } = await apiClient.post<OrderResponse>('/orders', body);
  return {
    ...data,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    total: Number(data.total),
  };
}

/**
 * Retrieve an existing order by ID.
 * Endpoint: GET /api/v1/orders/:orderId
 */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  const { data } = await apiClient.get<OrderResponse>(`/orders/${orderId}`);
  return {
    ...data,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    total: Number(data.total),
  };
}

/**
 * Cancel a pending order and release associated seats.
 * Endpoint: DELETE /api/v1/orders/:orderId
 */
export async function cancelOrder(orderId: string): Promise<void> {
  await apiClient.delete(`/orders/${orderId}`);
}

/**
 * Process payment simulation for an order.
 * Endpoint: POST /api/v1/orders/:orderId/payments
 */
export async function payOrder(
  orderId: string,
  payload: PaymentPayload
): Promise<PaymentResponse> {
  const { data } = await apiClient.post<PaymentResponse>(`/orders/${orderId}/payments`, payload);
  return {
    ...data,
    amount: Number(data.amount),
  };
}
