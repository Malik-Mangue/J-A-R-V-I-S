/**
 * Use case: EditProposal / CorrectProposalByVoice
 *
 * The user edits the preview (or corrects it by speaking). The proposal keeps
 * its origin and records the edit as a change, so provenance remains complete
 * (docs/ARCHITECTURE.md #11).
 */
import { NotFoundError } from '../../shared/errors/index.js';
import { editProposal as editProposalEntity } from '../../domain/proposal/proposal.js';
import { createEvent } from '../../domain/shared/events.js';
import { assertOwnership } from '../authorization/index.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ proposalId: string, payload: object }} input
 */
export async function updateProposal(container, input) {
  const stored = await container.repositories.proposals.findById(input.proposalId);
  if (!stored) {
    throw new NotFoundError(`Proposta não encontrada: ${input.proposalId}`, {
      details: { proposalId: input.proposalId },
    });
  }

  assertOwnership(stored, container.userId, 'Proposta');

  const changes = Object.entries(input.payload ?? {})
    .filter(([field, value]) => stored.payload?.[field] !== value)
    .map(([field, value]) => ({
      field,
      value,
      previousValue: stored.payload?.[field] ?? null,
      origin: 'user_edit',
    }));

  const edited = editProposalEntity(stored, { payload: input.payload, changes });
  await container.repositories.proposals.update(edited);
  await container.repositories.events.insert(
    createEvent({
      type: 'proposal.edited',
      entityType: 'PROPOSAL',
      entityId: edited.id,
      userId: container.userId,
      payload: { changedFields: changes.map((change) => change.field) },
    }),
  );

  return { proposal: edited, changes };
}