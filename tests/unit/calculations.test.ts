import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcNet, getFullTotal, getMyShare, roundCents } from '../../src/utils/calculations';

test('roundCents uses half-away-from-zero for positive and negative values', () => {
  assert.equal(roundCents(1.005), 1.01);
  assert.equal(roundCents(-1.005), -1.01);
  assert.equal(roundCents(0.004), 0);
  assert.equal(roundCents(Number.NaN), 0);
});

test('getMyShare splits evenly into cents', () => {
  assert.equal(getMyShare({ amount: 100, fullTotal: 100, isSplit: true, splitCount: 3 }), 33.33);
  assert.equal(getMyShare({ amount: 10, fullTotal: 10, isSplit: true, splitWays: 4 }), 2.5);
});

test('getMyShare uses the full total for even splits and falls back for invalid split counts', () => {
  assert.equal(getMyShare({ amount: 100, myShare: 50, isSplit: true, fullTotal: 100.01, splitCount: 2 }), 50.01);
  assert.equal(getMyShare({ amount: 100, fullTotal: 100, isSplit: true, splitCount: 0 }), 50);
  assert.equal(getMyShare({ myShare: 42.125, isSplit: false }), 42.13);
});

test('getFullTotal returns the pre-split amount', () => {
  assert.equal(getFullTotal({ amount: 50, fullTotal: 191, isSplit: true, splitCount: 2 }), 191);
  assert.equal(getFullTotal({ amount: 50.005 }), 50.01);
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
