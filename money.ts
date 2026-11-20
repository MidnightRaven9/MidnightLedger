/**
 * Shared USD money policy for the frontend, Node API and Cloudflare Worker.
 *
 * Stored amounts remain dollar numbers, so no persisted format changes. Derived
 * amounts are rounded to whole cents with half-away-from-zero semantics. The
 * decimal exponent shift converts a decimal literal such as 1.005 to 100.5
 * before rounding, avoiding the classic binary-floating-point 1.005 -> 1.00
 * error. Sums are accumulated as integer cents.
 */

export const MAX_MONEY = 1_000_000;

export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);

  // Beyond this range JavaScript can no longer represent every cent exactly.
  // Money accepted by the app is capped well below it; returning the original
  // value avoids inventing precision.
  if (absolute > Number.MAX_SAFE_INTEGER / 100) return sign * absolute;

  const shifted = /e/i.test(absolute.toString())
    ? absolute * 100
    : Number(`${absolute}e2`);
  if (!Number.isFinite(shifted)) return sign * absolute;
  const rounded = (sign * Math.round(shifted)) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function toMinorUnits(value: number): bigint {
  const rounded = roundCents(value);
  const [whole, fraction = '00'] = Math.abs(rounded).toFixed(2).split('.');
  const units = BigInt(whole) * 100n + BigInt(fraction);
  return rounded < 0 ? -units : units;
}

function fromMinorUnits(units: bigint): number {
  const sign = units < 0n ? -1 : 1;
  const absolute = units < 0n ? -units : units;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return sign * (Number(whole) + Number(fraction) / 100);
}

/** Sum already-derived amounts without accumulating binary-float drift. */
export function sumMoney(values: Iterable<number>): number {
  let total = 0n;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    total += toMinorUnits(value);
  }
  return fromMinorUnits(total);
}
