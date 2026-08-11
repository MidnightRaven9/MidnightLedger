import { Bill } from '../types';

/**
 * Single source of truth for bill splitting math
 */
export function getMyShare(bill: Partial<Bill>): number {
  if (!bill) return 0;
  const share = bill.myShare !== undefined ? bill.myShare : (bill.amount || 0);
  if (bill.isSplit) {
    const full = bill.fullTotal !== undefined ? bill.fullTotal : share;
    const ways = bill.splitWays || bill.splitCount || 2;
    return full / ways;
  }
  return share;
}

export function getFullTotal(bill: Partial<Bill>): number {
  if (!bill) return 0;
  const share = bill.myShare !== undefined ? bill.myShare : (bill.amount || 0);
  return bill.isSplit ? (bill.fullTotal !== undefined ? bill.fullTotal : share) : share;
}

export function calcMyShare(bill: Partial<Bill>): number {
  return getMyShare(bill);
}

/**
 * Single tax calculation logic
 */
export function calcNet(gross: number, taxPercent: number): number {
  if (isNaN(gross) || gross < 0) return 0;
  if (isNaN(taxPercent) || taxPercent < 0) return gross;
  return Math.round(gross * (1 - taxPercent / 100));
}

export function calcTaxAmount(gross: number, taxPercent: number): number {
  if (isNaN(gross) || gross < 0) return 0;
  return gross - calcNet(gross, taxPercent);
}

export function calcNetFromGross(gross: number, taxPercent: number): number {
  return calcNet(gross, taxPercent);
}

/**
 * Sum total amount of bills depending on viewMode (myShare vs fullTotal)
 */
export function calcTotals(bills: Partial<Bill>[], viewMode: 'myShare' | 'fullTotal'): number {
  return bills.reduce((sum, b) => {
    if (viewMode === 'myShare') {
      return sum + getMyShare(b);
    } else {
      return sum + getFullTotal(b);
    }
  }, 0);
}
