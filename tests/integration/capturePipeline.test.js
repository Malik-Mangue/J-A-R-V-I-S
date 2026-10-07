/**
 * Integration test: the first vertical slice, end to end, against real
 * PostgreSQL (embedded engine).
 *
 *   Capture -> Interpretation -> Proposal -> Preview -> Confirm -> Task -> DB
 *
 * docs/ARCHITECTURE.md #38 Integration & E2E; docs/AGENT-INSTRUCTIONS.md
 * "Esse fluxo deve ser real, testável e integrado."
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createDatabase } from '../../src/infrastructure/database/client.js';
import { createContainer } from '../../src/application/container.js';
import { captureText } from '../../src/application/capture/captureText.js';
import { analyzeCapture } from '../../src/application/proposal/createProposal.js';
import { confirmProposal } from '../../src/application/proposal/confirmProposal.js';
import { cancelProposal } from '../../src/application/proposal/cancelProposal.js';
import { updateProposal } from '../../src/application/proposal/updateProposal.js';
import { getDashboard } from '../../src/application/dashboard/getDashboard.js';
import { completeTask } from '../../src/application/tasks/completeTask.js';
import { INTENTS, PROPOSAL_STATUS } from '../../src/domain/shared/constants.js';

/** Mutable clock so tests can move "today" without sleeping. */
let NOW = new Date('2026-10-03T10:00:00.000Z');
const CLOCK = () => NOW;

/** @type {{ container: any, db: any, dir: string }} */
let context = {};

test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'psb-test-'));
  const db = await createDatabase({ pgliteDataDir: dir });
  const container = await createContainer({ clock: CLOCK, database: db });
  context = { container, db, dir };
});

test.after(async () => {
  await context.db?.close();
  if (context.dir) await rm(context.dir, { recursive: true, force: true });
});

test('vertical slice: text capture becomes a confirmed task in PostgreSQL', async () => {
  const { container } = context;

  const { capture } = await captureText(container, {
    text: 'Preciso terminar o módulo de autenticação até sexta-feira.',
  });
  assert.ok(capture.id.startsWith('cap_'));

  const analysis = await analyzeCapture(container, { captureId: capture.id });
  assert.equal(analysis.status, 'PROPOSAL');
  assert.equal(analysis.interpretation.intent, INTENTS.CREATE_TASK);
  assert.equal(analysis.preview.deadline, '2026-10-09');
  assert.equal(analysis.proposal.status, PROPOSAL_STATUS.PENDING);

  const { proposal, entityType, entity } = await confirmProposal(container, {
    proposalId: analysis.proposal.id,
  });

  assert.equal(entityType, 'TASK');
  assert.equal(proposal.status, PROPOSAL_STATUS.CONFIRMED);
  assert.equal(proposal.resultEntityId, entity.id);

  const stored = await container.repositories.tasks.findById(entity.id);
  assert.equal(stored.title, 'Terminar o módulo de autenticação');
  assert.equal(stored.status, 'PENDING');
  assert.equal(stored.deadline, '2026-10-09');

  // Provenance chain: task -> proposal -> interpretation -> capture.
  assert.equal(stored.provenance.captureId, capture.id);
  assert.equal(stored.provenance.proposalId, analysis.proposal.id);
  assert.equal(stored.provenance.interpretationId, analysis.interpretation.id);

  const events = await container.repositories.events.listByEntity('TASK', entity.id);
  assert.ok(events.some((event) => event.type === 'task.created'));
});

test('an idea is never silently turned into a task or a project', async () => {
  const { container } = context;
  const before = await container.repositories.tasks.listByUser(container.userId);

  const { capture } = await captureText(container, {
    text: 'Seria interessante integrar o WhatsApp para receber notificações dos projetos.',
  });
  const analysis = await analyzeCapture(container, { captureId: capture.id });
  assert.equal(analysis.interpretation.intent, INTENTS.CREATE_IDEA);

  const { entityType, entity } = await confirmProposal(container, { proposalId: analysis.proposal.id });
  assert.equal(entityType, 'IDEA');
  assert.equal(entity.status, 'CONSIDERING');

  const after = await container.repositories.tasks.listByUser(container.userId);
  assert.equal(after.length, before.length);
});

