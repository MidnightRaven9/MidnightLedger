import { Bill } from '../types';

/**
 * Monetary amounts are USD dollars stored as JavaScript numbers. Derived
 * amounts are rounded to whole cents at the point of calculation with
 * half-away-from-zero semantics. Stored values are never rewritten by these
 * helpers, so this policy requires no data migration.
 */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (Math.abs(value) > 1e12) return value;
  const sign = value < 0 ? -1 : 1;
  const shifted = Number(`${Math.abs(value)}e2`);
  return sign * Number(`${Math.round(shifted)}e-2`);
}

/** Share of a bill owed by the user, rounded to cents. */
export function getMyShare(bill: Partial<Bill>): number {
  if (!bill) return 0;
  const share = bill.myShare !== undefined ? bill.myShare : (bill.amount || 0);
  if (bill.isSplit) {
    const full = bill.fullTotal !== undefined ? bill.fullTotal : share;
    const ways = bill.splitWays || bill.splitCount || 2;
    if (!Number.isFinite(ways) || ways <= 0) return roundCents(share);
    return roundCents(full / ways);
  }
  return roundCents(share);
}

/** Full bill amount before splitting, rounded to cents. */
export function getFullTotal(bill: Partial<Bill>): number {
  if (!bill) return 0;
  const share = bill.myShare !== undefined ? bill.myShare : (bill.amount || 0);
  return bill.isSplit ? roundCents(bill.fullTotal !== undefined ? bill.fullTotal : share) : roundCents(share);
}

/** Net pay after a percentage tax estimate, rounded to cents. */
export function calcNet(gross: number, taxPercent: number): number {
  if (!Number.isFinite(gross) || gross < 0) return 0;
  if (!Number.isFinite(taxPercent) || taxPercent < 0) return roundCents(gross);
  if (taxPercent >= 100) return 0;
  return roundCents(gross * (1 - taxPercent / 100));
}
