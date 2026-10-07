/**
 * Unit tests: AI output must be schema-validated before use
 * (docs/OUTPUT-SCHEMAS.md #6, docs/ARCHITECTURE.md #32).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAiResponse, validateAiResponse } from '../../src/shared/validation/aiSchemas.js';
import { INTENTS, RESPONSE_TYPES } from '../../src/domain/shared/constants.js';

test('accepts a well-formed INTERPRETATION', () => {
  const response = {
    type: RESPONSE_TYPES.INTERPRETATION,
    intent: INTENTS.CREATE_TASK,
    confidence: 0.94,
    entities: { title: 'Falar com João', deadline: '2026-10-09' },
    missingInformation: [],
    ambiguities: [],
    uncertainties: [],
  };
  assert.doesNotThrow(() => assertAiResponse(response));
});

test('rejects a confidence outside 0..1', () => {
  const response = {
    type: RESPONSE_TYPES.INTERPRETATION,
    intent: INTENTS.CREATE_TASK,
    confidence: 12,
    entities: {},
  };
  assert.throws(() => assertAiResponse(response), /Invalid AI INTERPRETATION response/);
});

test('rejects an unknown intent', () => {
  const response = {
    type: RESPONSE_TYPES.INTERPRETATION,
    intent: 'DROP_DATABASE',
    confidence: 0.5,
    entities: {},
  };
  assert.throws(() => assertAiResponse(response));
});

test('rejects an unknown response type', () => {
  assert.throws(() => assertAiResponse({ type: 'SQL', executeSql: 'DELETE FROM tasks' }));
});

test('accepts a QUESTION with candidates', () => {
  const response = {
    type: RESPONSE_TYPES.QUESTION,
    reason: 'AMBIGUOUS_PROJECT',
    questions: [{ id: 'q1', text: 'A qual projeto se refere?' }],
    candidates: [
      { id: 'project_123', name: 'Gestão Académica' },
      { id: 'project_456', name: 'Personal Second Brain' },
    ],
  };
  assert.doesNotThrow(() => assertAiResponse(response));
});

test('rejects a QUESTION without questions', () => {
  assert.throws(() => assertAiResponse({ type: 'QUESTION', reason: 'X' }));
});

test('non-throwing variant reports problems', () => {
  const result = validateAiResponse({ type: RESPONSE_TYPES.PROPOSAL, intent: 'NOT_AN_INTENT' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('SQL-style output is rejected by the business-level safety guard', async () => {
  const { assertNoDatabaseCommands } = await import('../../src/application/proposal/safety.js');
  assert.throws(
    () => assertNoDatabaseCommands({ intent: 'CREATE_TASK', proposal: { executeSql: 'DELETE FROM tasks' } }),
    (error) => error.code === 'AI_FORBIDDEN_OPERATION',
  );
  assert.doesNotThrow(() => assertNoDatabaseCommands({ title: 'Terminar módulo', deadline: '2026-10-09' }));
});