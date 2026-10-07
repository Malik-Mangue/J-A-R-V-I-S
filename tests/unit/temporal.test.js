/**
 * Unit tests: deterministic Portuguese temporal parsing
 * (docs/ARCHITECTURE.md #38 Testing Strategy).
 *
 * Reference instant: Saturday, 2026-10-03, Africa/Maputo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTemporal } from '../../src/shared/dates/temporal.js';

const NOW = new Date('2026-10-03T10:00:00Z');
const OPTS = { now: NOW, timezone: 'Africa/Maputo' };

test('resolves a weekday into a concrete date', () => {
  const result = parseTemporal('Preciso terminar o módulo de autenticação até sexta-feira.', OPTS);
  assert.equal(result.deadline, '2026-10-09');
});

test('"próxima semana" becomes a period, not a fabricated date', () => {
  const result = parseTemporal('Preciso terminar o módulo na próxima semana.', OPTS);
  assert.equal(result.deadline, null);
  assert.equal(result.period.kind, 'NEXT_WEEK');
  assert.equal(result.period.start, '2026-10-05');
  assert.equal(result.period.end, '2026-10-11');
});

test('"esta semana" maps to the current Monday-based week', () => {
  const result = parseTemporal('Tenho de revisar o orçamento esta semana.', OPTS);
  assert.equal(result.period.start, '2026-09-28');
  assert.equal(result.period.end, '2026-10-04');
});

test('"algum dia" is explicitly vague and never becomes a date', () => {
  const result = parseTemporal('Algum dia queroArrancar uma loja online.', OPTS);
  assert.equal(result.vague, true);
  assert.equal(result.deadline, null);
  assert.equal(result.period, null);
});

test('relative day references', () => {
  assert.equal(parseTemporal('Falar com o João amanhã.', OPTS).deadline, '2026-10-04');
  assert.equal(parseTemporal('Falar com o João hoje.', OPTS).deadline, '2026-10-03');
  assert.equal(parseTemporal('Falar com o João depois de amanhã.', OPTS).deadline, '2026-10-05');
});

test('explicit numeric dates', () => {
  assert.equal(parseTemporal('Prazo: 09/10/2026.', OPTS).deadline, '2026-10-09');
  assert.equal(parseTemporal('Prazo: 2026-10-09.', OPTS).deadline, '2026-10-09');
});

test('month-end and half-month periods', () => {
  const end = parseTemporal('Pagar a renda no fim do mês.', OPTS);
  assert.equal(end.period.kind, 'END_OF_MONTH');
  assert.equal(end.period.end, '2026-10-31');

  const half = parseTemporal('Fazer a revisão na segunda metade do mês.', OPTS);
  assert.equal(half.period.start, '2026-10-16');
  assert.equal(half.period.end, '2026-10-31');
});

test('relative offsets', () => {
  const twoWeeks = parseTemporal('daqui a duas semanas tenho uma reunião.', OPTS);
  assert.equal(twoWeeks.period.kind, 'OFFSET_WEEK');
  assert.equal(twoWeeks.period.start, '2026-10-12');
});

test('time of day is captured separately from the date', () => {
  const result = parseTemporal('Reunião amanhã às 15:30.', OPTS);
  assert.equal(result.deadline, '2026-10-04');
  assert.equal(result.time, '15:30');
});

test('text without temporal information yields no date', () => {
  const result = parseTemporal('Tenho uma ideia para umtegration com WhatsApp.', OPTS);
  assert.equal(result.deadline, null);
  assert.equal(result.period, null);
  assert.equal(result.vague, false);
});