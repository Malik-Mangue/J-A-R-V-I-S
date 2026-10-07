/**
 * Use case: InterpretCapture
 *
 * Sends the capture's text to the AI layer (through the provider abstraction)
 * and stores the resulting Interpretation. Interpretation is still NOT a fact:
 * it only becomes data after user confirmation (docs/ARCHITECTURE.md #3).
 */
import { NotFoundError, NotConfiguredError } from '../../shared/errors/index.js';
import { createInterpretation } from '../../domain/interpretation/interpretation.js';
import { createEvent } from '../../domain/shared/events.js';
import { CAPTURE_TYPES, INTENTS, RESPONSE_TYPES } from '../../domain/shared/constants.js';
import { buildInterpretationContext } from '../context.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ captureId: string }} input
 */
export async function interpretCapture(container, input) {
  const capture = await container.repositories.captures.findById(input.captureId);
  if (!capture) {
    throw new NotFoundError(`Captura não encontrada: ${input.captureId}`, {
      details: { captureId: input.captureId },
    });
  }

  let transcription = await container.repositories.transcriptions.findByCaptureId(capture.id);
  let text = capture.text;

  if (capture.type === CAPTURE_TYPES.VOICE) {
    if (!transcription) {
      throw new NotConfiguredError(
        'Esta captura de voz ainda não tem transcrição. Configure a transcrição ou repita a captura.',
        { details: { captureId: capture.id } },
      );
    }
    text = transcription.text;
  }

  const context = await buildInterpretationContext(container, { text });
  const response = await container.ai.interpret({ text, context, userId: container.userId });

  const intent =
    response.type === RESPONSE_TYPES.INTERPRETATION && response.intent ? response.intent : INTENTS.ASK_CLARIFICATION;

  const interpretation = createInterpretation(
    {
      captureId: capture.id,
      transcriptionId: transcription?.id ?? null,
      intent,
      confidence: response.confidence ?? 0,
      entities: response.entities ?? {},
      missingInformation: response.missingInformation ?? [],
      ambiguities: response.ambiguities ?? [],
      uncertainties: response.uncertainties ?? [],
      questions: response.questions ?? [],
    },
    { userId: container.userId, createdAt: container.clock().toISOString() },
  );

  await container.repositories.interpretations.insert(interpretation);
  await container.repositories.events.insert(
    createEvent({
      type: 'interpretation.created',
      entityType: 'INTERPRETATION',
      entityId: interpretation.id,
      userId: container.userId,
      occurredAt: interpretation.createdAt,
      payload: { intent, confidence: interpretation.confidence, captureId: capture.id },
    }),
  );

  return { capture, transcription, interpretation, response };
}
