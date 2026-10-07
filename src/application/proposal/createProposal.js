/**
 * Use case: CreateInterpretationProposal
 *
 * Turns an interpretation into a Proposal - the concrete thing the user reviews
 * and confirms. No domain data is created here.
 */
import { NotFoundError } from '../../shared/errors/index.js';
import { toIsoDate, toLocalDateParts } from '../../shared/dates/index.js';
import { createProposal } from '../../domain/proposal/proposal.js';
import { createEvent } from '../../domain/shared/events.js';
import { buildProposalPayload } from './buildProposalPayload.js';
import { interpretCapture } from '../interpretation/interpretCapture.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ captureId: string, interpretationId?: string }} input
 */
export async function createProposalForCapture(container, input) {
  const capture = await container.repositories.captures.findById(input.captureId);
  if (!capture) {
    throw new NotFoundError(`Captura não encontrada: ${input.captureId}`, { details: { captureId: input.captureId } });
  }

  const interpretation = input.interpretationId
    ? await container.repositories.interpretations.findById(input.interpretationId)
    : await container.repositories.interpretations.findByCaptureId(capture.id);

  if (!interpretation) {
    throw new NotFoundError(`Interpretação não encontrada para a captura ${capture.id}`, {
      details: { captureId: capture.id },
    });
  }

  const currentDate = toIsoDate(toLocalDateParts(container.clock(), container.timezone));
  const built = buildProposalPayload({
    capture,
    interpretation,
    response: { type: 'INTERPRETATION' },
    currentDate,
    timezone: container.timezone,
  });

  if (!built.actionable) {
    // The system asks instead of guessing (docs/PRODUCT.md #4, docs/AI-CONTRACT.md #15).
    return {
      status: 'NEEDS_INFORMATION',
      capture,
      interpretation,
      preview: built.payload,
      missingInformation: built.missingInformation,
      questions: interpretation.questions,
      warnings: built.warnings,
    };
  }

  const proposal = createProposal(
    {
      captureId: capture.id,
      interpretationId: interpretation.id,
      intent: interpretation.intent,
      payload: built.payload,
      changes: built.changes,
      warnings: built.warnings,
    },
    { userId: container.userId, createdAt: container.clock().toISOString() },
  );

  await container.repositories.proposals.insert(proposal);
  await container.repositories.events.insert(
    createEvent({
      type: 'proposal.created',
      entityType: 'PROPOSAL',
      entityId: proposal.id,
      userId: container.userId,
      occurredAt: proposal.createdAt,
      payload: { intent: proposal.intent, captureId: capture.id },
    }),
  );

  return {
    status: 'PROPOSAL',
    capture,
    interpretation,
    proposal,
    preview: built.payload,
    missingInformation: [],
    questions: [],
    warnings: built.warnings,
  };
}

/**
 * Convenience use case used by the capture screen: interpret then propose.
 * @param {import('../container.js').Container} container
 * @param {{ captureId: string }} input
 */
export async function analyzeCapture(container, input) {
  const { capture, interpretation, response } = await interpretCapture(container, input);
  const analysis = await createProposalForCapture(container, {
    captureId: capture.id,
    interpretationId: interpretation.id,
  });
  return { ...analysis, interpretation, response };
}
