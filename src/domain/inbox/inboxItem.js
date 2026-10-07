/**
 * Action & Decision Inbox item.
 *
 * The Inbox is NOT a task list. A task means "I need to do something"; an Inbox
 * item means "something requires my attention or decision"
 * (docs/SYSTEM-PROMPT.md "Action & Decision Inbox").
 */
import { ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { INBOX_STATUS, INBOX_TYPES } from '../shared/constants.js';

const INBOX_TYPE_VALUES = Object.values(INBOX_TYPES);
const INBOX_STATUS_VALUES = Object.values(INBOX_STATUS);

/**
 * @typedef {object} InboxItem
 * @property {string} id
 * @property {string} userId
 * @property {string} type
 * @property {string} title
 * @property {string|null} description
 * @property {Array<object>} evidence
 * @property {string} priority          LOW | MEDIUM | HIGH
 * @property {string} status
 * @property {string|null} relatedEntityId
 * @property {string|null} relatedEntityType
 * @property {string} createdAt
 * @property {string|null} updatedAt
 * @property {string|null} snoozedUntil
 */

/**
 * @param {object} input
 * @param {object} [meta]
 * @returns {InboxItem}
 */
export function createInboxItem(input, meta = {}) {
  const type = String(input.type ?? '').toUpperCase();
  if (!INBOX_TYPE_VALUES.includes(type)) {
    throw new ValidationError(`Tipo de item de inbox inválido: ${input.type}`, {
      details: { field: 'type', allowed: INBOX_TYPE_VALUES },
    });
  }
  const title = String(input.title ?? '').trim();
  if (!title) {
    throw new ValidationError('Um item de inbox precisa de um título.', { details: { field: 'title' } });
  }
  const timestamp = meta.createdAt ?? nowIso();
  return {
    id: meta.id ?? newId('inboxItem'),
    userId: meta.userId ?? 'user_local',
    type,
    title: title.slice(0, 300),
    description: String(input.description ?? '').trim() || null,
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    priority: normalizeInboxPriority(input.priority),
    status: INBOX_STATUS.OPEN,
    relatedEntityId: input.relatedEntityId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    createdAt: timestamp,
    updatedAt: null,
    snoozedUntil: null,
  };
}

function normalizeInboxPriority(value) {
  const upper = String(value ?? 'MEDIUM').toUpperCase();
  return ['LOW', 'MEDIUM', 'HIGH'].includes(upper) ? upper : 'MEDIUM';
}

/**
 * @param {string|undefined|null} value
 * @returns {string}
 */
export function normalizeInboxStatus(value) {
  const upper = String(value ?? INBOX_STATUS.OPEN).toUpperCase();
  return INBOX_STATUS_VALUES.includes(upper) ? upper : INBOX_STATUS.OPEN;
}

/**
 * @param {InboxItem} item
 * @param {string|undefined|null} status
 * @returns {InboxItem}
 */
export function changeInboxStatus(item, status) {
  const next = normalizeInboxStatus(status);
  return { ...item, status: next, updatedAt: nowIso() };
}
