import { Bill } from '../types';
import { roundCents } from '../../money';

export { roundCents } from '../../money';

function finiteMoney(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? roundCents(value) : null;
}

function splitWays(bill: Partial<Bill>): number | null {
  const raw = bill.splitWays ?? bill.splitCount ?? 2;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 1) return null;
  return Math.floor(raw);
}

function boundedShare(value: number, fullTotal: number): number {
  const rounded = roundCents(value);
  const ceiling = Math.max(0, roundCents(fullTotal));
  return Math.min(Math.max(rounded, 0), ceiling);
}

function percentageShare(bill: Partial<Bill>, fullTotal: number): number | null {
  const percent = finiteMoney(bill.mySharePercentage);
  if (percent === null || bill.splitType === 'even') return null;
  return boundedShare(roundCents((fullTotal * Math.min(100, Math.max(0, percent))) / 100), fullTotal);
}

/**
 * Share of a bill owed by the user.
 *
 * Explicit custom amounts always win. Percentage splits use the stored
 * percentage. Even splits recompute from the full total and split count, so a
 * stale stored `myShare` cannot corrupt an even allocation. Legacy records
 * without `splitType` that stored a share different from the even result are
 * treated as custom, preserving their original meaning.
 */
export function getMyShare(bill: Partial<Bill>): number {
  if (!bill) return 0;
  const amount = finiteMoney(bill.amount) ?? 0;
  const stored = finiteMoney(bill.myShare);
  const fallback = stored ?? amount;

  if (!bill.isSplit) return boundedShare(fallback, fallback);

  const fullTotal = finiteMoney(bill.fullTotal) ?? fallback;
  const ways = splitWays(bill);
  const evenShare = ways === null ? roundCents(fallback) : roundCents(fullTotal / ways);

  const custom = finiteMoney(bill.customMyShare);
  if (custom !== null) return boundedShare(custom, fullTotal);

  const percentage = percentageShare(bill, fullTotal);
  if (percentage !== null && bill.splitType !== 'custom') return percentage;

  if (bill.splitType === 'custom') return boundedShare(stored ?? amount, fullTotal);
  if (bill.splitType === 'even') return boundedShare(evenShare, fullTotal);

  // Legacy split with no type: a materially different stored share was an
  // explicit custom allocation, so keep it instead of silently re-splitting.
  if (stored !== null && Math.abs(stored - evenShare) >= 0.005) {
    return boundedShare(stored, fullTotal);
  }
  return boundedShare(evenShare, fullTotal);
}

/** Full bill amount before splitting, rounded to cents. */
export function getFullTotal(bill: Partial<Bill>): number {
  if (!bill) return 0;
  const share = finiteMoney(bill.myShare) ?? finiteMoney(bill.amount) ?? 0;
  if (!bill.isSplit) return roundCents(share);
  const storedFull = finiteMoney(bill.fullTotal);
  if (storedFull !== null) return roundCents(storedFull);
  return roundCents(share * (splitWays(bill) ?? 1));
}

/** Net pay after a percentage tax estimate, rounded to cents. */
export function calcNet(gross: number, taxPercent: number): number {
  if (!Number.isFinite(gross) || gross < 0) return 0;
  if (!Number.isFinite(taxPercent) || taxPercent < 0) return roundCents(gross);
  if (taxPercent >= 100) return 0;
  return roundCents(gross * (1 - taxPercent / 100));
}
