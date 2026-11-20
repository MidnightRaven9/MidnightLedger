import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcNet, getFullTotal, getMyShare, roundCents } from '../../src/utils/calculations';
import { sumMoney } from '../../money';

test('roundCents uses half-away-from-zero for positive and negative values', () => {
  assert.equal(roundCents(1.005), 1.01);
  assert.equal(roundCents(-1.005), -1.01);
  assert.equal(roundCents(1.015), 1.02);
  assert.equal(roundCents(-8.575), -8.58);
  assert.equal(roundCents(0.004), 0);
  assert.equal(roundCents(-0.004), 0);
  assert.equal(roundCents(Number.NaN), 0);
  assert.equal(roundCents(0), 0);
});

test('roundCents applies the same policy to large amounts', () => {
  assert.equal(roundCents(123456789012.345), 123456789012.35);
  assert.equal(roundCents(1e-9), 0);
});

test('getMyShare splits evenly into cents', () => {
  assert.equal(getMyShare({ amount: 100, fullTotal: 100, isSplit: true, splitCount: 3 }), 33.33);
  assert.equal(getMyShare({ amount: 10, fullTotal: 10, isSplit: true, splitWays: 4 }), 2.5);
  assert.equal(getMyShare({ amount: 100, fullTotal: 100.01, myShare: 50, isSplit: true, splitType: 'even', splitCount: 2 }), 50.01);
});

test('getMyShare falls back safely for missing and invalid split counts', () => {
  assert.equal(getMyShare({ amount: 100, fullTotal: 100, isSplit: true, splitCount: 0 }), 100);
  assert.equal(getMyShare({ amount: 100, fullTotal: 100, isSplit: true, splitWays: Number.NaN }), 100);
  assert.equal(getMyShare({ myShare: 42.125, isSplit: false }), 42.13);
  assert.equal(getMyShare({}), 0);
});

test('getMyShare preserves explicit custom shares instead of re-splitting', () => {
  assert.equal(getMyShare({
    amount: 40, myShare: 40, fullTotal: 191, isSplit: true,
    splitType: 'custom', splitCount: 2, customMyShare: 40,
  }), 40);
  // Legacy record with no splitType: a stored share different from the even
  // result was an explicit custom allocation.
  assert.equal(getMyShare({ amount: 40, myShare: 40, fullTotal: 191, isSplit: true, splitCount: 2 }), 40);
});

test('getMyShare supports percentage and custom-amount splits', () => {
  assert.equal(getMyShare({
    amount: 95.5, fullTotal: 191, isSplit: true, splitType: 'percentage', mySharePercentage: 50,
  }), 95.5);
  assert.equal(getMyShare({
    amount: 60, fullTotal: 100, isSplit: true, splitType: 'custom', customMyShare: 60,
  }), 60);
});

test('getMyShare clamps invalid allocations to the supported range', () => {
  assert.equal(getMyShare({ amount: -5, fullTotal: 100, isSplit: true, splitType: 'custom', customMyShare: -5 }), 0);
  assert.equal(getMyShare({ amount: 150, fullTotal: 100, isSplit: true, splitType: 'custom', customMyShare: 150 }), 100);
  assert.equal(getMyShare({ amount: 100, fullTotal: 100, isSplit: true, splitType: 'percentage', mySharePercentage: 250 }), 100);
});

test('getFullTotal uses the stored total and reconstructs missing totals', () => {
  assert.equal(getFullTotal({ amount: 50, fullTotal: 191, isSplit: true, splitCount: 2 }), 191);
  assert.equal(getFullTotal({ amount: 50, isSplit: true, splitCount: 2 }), 100);
  assert.equal(getFullTotal({ amount: 50.005 }), 50.01);
});

test('sumMoney reconciles to the cent', () => {
  assert.equal(sumMoney([0.1, 0.2, 1.005, -0.005]), 1.3);
  assert.equal(sumMoney([33.33, 33.33, 33.33]), 99.99);
  assert.equal(sumMoney([Number.NaN, 5]), 5);
});

test('calcNet rounds to cents rather than whole dollars', () => {
  assert.equal(calcNet(1450.55, 22), 1131.43);
  assert.equal(calcNet(100.1, 10), 90.09);
  assert.equal(calcNet(950, 0), 950);
});

test('calcNet rejects invalid inputs and fully taxed gross', () => {
  assert.equal(calcNet(-10, 10), 0);
  assert.equal(calcNet(Number.NaN, 10), 0);
  assert.equal(calcNet(100, 100), 0);
  assert.equal(calcNet(100, -5), 100);
});
