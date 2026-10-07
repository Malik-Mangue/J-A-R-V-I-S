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
import { correctProposalByVoice } from '../../src/application/proposal/correctProposalByVoice.js';
import { generateSuggestions } from '../../src/application/suggestions/generateSuggestions.js';
import { getAutomationSettings, setAutomationSettings } from '../../src/application/settings/automation.js';
import { updateInboxItem } from '../../src/application/inbox/updateInboxItem.js';
import { convertIdea } from '../../src/application/ideas/convertIdea.js';
import { createIdea } from '../../src/domain/ideas/idea.js';
import { INBOX_STATUS, IDEA_STATUS } from '../../src/domain/shared/constants.js';

/**
 * Compliance test-suite for the audit fixes:
 *
 *  - no invented defaults (currency / status) - the system asks or rejects;
 *  - automation is OFF by default and gates what may be written;
 *  - suggestions carry evidence and are never duplicated;
 *  - inbox writes (resolve / snooze / dismiss) are explicit and audited;
 *  - ideas are converted only by explicit user action;
 *  - voice correction supersedes a proposal instead of mutating it.
 *
 * docs/ARCHITECTURE.md #22/#23/#38; docs/MASTER-PROMPT.md #13.
 */
let NOW = new Date('2026-10-03T10:00:00.000Z');
const CLOCK = () => NOW;

/** @type {{ container: any, db: any, dir: string }} */
let context = {};

test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'psb-audit-'));
  const db = await createDatabase({ pgliteDataDir: dir });
  const container = await createContainer({ clock: CLOCK, database: db });
  context = { container, db, dir };
});

test.after(async () => {
  await context.db?.close();
  if (context.dir) await rm(context.dir, { recursive: true, force: true });
});

