/**
 * Idea domain entity.
 *
 * An idea is its own entity and stays an idea until the user explicitly
 * converts it into a task or a project (docs/ARCHITECTURE.md #19,
 * docs/SYSTEM-PROMPT.md "Ideas").
 */
import { BusinessRuleError, ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { IDEA_STATUS } from '../shared/constants.js';

const IDEA_STATUS_VALUES = Object.values(IDEA_STATUS);

/**
 * @typedef {object} Idea
 * @property {string} id
 * @property {string} userId
 * @property {string} title
 * @property {string|null} description
 * @property {string|null} context
 * @property {string|null} projectId
 * @property {string} status
 * @property {string} source
 * @property {object|null} provenance
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} convertedToId
 * @property {string|null} convertedToType
 */

/**
 * @param {object} input
 * @param {object} [meta]
 * @returns {Idea}
 */
export function createIdea(input, meta = {}) {
  const title = String(input.title ?? '').trim();
  if (!title) {
    throw new ValidationError('Uma ideia precisa de um título.', { details: { field: 'title' } });
  }
  const timestamp = meta.createdAt ?? nowIso();
  return {
    id: meta.id ?? newId('idea'),
    userId: meta.userId ?? 'user_local',
    title: title.slice(0, 300),
    description: emptyToNull(input.description),
    context: emptyToNull(input.context),
    projectId: input.projectId ?? null,
    status: normalizeIdeaStatus(input.status),
    source: input.source ?? 'capture',
    provenance: input.provenance ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    convertedToId: null,
    convertedToType: null,
  };
}

/** @param {string|undefined|null} value */
export function normalizeIdeaStatus(value) {
  const upper = String(value ?? IDEA_STATUS.CONSIDERING).toUpperCase();
  return IDEA_STATUS_VALUES.includes(upper) ? upper : IDEA_STATUS.CONSIDERING;
}

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
}

/**
 * Transition: convert an idea into a task. This is an EXPLICIT user action and
 * must never happen automatically (docs/ARCHITECTURE.md #19).
 *
 * @param {Idea} idea
 * @param {{ taskId: string, updatedAt?: string }} input
 * @returns {Idea}
 */
export function convertIdeaToTask(idea, input) {
  assertConvertible(idea);
  if (!input.taskId) throw new ValidationError('É necessário indicar a tarefa criada a partir da ideia.');
  return {
    ...idea,
    status: IDEA_STATUS.CONVERTED_TO_TASK,
    convertedToId: input.taskId,
    convertedToType: 'TASK',
    updatedAt: input.updatedAt ?? nowIso(),
  };
}

/**
 * @param {Idea} idea
 * @param {{ projectId: string, updatedAt?: string }} input
 * @returns {Idea}
 */
export function convertIdeaToProject(idea, input) {
  assertConvertible(idea);
  if (!input.projectId) throw new ValidationError('É necessário indicar o projeto criado a partir da ideia.');
  return {
    ...idea,
    status: IDEA_STATUS.CONVERTED_TO_PROJECT,
    convertedToId: input.projectId,
    convertedToType: 'PROJECT',
    updatedAt: input.updatedAt ?? nowIso(),
  };
}

/** @param {Idea} idea */
function assertConvertible(idea) {
  if (idea.status === IDEA_STATUS.CONVERTED_TO_TASK || idea.status === IDEA_STATUS.CONVERTED_TO_PROJECT) {
    throw new BusinessRuleError('Esta ideia já foi convertida.', { details: { status: idea.status } });
  }
  if (idea.status === IDEA_STATUS.DISCARDED) {
    throw new BusinessRuleError('Uma ideia descartada não pode ser convertida.');
  }
}
