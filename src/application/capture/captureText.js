/**
 * Use case: CaptureText
 *
 * Registers a text capture. No interpretation happens here - capture and
 * understanding are separate steps (docs/ARCHITECTURE.md #3).
 */
import { createCapture } from '../../domain/capture/capture.js';
import { createEvent } from '../../domain/shared/events.js';
import { CAPTURE_SOURCES, CAPTURE_TYPES } from '../../domain/shared/constants.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ text: string, source?: string }} input
 */
export async function captureText(container, input) {
  const capture = createCapture(
    {
      type: CAPTURE_TYPES.TEXT,
      source: input.source ?? CAPTURE_SOURCES.WEB_TEXT,
      text: input.text,
    },
    { userId: container.userId, createdAt: container.clock().toISOString() },
  );

  await container.repositories.captures.insert(capture);
  await container.repositories.events.insert(
    createEvent({
      type: 'capture.created',
      entityType: 'CAPTURE',
      entityId: capture.id,
      userId: container.userId,
      occurredAt: capture.createdAt,
      payload: { captureType: capture.type, source: capture.source },
    }),
  );

  return { capture };
}
