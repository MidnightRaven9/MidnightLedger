/**
 * Helper utility functions for handling YYYY-MM-DD dates without timezone skew
 */

export function parseISODate(dateStr: string | any): Date {
  if (typeof dateStr !== 'string') {
    dateStr = String(dateStr || '');
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(isNaN(year) ? 2026 : year, (isNaN(month) ? 1 : month) - 1, isNaN(day) ? 1 : day, 12, 0, 0); // Noon prevents timezone rollbacks
}

export function toISODateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDate(dateStr: string, formatStyle: 'short' | 'medium' | 'long' | 'dayAndMonth' = 'medium'): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  
  if (formatStyle === 'short') {
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  }
  
  if (formatStyle === 'dayAndMonth') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (formatStyle === 'long') {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Medium default: "Aug 15, 2026"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatMonthName(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long' });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseISODate(dateStr);
  date.setDate(date.getDate() + days);
  return toISODateString(date);
}

export function getDaysInMonth(year: number, monthZeroBased: number): number {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

/**
 * Returns the ordinal string for a day number (e.g. 1 -> "1st", 15 -> "15th", 22 -> "22nd")
 */
export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:  return `${day}st`;
    case 2:  return `${day}nd`;
    case 3:  return `${day}rd`;
    default: return `${day}th`;
  }
}

/**
 * Compare two ISO date strings chronologically
 */
export function compareDates(aStr: string, bStr: string): number {
  return aStr.localeCompare(bStr);
}

/**
 * Check if a target date is within range [startInclusive, endExclusive)
 */
export function isDateInRange(targetDateStr: string, startDateStr: string, endDateStr: string): boolean {
  return targetDateStr >= startDateStr && targetDateStr < endDateStr;
}
