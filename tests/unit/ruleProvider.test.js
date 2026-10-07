/**
 * Unit tests: the deterministic interpretation provider.
 *
 * It must classify like the system prompt describes, and it must NEVER turn an
 * idea into a task (docs/SYSTEM-PROMPT.md "Ideas").
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretText } from '../../src/infrastructure/ai/ruleBasedProvider.js';
import { INTENTS, RESPONSE_TYPES } from '../../src/domain/shared/constants.js';

const context = {
  currentDate: '2026-10-03',
  timezone: 'Africa/Maputo',
  relevantProjects: [],
};

test('classifies a task with a weekday deadline', () => {
  const result = interpretText({ text: 'Preciso terminar o módulo de autenticação até sexta.', context });
  assert.equal(result.type, RESPONSE_TYPES.INTERPRETATION);
  assert.equal(result.intent, INTENTS.CREATE_TASK);
  assert.equal(result.entities.deadline, '2026-10-09');
  assert.equal(result.missingInformation.length, 0);
});

test('a task without a date asks instead of creating something', () => {
  const result = interpretText({ text: 'Preciso tratar dos documentos.', context });
  assert.equal(result.intent, INTENTS.CREATE_TASK);
  assert.equal(result.entities.deadline, null);
  assert.ok(result.missingInformation.some((item) => item.field === 'deadline'));
  assert.ok(result.questions.length > 0);
});

test('an idea stays an idea', () => {
  const result = interpretText({ text: 'Seria interessante integrar WhatsApp no sistema.', context });
  assert.equal(result.intent, INTENTS.CREATE_IDEA);
  assert.notEqual(result.intent, INTENTS.CREATE_TASK);
});

test('detects an expense and extracts the amount without inventing one', () => {
  const expense = interpretText({ text: 'Gastei 46 meticais no chapa.', context });
  assert.equal(expense.intent, INTENTS.CREATE_EXPENSE);
  assert.equal(expense.entities.amountMinor, 4600);
  assert.equal(expense.entities.currency, 'MZN');
  assert.equal(expense.entities.category, 'TRANSPORTE');

  const noAmount = interpretText({ text: 'Gastei no mercado.', context });
  assert.equal(noAmount.entities.amountMinor, undefined);
  assert.ok(noAmount.missingInformation.some((item) => item.field === 'amount'));
});

test('a date is not mistaken for a monetary amount', () => {
  const result = interpretText({ text: 'Paguei a fatura de 12/10 de 1500 meticais.', context });
  assert.equal(result.entities.amountMinor, 150000);
});

test('a plain statement becomes a note', () => {
  const result = interpretText({ text: 'Hoje o café estava muito bom.', context });
  assert.equal(result.intent, INTENTS.CAPTURE_NOTE);
});

test('an ambiguous project reference is reported, never guessed', () => {
  const ambiguous = interpretText({
    text: 'Preciso continuar aquele projeto na próxima semana.',
    context: {
      ...context,
      relevantProjects: [
        { id: 'project_123', name: 'Gestão Académica' },
        { id: 'project_456', name: 'Personal Second Brain' },
      ],
    },
  });
  assert.equal(ambiguous.ambiguities.length, 1);
  assert.deepEqual(ambiguous.ambiguities[0].candidates, ['project_123', 'project_456']);
  assert.equal(ambiguous.entities.projectId, null);
});

test('a single matching project is resolved safely', () => {
  const resolved = interpretText({
    text: 'Preciso continuar o projeto Gestão Académica na próxima semana.',
    context: { ...context, relevantProjects: [{ id: 'project_123', name: 'Gestão Académica' }] },
  });
  assert.equal(resolved.entities.projectId, 'project_123');
});

test('empty input produces a question, not a guess', () => {
  const result = interpretText({ text: '   ', context });
  assert.equal(result.type, RESPONSE_TYPES.QUESTION);
});