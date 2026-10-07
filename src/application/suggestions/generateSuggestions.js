/**
 * Use case: GenerateSuggestions
 *
 * Runs the deterministic detections and, when the automation policy allows it,
 * materialises them as Action & Decision Inbox items
 * (docs/ARCHITECTURE.md #22). Automation is OFF by default, so by default this
 * only returns the suggestions for display and writes nothing.
 */
import { toIsoDate, toLocalDateParts } from '../../shared/dates/index.js';
import { createInboxItem } from '../../domain/inbox/inboxItem.js';
import { createEvent } from '../../domain/shared/events.js';
import { entityEvent } from '../../domain/shared/constants.js';
import { detectSuggestions } from './detectSuggestions.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ persist?: boolean }} [options]
 */
export async function generateSuggestions(container, options = {}) {
  const today = toIsoDate(toLocalDateParts(container.clock(), container.timezone));
  const [tasks, projects] = await Promise.all([
    container.repositories.tasks.listByUser(container.userId),
    container.repositories.projects.listByUser(container.userId),
  ]);

  const detected = detectSuggestions({ tasks, projects, today });
  const automation = await container.repositories.settings.getAutomation(container.userId);

  // docs/TOOL-CONTRACT.md create_inbox_item: "This may be automatically allowed
  // if the automation policy permits it." Default is OFF.
  if (options.persist && automation.SUGGESTIONS !== true) {
    return { suggestions: detected, created: [], skipped: true, reason: 'AUTOMATION_DISABLED' };
  }

  const created = [];
  for (const suggestion of detected) {
    const relatedEntityId = suggestion.relatedEntityId;
    // Dedup: by entity when the suggestion is about one, otherwise by type -
    // "3 tasks overdue" must not be queued twice while it is still pending.
    const duplicate = relatedEntityId
      ? await container.repositories.inbox.existsForEntity(container.userId, suggestion.inboxType, relatedEntityId)
      : await container.repositories.inbox.existsActiveForType(container.userId, suggestion.inboxType);
    if (duplicate) {
      continue;
    }

    const item = createInboxItem(
      {
        type: suggestion.inboxType,
        title: suggestion.title,
        description: suggestion.description,
        evidence: suggestion.evidence,
        priority: suggestion.priority,
        relatedEntityId,
        relatedEntityType: suggestion.relatedEntityType,
      },
      { userId: container.userId, createdAt: container.clock().toISOString() },
    );

    await container.repositories.inbox.insert(item);
    await container.repositories.events.insert(
      createEvent({
        type: entityEvent('INBOX_ITEM', 'created'),
        entityType: 'INBOX_ITEM',
        entityId: item.id,
        userId: container.userId,
        occurredAt: item.createdAt,
        payload: { category: suggestion.category, evidence: suggestion.evidence },
      }),
    );
    created.push(item);
  }

  return { suggestions: detected, created, skipped: false };
}