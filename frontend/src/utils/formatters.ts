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

/**
 * Format an ISO date string to Vietnam timezone (Asia/Ho_Chi_Minh) format "DD/MM/YYYY HH:mm".
 * Example: "25/11/2026 19:00"
 */
export function formatVietnamDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}`;
  } catch {
    return String(isoString);
  }
}

