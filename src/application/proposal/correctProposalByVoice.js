/**
 * Use case: CorrectProposalByVoice
 *
 * docs/README.md #10 and docs/ARCHITECTURE.md #9 require the user to be able to
 * correct an interpretation by speaking. docs/SYSTEM-PROMPT.md "Voice
 * Correction": "Modify only the relevant field when possible ... Then show the
 * proposal again."
 *
 * The correction is a new capture with its own provenance; the previous
 * proposal is superseded, never silently mutated.
 */
import { CAPTURE_SOURCES } from '../../domain/shared/constants.js';
import { createProposal, supersedeProposal } from '../../domain/proposal/proposal.js';
import { createEvent } from '../../domain/shared/events.js';
import { assertOwnership } from '../authorization/index.js';
import { captureText } from '../capture/captureText.js';
import { analyzeCapture } from './createProposal.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ proposalId: string, correction: string }} input
 */
export async function correctProposalByVoice(container, input) {
  const stored = await container.repositories.proposals.findById(input.proposalId);
  assertOwnership(stored, container.userId, 'Proposta');

  const correction = String(input.correction ?? '').trim();
  if (!correction) {
    return { status: 'ERROR', message: 'Diz o que está errado.' };
  }

  const { capture } = await captureText(container, {
    text: correction,
    source: CAPTURE_SOURCES.VOICE_CORRECTION,
  });
  const analysis = await analyzeCapture(container, { captureId: capture.id });

  if (analysis.status !== 'PROPOSAL') {
    return {
      status: 'NEEDS_INFORMATION',
      captureId: capture.id,
      questions: analysis.questions,
      missingInformation: analysis.missingInformation,
    };
  }

  const payload = mergeCorrection(stored.payload ?? {}, analysis.preview ?? {});
  const changes = Object.entries(payload)
    .filter(([field, value]) => (stored.payload ?? {})[field] !== value)
    .map(([field, value]) => ({ field, value, previousValue: (stored.payload ?? {})[field] ?? null, origin: 'voice_correction' }));

  const proposal = createProposal(
    {
      captureId: capture.id,
      interpretationId: analysis.interpretation.id,
      intent: stored.intent,
      payload,
      changes,
      warnings: analysis.warnings,
    },
    { userId: container.userId, createdAt: container.clock().toISOString() },
  );

  await container.repositories.proposals.insert(proposal);
  const superseded = supersedeProposal(stored, { updatedAt: container.clock().toISOString() });
  await container.repositories.proposals.update(superseded);
  await container.repositories.events.insert(
    createEvent({
      type: 'proposal.corrected',
      entityType: 'PROPOSAL',
      entityId: proposal.id,
      userId: container.userId,
      occurredAt: proposal.createdAt,
      payload: { supersedes: stored.id, changedFields: changes.map((change) => change.field) },
    }),
  );

  return { status: 'PROPOSAL', proposal, changes, supersededProposalId: stored.id };
}

/**
 * Apply only what the correction actually provided. Temporal fields replace
 * each other: a new concrete date invalidates the old period and vice versa.
 *
 * @param {object} base
 * @param {object} correction
 */
export function mergeCorrection(base, correction) {
  const merged = { ...base };

  for (const [field, value] of Object.entries(correction)) {
    if (value === null || value === undefined || value === '') continue;
    merged[field] = value;
  }

  if (correction.deadline) merged.period = null;
  if (correction.period) merged.deadline = null;

  return merged;
}