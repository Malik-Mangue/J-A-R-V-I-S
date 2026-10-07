/**
 * Use case: CancelProposal
 *
 * The user rejects the interpretation. Nothing is written to the domain tables;
 * only the proposal lifecycle and the audit trail change
 * (docs/ARCHITECTURE.md #9 "Cancel").
 */
import { NotFoundError } from '../../shared/errors/index.js';
import { cancelProposal as cancelProposalEntity } from '../../domain/proposal/proposal.js';
import { createEvent } from '../../domain/shared/events.js';
import { assertOwnership } from '../authorization/index.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ proposalId: string, reason?: string }} input
 */
export async function cancelProposal(container, input) {
  const stored = await container.repositories.proposals.findById(input.proposalId);
  if (!stored) {
    throw new NotFoundError(`Proposta não encontrada: ${input.proposalId}`, {
      details: { proposalId: input.proposalId },
    });
  }

  assertOwnership(stored, container.userId, 'Proposta');

  const cancelled = cancelProposalEntity(stored, {
    cancelledAt: container.clock().toISOString(),
    reason: input.reason ?? null,
  });
  await container.repositories.proposals.update(cancelled);
  await container.repositories.events.insert(
    createEvent({
      type: 'proposal.cancelled',
      entityType: 'PROPOSAL',
      entityId: cancelled.id,
      userId: container.userId,
      occurredAt: cancelled.resolvedAt,
      payload: { intent: cancelled.intent, reason: cancelled.cancellationReason },
    }),
  );

  return { proposal: cancelled };
}