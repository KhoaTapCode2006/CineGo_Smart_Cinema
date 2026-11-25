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
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO date string to time only (e.g., "19:30") in Vietnam timezone.
 */
export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
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

/**
 * Format an ISO date string into Vietnam time (HH:mm) and localized ticket date ("Thứ X, DD/MM/YYYY").
 */
export function formatVietnamTicketDate(isoString: string | null | undefined): { time: string; date: string } {
  if (!isoString) return { time: '', date: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { time: '', date: String(isoString) };

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

    const vnLocaleString = d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnLocaleString);
    const dayOfWeek = vnDate.getDay();
    const viWeekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const weekdayName = viWeekdays[dayOfWeek];

    return {
      time: `${map.hour}:${map.minute}`,
      date: `${weekdayName}, ${map.day}/${map.month}/${map.year}`,
    };
  } catch {
    return { time: '', date: String(isoString) };
  }
}


