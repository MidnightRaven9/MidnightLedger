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

/**
 * Single tax calculation logic
 */
export function calcNet(gross: number, taxPercent: number): number {
  if (isNaN(gross) || gross < 0) return 0;
  if (isNaN(taxPercent) || taxPercent < 0) return gross;
  return Math.round(gross * (1 - taxPercent / 100));
}


