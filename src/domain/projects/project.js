/**
 * Project domain entity.
 *
 * A project is a living system, not just a folder of tasks
 * (docs/ARCHITECTURE.md #20, docs/PRODUCT.md #8).
 */
import { ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { isValidIsoDate } from '../../shared/dates/index.js';
import { PROJECT_STATUS } from '../shared/constants.js';

const PROJECT_STATUS_VALUES = Object.values(PROJECT_STATUS);

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string|null} objective
 * @property {string|null} description
 * @property {string} status
 * @property {number} progress             0..100
 * @property {string|null} deadline
 * @property {string|null} nextAction
 * @property {string|null} provenance
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} lastActivityAt
 */

/**
 * @param {object} input
 * @param {object} [meta]
 * @returns {Project}
 */
export function createProject(input, meta = {}) {
  const name = String(input.name ?? input.title ?? '').trim();
  if (!name) {
    throw new ValidationError('Um projeto precisa de um nome.', { details: { field: 'name' } });
  }
  if (input.deadline != null && !isValidIsoDate(input.deadline)) {
    throw new ValidationError(`Prazo de projeto inválido: ${input.deadline}`, { details: { field: 'deadline' } });
  }
  const status = normalizeProjectStatus(input.status);
  const timestamp = meta.createdAt ?? nowIso();
  return {
    id: meta.id ?? newId('project'),
    userId: meta.userId ?? 'user_local',
    name: name.slice(0, 200),
    objective: emptyToNull(input.objective),
    description: emptyToNull(input.description),
    status,
    progress: normalizeProgress(input.progress),
    deadline: input.deadline ?? null,
    nextAction: emptyToNull(input.nextAction),
    provenance: input.provenance ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActivityAt: timestamp,
  };
}

/** @param {string|undefined|null} value */
export function normalizeProjectStatus(value) {
  const upper = String(value ?? PROJECT_STATUS.ACTIVE).toUpperCase();
  return PROJECT_STATUS_VALUES.includes(upper) ? upper : PROJECT_STATUS.ACTIVE;
}

function normalizeProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
}

/**
 * Transition: update mutable project state. Recorded as an audit event by the
 * application layer.
 * @param {Project} project
 * @param {Partial<Project>} patch
 * @param {{ updatedAt?: string }} [meta]
 * @returns {Project}
 */
export function updateProject(project, patch, meta = {}) {
  if (patch.deadline != null && !isValidIsoDate(patch.deadline)) {
    throw new ValidationError(`Prazo de projeto inválido: ${patch.deadline}`, { details: { field: 'deadline' } });
  }
  const timestamp = meta.updatedAt ?? nowIso();
  return {
    ...project,
    ...('name' in patch ? { name: String(patch.name).trim() } : {}),
    ...('objective' in patch ? { objective: emptyToNull(patch.objective) } : {}),
    ...('description' in patch ? { description: emptyToNull(patch.description) } : {}),
    ...('status' in patch ? { status: normalizeProjectStatus(patch.status) } : {}),
    ...('progress' in patch ? { progress: normalizeProgress(patch.progress) } : {}),
    ...('deadline' in patch ? { deadline: patch.deadline ?? null } : {}),
    ...('nextAction' in patch ? { nextAction: emptyToNull(patch.nextAction) } : {}),
    updatedAt: timestamp,
    lastActivityAt: timestamp,
  };
}

/**
 * Deterministic stall detection used by proactive intelligence
 * (docs/ARCHITECTURE.md #22). No AI required.
 *
 * @param {Project} project
 * @param {string} todayIso
 * @param {number} [thresholdDays]
 */
export function isProjectStalled(project, todayIso, thresholdDays = 14) {
  if (project.status === PROJECT_STATUS.COMPLETED || project.status === PROJECT_STATUS.CANCELLED) return false;
  const last = project.lastActivityAt ?? project.updatedAt;
  const lastDate = last.slice(0, 10);
  const days = daysBetween(lastDate, todayIso);
  return days >= thresholdDays;
}

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}
