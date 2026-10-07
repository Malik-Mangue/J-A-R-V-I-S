/**
 * Use case: CaptureVoice
 *
 * Pipeline: audio -> capture metadata -> transcription.
 *
 * The original audio is only used transiently; it is never written to the
 * application database (docs/ARCHITECTURE.md #10). What is preserved is the
 * provenance metadata documented in README: filename, MIME type, duration,
 * timestamp, size, content hash and the transcription reference.
 *
 * The capture metadata is persisted even if transcription fails, so nothing the
 * user recorded is silently lost, and the failure is reported honestly.
 *
 * Repeated uploads: identical bytes share the same SHA-256 hash, so a recording
 * uploaded twice reuses the existing transcription instead of asking the
 * provider again. The reuse is explicit in the provider name and in the audit
 * event - it never looks like a fresh transcription.
 */
import { createHash } from 'node:crypto';
import { createCapture } from '../../domain/capture/capture.js';
import { createTranscription } from '../../domain/capture/transcription.js';
import { createEvent } from '../../domain/shared/events.js';
import { CAPTURE_SOURCES, CAPTURE_TYPES, entityEvent } from '../../domain/shared/constants.js';
import { ValidationError, isAppError } from '../../shared/errors/index.js';

/** Suffix appended to the original provider when a transcription is reused. */
export const REUSED_PROVIDER_SUFFIX = '+reused';

/**
 * SHA-256 of the recording, used for provenance and duplicate detection.
 * @param {Uint8Array} audio
 * @returns {string} e.g. "sha256:9f86d0…"
 */
export function audioHash(audio) {
  return `sha256:${createHash('sha256').update(audio).digest('hex')}`;
}

/**
 * @param {import('../container.js').Container} container
 * @param {{
 *   audio: Uint8Array,
 *   filename: string,
 *   mimeType?: string,
 *   durationMs?: number,
 *   hash?: string,
 *   language?: string,
 * }} input
 * @returns {Promise<{ capture: object, transcription: object, reused: boolean }>}
 */
export async function captureVoice(container, input) {
  const audio = input.audio;
  if (!audio || audio.length === 0) {
    throw new ValidationError('Áudio vazio.', { details: { field: 'audio' } });
  }

  const hash = input.hash ?? audioHash(audio);

  // Recognise a repeated upload of the same recording BEFORE inserting the new
  // capture, so the lookup can never match the capture being created.
  const previous = await container.repositories.captures.findLatestVoiceByHash(container.userId, hash);
  const previousTranscription = previous
    ? await container.repositories.transcriptions.findByCaptureId(previous.id)
    : null;

  const capture = createCapture(
    {
      type: CAPTURE_TYPES.VOICE,
      source: CAPTURE_SOURCES.WEB_RECORDER,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      durationMs: input.durationMs,
      sizeBytes: audio.length,
      hash,
      metadata: {
        language: input.language ?? null,
        reusedFromCaptureId: previousTranscription ? previous.id : null,
      },
    },
    { userId: container.userId, createdAt: container.clock().toISOString() },
  );

  await container.repositories.captures.insert(capture);
  await container.repositories.events.insert(
    createEvent({
      type: entityEvent('CAPTURE', 'created'),
      entityType: 'CAPTURE',
      entityId: capture.id,
      userId: container.userId,
      occurredAt: capture.createdAt,
      payload: {
        captureType: 'VOICE',
        sizeBytes: audio.length,
        durationMs: capture.durationMs,
        mimeType: capture.mimeType,
        hash,
      },
    }),
  );

  if (previousTranscription) {
    // Same bytes as a previous recording: reuse the transcription that a real
    // provider already produced for it, and say so in the provider name.
    const baseProvider = String(previousTranscription.provider).replace(/\+reused$/, '');
    const transcription = createTranscription(
      {
        captureId: capture.id,
        text: previousTranscription.text,
        language: previousTranscription.language ?? input.language ?? undefined,
        provider: `${baseProvider}${REUSED_PROVIDER_SUFFIX}`,
        confidence: previousTranscription.confidence,
        durationMs: input.durationMs,
      },
      { createdAt: container.clock().toISOString() },
    );
    await container.repositories.transcriptions.insert(transcription);
    await container.repositories.events.insert(
      createEvent({
        type: entityEvent('TRANSCRIPTION', 'completed'),
        entityType: 'TRANSCRIPTION',
        entityId: transcription.id,
        userId: container.userId,
        occurredAt: transcription.createdAt,
        payload: {
          provider: transcription.provider,
          captureId: capture.id,
          sourceCaptureId: previous.id,
          reused: true,
        },
      }),
    );
    return { capture, transcription, reused: true };
  }

  try {
    const result = await container.transcription.transcribe({
      audio,
      filename: input.filename,
      mimeType: input.mimeType,
      language: input.language,
    });

    const transcription = createTranscription(
      {
        captureId: capture.id,
        text: result.text,
        language: result.language,
        provider: result.provider,
        confidence: result.confidence,
        durationMs: input.durationMs,
      },
      { createdAt: container.clock().toISOString() },
    );

    await container.repositories.transcriptions.insert(transcription);
    await container.repositories.events.insert(
      createEvent({
        type: entityEvent('TRANSCRIPTION', 'completed'),
        entityType: 'TRANSCRIPTION',
        entityId: transcription.id,
        userId: container.userId,
        occurredAt: transcription.createdAt,
        payload: {
          provider: transcription.provider,
          captureId: capture.id,
          reused: false,
          language: transcription.language,
        },
      }),
    );
    return { capture, transcription, reused: false };
  } catch (error) {
    if (isAppError(error)) {
      error.details = { ...error.details, captureId: capture.id };
    }
    throw error;
  }
}