test('automation is off by default and gates suggestion materialisation', async () => {
  const { container } = context;

  const settings = await getAutomationSettings(container);
  for (const value of Object.values(settings)) {
    assert.equal(value, false, 'every automation category must start disabled');
  }

  // Something to detect: one task that will become overdue.
  const { capture } = await captureText(container, { text: 'Preciso enviar a factura até sexta-feira.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });
  await confirmProposal(container, { proposalId: analysis.proposal.id });

  try {
    NOW = new Date('2026-10-20T10:00:00.000Z');

    const before = await generateSuggestions(container, { persist: true });
    assert.equal(before.skipped, true);
    assert.equal(before.reason, 'AUTOMATION_DISABLED');
    assert.equal(before.created.length, 0, 'nothing may be written while automation is off');
    assert.ok(before.suggestions.length > 0, 'detection still runs for display');
    assert.ok(before.suggestions[0].evidence.length > 0, 'every suggestion carries evidence');

    await setAutomationSettings(container, { SUGGESTIONS: true });

    const after = await generateSuggestions(container, { persist: true });
    assert.equal(after.skipped, false);
    assert.ok(after.created.length > 0, 'inbox items are created once automation is on');
    assert.ok(after.created.every((item) => item.evidence.length > 0));

    const again = await generateSuggestions(container, { persist: true });
    assert.equal(again.created.length, 0, 'the same suggestion is never duplicated');
  } finally {
    NOW = new Date('2026-10-03T10:00:00.000Z');
  }
});

test('inbox updates are explicit, validated and audited', async () => {
  const { container } = context;
  const [item] = await container.repositories.inbox.listByUser(container.userId);
  assert.ok(item, 'a suggestion from the previous test must be waiting');

  await assert.rejects(
    () => updateInboxItem(container, { itemId: item.id, status: 'SNOOZED' }),
    /até quando adiar/i,
    'snoozing without a date must ask, not guess',
  );

  await assert.rejects(
    () => updateInboxItem(container, { itemId: item.id, status: 'WHATEVER' }),
    /Estado de inbox inválido/,
    'an unknown status is rejected instead of falling back to OPEN',
  );

  await assert.rejects(
    () => updateInboxItem(container, { itemId: 'inbox_do_not_exist', status: INBOX_STATUS.RESOLVED }),
    /não encontrada/i,
    'a missing item is reported as not found',
  );

  const { item: snoozed } = await updateInboxItem(container, {
    itemId: item.id,
    status: INBOX_STATUS.SNOOZED,
    snoozedUntil: '2026-10-25',
  });
  assert.equal(snoozed.status, INBOX_STATUS.SNOOZED);
  assert.equal(snoozed.snoozedUntil, '2026-10-25');

  const { item: resolved } = await updateInboxItem(container, {
    itemId: item.id,
    status: INBOX_STATUS.RESOLVED,
  });
  assert.equal(resolved.status, INBOX_STATUS.RESOLVED);

  const events = await container.repositories.events.listByEntity('INBOX_ITEM', item.id);
  assert.ok(events.some((event) => event.type.endsWith('snoozed')));
  assert.ok(events.some((event) => event.type.endsWith('accepted')));
});

test('an idea is converted only explicitly, and only with a temporal reference', async () => {
  const { container } = context;
  const idea = createIdea(
    { title: 'App de leituras partilhadas', description: 'Comentar livros com amigos.' },
    { userId: container.userId, createdAt: container.clock().toISOString() },
  );
  await container.repositories.ideas.insert(idea);

  await assert.rejects(
    () => convertIdea(container, { ideaId: idea.id, target: 'TASK' }),
    /data concreta|período/i,
    'a task needs an adequate temporal reference',
  );

  await assert.rejects(
    () => convertIdea(container, { ideaId: 'idea_do_not_exist', target: 'PROJECT' }),
    /não encontrada/i,
  );

  const { entityType, entity } = await convertIdea(container, { ideaId: idea.id, target: 'PROJECT' });
  assert.equal(entityType, 'PROJECT');
  assert.equal(entity.name, 'App de leituras partilhadas');

  const stored = await container.repositories.ideas.findById(idea.id);
  assert.equal(stored.status, IDEA_STATUS.CONVERTED_TO_PROJECT);
  assert.equal(stored.convertedToId, entity.id);

  await assert.rejects(
    () => convertIdea(container, { ideaId: idea.id, target: 'PROJECT' }),
    /já foi convertida/i,
    'conversion is single-shot',
  );
});

test('voice correction supersedes the proposal instead of mutating it', async () => {
  const { container } = context;
  const { capture } = await captureText(container, { text: 'Preciso ligar ao dentista sexta-feira.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });

  const empty = await correctProposalByVoice(container, { proposalId: analysis.proposal.id, correction: '   ' });
  assert.equal(empty.status, 'ERROR');

  const result = await correctProposalByVoice(container, {
    proposalId: analysis.proposal.id,
    correction: 'quinta-feira de manhã, marcar consulta de revisão',
  });
  assert.equal(result.status, 'PROPOSAL');
  assert.ok(result.changes.length > 0, 'the correction reports what changed');

  const superseded = await container.repositories.proposals.findById(analysis.proposal.id);
  assert.equal(superseded.status, 'SUPERSEDED');

  const { entityType, entity } = await confirmProposal(container, { proposalId: result.proposal.id });
  assert.equal(entityType, 'TASK');
  assert.equal(entity.title, result.proposal.payload.title);

  const events = await container.repositories.events.listByEntity('PROPOSAL', result.proposal.id);
  assert.ok(events.some((event) => event.type === 'proposal.corrected'));
});

test('a capture without a currency becomes a question, never a default', async () => {
  const { container } = context;
  const { capture } = await captureText(container, { text: 'Gastei 500 no almoço de hoje.' });
  const analysis = await analyzeCapture(container, { captureId: capture.id });

  assert.equal(analysis.status, 'NEEDS_INFORMATION');
  assert.ok(
    analysis.missingInformation.some((entry) => entry.field === 'currency'),
    'the missing currency must be asked for',
  );
  assert.ok(!analysis.proposal, 'no proposal is written while information is missing');
});
