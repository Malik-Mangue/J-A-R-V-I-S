/**
 * Transcription domain entity.
 *
 * Transcription is an independent step from interpretation: the system must not
 * assume `transcrição = significado` (docs/ARCHITECTURE.md #12).
 */
import { ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';

/**
 * @typedef {object} Transcription
 * @property {string} id
 * @property {string} captureId
 * @property {string} text
 * @property {string|null} language
 * @property {string} provider
 * @property {number|null} confidence
 * @property {number|null} durationMs
 * @property {string} createdAt
 */

/**
 * @param {object} input
 * @param {string} input.captureId
 * @param {string} input.text
 * @param {string} [input.language]
 * @param {string} [input.provider]
 * @param {number} [input.confidence]
 * @param {number} [input.durationMs]
 * @param {object} [meta]
 * @returns {Transcription}
 */
export function createTranscription(input, meta = {}) {
  const text = String(input.text ?? '').trim();
  if (!text) {
    throw new ValidationError('Uma transcrição não pode estar vazia.', { details: { field: 'text' } });
  }
  if (!input.captureId) {
    throw new ValidationError('Uma transcrição precisa de uma captura de origem.', { details: { field: 'captureId' } });
  }
  return {
    id: meta.id ?? newId('transcription'),
    captureId: input.captureId,
    text,
    language: input.language ?? null,
    provider: input.provider ?? 'unknown',
    confidence: Number.isFinite(input.confidence) ? input.confidence : null,
    durationMs: Number.isFinite(input.durationMs) ? input.durationMs : null,
    createdAt: meta.createdAt ?? nowIso(),
  };
}
