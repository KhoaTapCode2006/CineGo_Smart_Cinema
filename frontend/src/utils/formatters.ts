/**
 * Format decimal or string price to Vietnamese Dong (VND).
 */
export function formatCurrencyVND(amount: number | string | null | undefined): string {
  if (amount == null) return '0 ₫';
  const numeric = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Format a price in the compact style of the booking screens, e.g. "90.000đ".
 */
export function formatPriceVND(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

/**
 * Format an ISO date string to readable localized date.
 */
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date string to time only (e.g., "19:30").
 */
export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
}
