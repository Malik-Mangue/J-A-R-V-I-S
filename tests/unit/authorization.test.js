import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertOwnership,
  automationCategoryForIntent,
  resolveExecutionPolicy,
} from '../../src/application/authorization/index.js';

/**
 * The application owns authorization (docs/AI-CONTRACT.md #14): the model never
 * decides whether it may execute.
 */
test('an entity owned by someone else is reported as not found', () => {
  assert.throws(
    () => assertOwnership({ id: 'task_1', userId: 'someone_else' }, 'user_local', 'Tarefa'),
    /não encontrada/,
  );
  assert.throws(() => assertOwnership(null, 'user_local', 'Tarefa'), /não encontrada/);
  assert.deepEqual(
    assertOwnership({ id: 'task_1', userId: 'user_local' }, 'user_local', 'Tarefa'),
    { id: 'task_1', userId: 'user_local' },
  );
});

test('automation requires explicit opt-in for every category', () => {
  assert.deepEqual(
    resolveExecutionPolicy({ category: 'SUGGESTIONS', automation: { SUGGESTIONS: false } }),
    { automated: false, requiresConfirmation: true },
  );
  assert.deepEqual(
    resolveExecutionPolicy({ category: 'SUGGESTIONS', automation: { SUGGESTIONS: true } }),
    { automated: true, requiresConfirmation: false },
  );
  // Missing category means off - never assumed.
  assert.deepEqual(resolveExecutionPolicy({ category: 'FINANCE', automation: {} }), {
    automated: false,
    requiresConfirmation: true,
  });
});

test('intents map to their automation category', () => {
  assert.equal(automationCategoryForIntent('CREATE_TASK'), 'TASKS');
  assert.equal(automationCategoryForIntent('CREATE_IDEA'), 'IDEAS');
  assert.equal(automationCategoryForIntent('CREATE_EXPENSE'), 'FINANCE');
  assert.equal(automationCategoryForIntent('CAPTURE_NOTE'), 'NOTES');
});
