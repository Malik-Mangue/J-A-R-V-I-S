/**
 * Domain events / audit trail.
 *
 * docs/ARCHITECTURE.md #36: important changes must keep a history so the system
 * can answer "o que mudou?" and "por que o estado atual é este?".
 *
 * Events are plain, append-only records. The application layer is responsible
 * for persisting them; the domain only describes them.
 */
import { newId, nowIso } from '../../shared/ids/index.js';

/**
 * @typedef {object} DomainEvent
 * @property {string} id
 * @property {string} type        e.g. task.created
 * @property {string} entityType  e.g. TASK
 * @property {string|null} entityId
 * @property {string} userId
 * @property {string} occurredAt
 * @property {object} payload     small, non-sensitive structured data
 */

/**
 * @param {object} input
 * @param {string} input.type
 * @param {string} input.entityType
 * @param {string|null} [input.entityId]
 * @param {string} input.userId
 * @param {object} [input.payload]
 * @param {string} [input.occurredAt]
 * @returns {DomainEvent}
 */
export function createEvent({ type, entityType, entityId = null, userId, payload = {}, occurredAt = nowIso() }) {
  if (!type) throw new Error('event type is required');
  if (!entityType) throw new Error('event entityType is required');
  if (!userId) throw new Error('event userId is required');
  return {
    id: newId('event'),
    type,
    entityType,
    entityId,
    userId,
    occurredAt,
    payload: sanitizePayload(payload),
  };
}

const SENSITIVE_KEYS = /pass(word)?|token|secret|api[_-]?key|authorization/i;

/**
 * Never persist secrets in the audit log (docs/ARCHITECTURE.md #37).
 * @param {object} payload
 */
export function sanitizePayload(payload) {
  const out = {};
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (value !== null && typeof value === 'object') {
      out[key] = Array.isArray(value) ? `[${value.length} items]` : '[object]';
    } else {
      out[key] = value;
    }
  }
  return out;
}
