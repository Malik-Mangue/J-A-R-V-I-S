/**
 * Capture domain entity.
 *
 * A Capture is the original user input (voice or text). For audio, the original
 * file is NOT kept permanently; only provenance metadata is preserved
 * (docs/ARCHITECTURE.md #10, docs/README.md #14).
 */
import { ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { CAPTURE_SOURCES, CAPTURE_TYPES } from '../shared/constants.js';

/**
 * @typedef {object} Capture
 * @property {string} id
 * @property {string} userId
 * @property {string} type                 VOICE | TEXT
 * @property {string} source
 * @property {string|null} text            only for TEXT captures
 * @property {string|null} originalFilename
 * @property {string|null} mimeType
 * @property {number|null} durationMs
 * @property {number|null} sizeBytes
 * @property {string|null} hash
 * @property {object} metadata
 * @property {string} createdAt
 */

/**
 * @param {object} input
 * @param {string} input.type
 * @param {string} [input.source]
 * @param {string} [input.text]
 * @param {string} [input.originalFilename]
 * @param {string} [input.mimeType]
 * @param {number} [input.durationMs]
 * @param {number} [input.sizeBytes]
 * @param {string} [input.hash]
 * @param {object} [input.metadata]
 * @param {object} [meta]
 * @param {string} [meta.id]
 * @param {string} [meta.userId]
 * @param {string} [meta.createdAt]
 * @returns {Capture}
 */
export function createCapture(input, meta = {}) {
  const type = String(input.type ?? '').toUpperCase();
  if (type !== CAPTURE_TYPES.VOICE && type !== CAPTURE_TYPES.TEXT) {
    throw new ValidationError(`Tipo de captura inválido: ${input.type}`, { details: { field: 'type' } });
  }

  const text = normalizeTextInput(input.text);
  if (type === CAPTURE_TYPES.TEXT && !text) {
    throw new ValidationError('Uma captura de texto não pode estar vazia.', { details: { field: 'text' } });
  }

  const timestamp = meta.createdAt ?? nowIso();
  return {
    id: meta.id ?? newId('capture'),
    userId: meta.userId ?? 'user_local',
    type,
    source: input.source ?? (type === CAPTURE_TYPES.VOICE ? CAPTURE_SOURCES.WEB_RECORDER : CAPTURE_SOURCES.WEB_TEXT),
    text,
    originalFilename: input.originalFilename ?? null,
    mimeType: input.mimeType ?? null,
    durationMs: Number.isFinite(input.durationMs) ? input.durationMs : null,
    sizeBytes: Number.isFinite(input.sizeBytes) ? input.sizeBytes : null,
    hash: input.hash ?? null,
    metadata: input.metadata ?? {},
    createdAt: timestamp,
  };
}

/**
 * Normalize user text without destroying its content.
 * @param {string|undefined|null} value
 */
export function normalizeTextInput(value) {
  const trimmed = String(value ?? '').replace(/\r\n/g, '\n').trim();
  return trimmed ? trimmed : null;
}
