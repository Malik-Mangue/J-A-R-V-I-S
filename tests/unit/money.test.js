/**
 * Unit tests: money handling must never rely on floating point
 * (docs/ARCHITECTURE.md #21).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMinor, parseAmountToMinor } from '../../src/domain/finance/money.js';
import { createFinanceEntry } from '../../src/domain/finance/financeEntry.js';

test('parses simple and decimal amounts', () => {
  assert.equal(parseAmountToMinor('46'), 4600);
  assert.equal(parseAmountToMinor('46,50'), 4650);
  assert.equal(parseAmountToMinor('46.50'), 4650);
  assert.equal(parseAmountToMinor('1.234,56'), 123456);
  assert.equal(parseAmountToMinor('1,234.56'), 123456);
  assert.equal(parseAmountToMinor('46 meticais'), 4600);
});

test('rejects values that are not numbers', () => {
  assert.throws(() => parseAmountToMinor('abc'));
  assert.throws(() => parseAmountToMinor(''));
});

test('formats minor units for display', () => {
  assert.equal(formatMinor(4600, 'MZN'), '46,00 MZN');
  assert.equal(formatMinor(150000, 'MZN'), '1500,00 MZN');
  assert.equal(formatMinor(-4600, 'MZN'), '-46,00 MZN');
});

test('a finance entry requires a positive amount, a currency and a date', () => {
  assert.throws(() => createFinanceEntry({ type: 'EXPENSE', amountMinor: 0, currency: 'MZN', occurredOn: '2026-10-03' }));
  assert.throws(() => createFinanceEntry({ type: 'EXPENSE', amountMinor: 100, currency: 'MZN' }));
  // No currency is stated: the system must ask, never invent a default one.
  assert.throws(
    () => createFinanceEntry({ type: 'EXPENSE', amountMinor: 4600, category: 'transporte', occurredOn: '2026-10-03' }),
    /moeda/i,
  );

  const entry = createFinanceEntry({
    type: 'EXPENSE',
    amountMinor: 4600,
    currency: 'MZN',
    category: 'transporte',
    occurredOn: '2026-10-03',
  });
  assert.equal(entry.currency, 'MZN');
  assert.equal(entry.category, 'TRANSPORTE');
  assert.equal(entry.amountMinor, 4600);
});

test('unsupported currency is rejected', () => {
  assert.throws(() => createFinanceEntry({ type: 'EXPENSE', amountMinor: 100, currency: 'XBT', occurredOn: '2026-10-03' }));
});