test('a task without an adequate date asks instead of being created', async () => {
  const { container } = context;
  const before = await container.repositories.tasks.listByUser(container.userId);

  const { capture } = await captureText(container, { text: 'Preciso tratar dos documentos.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });

  assert.equal(analysis.status, 'NEEDS_INFORMATION');
  assert.equal(analysis.proposal, undefined);
  assert.ok(analysis.missingInformation.some((item) => item.field === 'deadline'));
  assert.ok(analysis.questions.length > 0);

  const after = await container.repositories.tasks.listByUser(container.userId);
  assert.equal(after.length, before.length);
});

test('a period-only task is accepted and appears in the week view', async () => {
  const { container } = context;
  const { capture } = await captureText(container, {
    text: 'Preciso revisar a proposta comercial nesta semana.',
  });
  const analysis = await analyzeCapture(container, { captureId: capture.id });
  const { entity } = await confirmProposal(container, { proposalId: analysis.proposal.id });

  const stored = await container.repositories.tasks.findById(entity.id);
  assert.equal(stored.deadline, null, 'a period task has no concrete deadline');
  assert.equal(stored.period.start, '2026-09-28');
  assert.equal(stored.period.end, '2026-10-04');

  const dashboard = await getDashboard(container);
  assert.ok(dashboard.weekView.tasks.some((task) => task.id === entity.id));
});

test('an expense becomes a finance entry with integer minor units', async () => {
  const { container } = context;
  const { capture } = await captureText(container, { text: 'Gastei 46 meticais no chapa de hoje.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });
  assert.equal(analysis.interpretation.intent, INTENTS.CREATE_EXPENSE);

  const { entityType, entity } = await confirmProposal(container, { proposalId: analysis.proposal.id });
  assert.equal(entityType, 'FINANCE_ENTRY');
  assert.equal(entity.amountMinor, 4600);
  assert.equal(entity.currency, 'MZN');
  assert.equal(entity.category, 'TRANSPORTE');
});

test('cancelling a proposal creates no domain data', async () => {
  const { container } = context;
  const before = await container.repositories.tasks.listByUser(container.userId);

  const { capture } = await captureText(container, { text: 'Tenho de enviar o relatório amanhã.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });
  const { proposal } = await cancelProposal(container, { proposalId: analysis.proposal.id, reason: 'Não é verdade' });

  assert.equal(proposal.status, PROPOSAL_STATUS.CANCELLED);
  const after = await container.repositories.tasks.listByUser(container.userId);
  assert.equal(after.length, before.length);
});

test('editing a proposal before confirmation is honoured', async () => {
  const { container } = context;
  const { capture } = await captureText(container, { text: 'Preciso ligar para a clínica sexta-feira.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });

  const { proposal } = await updateProposal(container, {
    proposalId: analysis.proposal.id,
    payload: { ...analysis.preview, title: 'Ligar para a clínica dentária' },
  });

  const { entity } = await confirmProposal(container, { proposalId: proposal.id });
  const stored = await container.repositories.tasks.findById(entity.id);
  assert.equal(stored.title, 'Ligar para a clínica dentária');
});

test('the dashboard reports overdue tasks with deterministic evidence', async () => {
  const { container } = context;
  try {
    // Move "today" past the deadlines created by the previous tests.
    NOW = new Date('2026-10-20T10:00:00.000Z');
    const dashboard = await getDashboard(container);

    assert.ok(dashboard.todayView.overdue.length > 0, 'expected at least one overdue task');
    const suggestion = dashboard.suggestions.find((item) => item.category === 'OVERDUE');
    assert.ok(suggestion);
    assert.ok(suggestion.evidence.length > 0, 'every suggestion must have evidence');
  } finally {
    NOW = new Date('2026-10-03T10:00:00.000Z');
  }
});

test('completing a task is persisted and audited', async () => {
  const { container } = context;
  const tasks = await container.repositories.tasks.listByUser(container.userId, { statuses: ['PENDING'] });
  const target = tasks[0];

  const { task } = await completeTask(container, { taskId: target.id });
  assert.equal(task.status, 'COMPLETED');

  const stored = await container.repositories.tasks.findById(target.id);
  assert.equal(stored.status, 'COMPLETED');
  assert.ok(stored.completedAt);

  const events = await container.repositories.events.listByEntity('TASK', target.id);
  assert.ok(events.some((event) => event.type === 'task.completed'));
});