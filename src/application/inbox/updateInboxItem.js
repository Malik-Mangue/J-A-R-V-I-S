/**
 * Use case: UpdateInboxItem
 *
 * The Inbox is not a task list: an item means "something requires my attention
 * or decision" (docs/SYSTEM-PROMPT.md). The user resolves, dismisses or snoozes
 * it - the system never does it automatically.
 */
import { changeInboxStatus } from '../../domain/inbox/inboxItem.js';
import { createEvent } from '../../domain/shared/events.js';
import { entityEvent, INBOX_STATUS } from '../../domain/shared/constants.js';
import { assertOwnership } from '../authorization/index.js';
import { ValidationError } from '../../shared/errors/index.js';
import { isValidIsoDate } from '../../shared/dates/index.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ itemId: string, status: string, snoozedUntil?: string|null }} input
 */
export async function updateInboxItem(container, input) {
  const stored = await container.repositories.inbox.findById(input.itemId);
  assertOwnership(stored, container.userId, 'Item da inbox');

  // Never silently "normalise" an unknown status into OPEN: the caller must
  // name a real state (docs/AGENT-INSTRUCTIONS.md: no invented defaults).
  const status = String(input.status ?? '').toUpperCase();
  if (!Object.values(INBOX_STATUS).includes(status)) {
    throw new ValidationError(`Estado de inbox inválido: ${input.status}`, {
      details: { field: 'status', allowed: Object.values(INBOX_STATUS) },
    });
  }
  if (status === INBOX_STATUS.SNOOZED) {
    if (!input.snoozedUntil || !isValidIsoDate(input.snoozedUntil)) {
      throw new ValidationError('Indica até quando adiar este item.', {
        details: { field: 'snoozedUntil' },
      });
    }
  }

  const updated = changeInboxStatus(stored, status);
  if (status === INBOX_STATUS.SNOOZED) updated.snoozedUntil = input.snoozedUntil;

  await container.repositories.inbox.update(updated);
  await container.repositories.events.insert(
    createEvent({
      type: entityEvent('INBOX_ITEM', actionForStatus(status)),
      entityType: 'INBOX_ITEM',
      entityId: updated.id,
      userId: container.userId,
      occurredAt: updated.updatedAt,
      payload: { status, relatedEntityId: updated.relatedEntityId },
    }),
  );

  return { item: updated };
}

function actionForStatus(status) {
  switch (status) {
    case INBOX_STATUS.RESOLVED:
      return 'accepted';
    case INBOX_STATUS.DISMISSED:
      return 'dismissed';
    case INBOX_STATUS.SNOOZED:
      return 'snoozed';
    default:
      return 'updated';
  }
}