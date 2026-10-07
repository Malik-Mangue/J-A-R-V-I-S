/**
 * Task domain entity and rules.
 *
 * A Task represents an actionable unit of work (docs/ARCHITECTURE.md #18).
 * Business rules live here - never in React components (docs/AGENT-INSTRUCTIONS.md).
 */
import { BusinessRuleError, ConflictError, ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { compareIsoDates, isValidIsoDate, toIsoDate, toLocalDateParts } from '../../shared/dates/index.js';
import { TASK_PRIORITY, TASK_STATUS } from '../shared/constants.js';

const TASK_PRIORITY_VALUES = Object.values(TASK_PRIORITY);
const TASK_STATUS_VALUES = Object.values(TASK_STATUS);

/**
 * @typedef {object} TaskPeriod
 * @property {string} kind
 * @property {string} label
 * @property {string} start
 * @property {string} end
 */

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} userId
 * @property {string} title
 * @property {string|null} description
 * @property {string} status
 * @property {string} priority
 * @property {string|null} deadline
 * @property {TaskPeriod|null} period
 * @property {string|null} projectId
 * @property {string|null} context
 * @property {string[]} dependencies
 * @property {string|null} notes
 * @property {string} source
 * @property {object|null} provenance
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} completedAt
 */

/**
 * Business rule: an adequate temporal reference is required.
 *
 * docs/README.md #6: a task without an adequate deadline must not simply be
 * created as pending; the system asks. docs/ARCHITECTURE.md #3 accepts a
 * *period* (e.g. "próxima semana") as an adequate reference while leaving the
 * concrete date undefined. So: deadline OR period is required.
 */
export const TASK_REQUIRES_TEMPORAL_REFERENCE = true;

/**
 * @param {object} input
 * @param {object} [meta]
 * @param {string} [meta.id]
 * @param {string} [meta.userId]
 * @param {string} [meta.createdAt]
 * @param {string} [meta.referenceDate] today's ISO date, for past-deadline checks
 * @returns {Task}
 */
export function createTask(input, meta = {}) {
  const title = normalizeTitle(input.title);
  if (!title) {
    throw new ValidationError('Uma tarefa precisa de um título.', { details: { field: 'title' } });
  }

  const status = normalizeStatus(input.status ?? TASK_STATUS.PENDING);
  const priority = normalizePriority(input.priority);

  const deadline = input.deadline ?? null;
  if (deadline !== null && !isValidIsoDate(deadline)) {
    throw new ValidationError(`Data de prazo inválida: ${deadline}`, { details: { field: 'deadline', value: deadline } });
  }

  const period = normalizePeriod(input.period);

  if (TASK_REQUIRES_TEMPORAL_REFERENCE && !deadline && !period) {
    throw new BusinessRuleError(
      'Uma tarefa precisa de uma data concreta ou de um período definido. Pergunte ao utilizador quando pretende realizá-la.',
      { details: { rule: 'MISSING_TEMPORAL_REFERENCE', field: 'deadline' } },
    );
  }

  const referenceDate = meta.referenceDate ?? toIsoDate(toLocalDateParts(new Date(), 'UTC'));
  if (deadline && compareIsoDates(deadline, referenceDate) < 0) {
    throw new BusinessRuleError(`A data ${deadline} já passou. Confirme o prazo pretendido.`, {
      details: { rule: 'DEADLINE_IN_PAST', field: 'deadline', value: deadline },
    });
  }

  const timestamp = meta.createdAt ?? nowIso();
  return {
    id: meta.id ?? newId('task'),
    userId: meta.userId ?? 'user_local',
    title,
    description: emptyToNull(input.description),
    status,
    priority,
    deadline,
    period,
    projectId: input.projectId ?? null,
    context: emptyToNull(input.context),
    dependencies: Array.isArray(input.dependencies) ? [...input.dependencies] : [],
    notes: emptyToNull(input.notes),
    source: input.source ?? 'capture',
    provenance: input.provenance ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
}

/** @param {string|undefined|null} value */
export function normalizeTitle(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, ' ').slice(0, 300);
}

/**
 * Normalize an explicitly provided priority.
 *
 * docs/SYSTEM-PROMPT.md: "Do not fabricate missing information." An absent
 * priority stays null - the system does not invent "MEDIUM".
 * @param {string|undefined|null} value
 * @returns {string|null}
 */
export function normalizePriority(value) {
  if (value === null || value === undefined || value === '') return null;
  const upper = String(value).toUpperCase();
  return TASK_PRIORITY_VALUES.includes(upper) ? upper : null;
}

/** @param {string|undefined|null} value */
export function normalizeStatus(value) {
  const upper = String(value ?? TASK_STATUS.PENDING).toUpperCase();
  return TASK_STATUS_VALUES.includes(upper) ? upper : TASK_STATUS.PENDING;
}

/** @param {unknown} value */
export function normalizePeriod(value) {
  if (!value || typeof value !== 'object') return null;
  const period = /** @type {TaskPeriod} */ (value);
  if (!isValidIsoDate(period.start) || !isValidIsoDate(period.end)) return null;
  return {
    kind: period.kind ?? 'CUSTOM',
    label: period.label ?? `${period.start} – ${period.end}`,
    start: period.start,
    end: period.end,
  };
}

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
}

/**
 * Deterministic overdue check (docs/ARCHITECTURE.md #4.1: this rule belongs to
 * the domain, not to a React component).
 * @param {Task} task
 * @param {string} todayIso
 */
export function isOverdue(task, todayIso) {
  if (task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.CANCELLED) return false;
  if (task.deadline) return compareIsoDates(task.deadline, todayIso) < 0;
  if (task.period) return compareIsoDates(task.period.end, todayIso) < 0;
  return false;
}

function assertNotTerminal(task) {
  if (task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.CANCELLED) {
    throw new ConflictError(`A tarefa "${task.title}" já está ${task.status.toLowerCase()}.`);
  }
}

/**
 * Transition: mark a task as completed.
 * @param {Task} task
 * @param {{ completedAt?: string }} [meta]
 * @returns {Task}
 */
export function completeTask(task, meta = {}) {
  assertNotTerminal(task);
  if (task.status === TASK_STATUS.COMPLETED) return task;
  const at = meta.completedAt ?? nowIso();
  return { ...task, status: TASK_STATUS.COMPLETED, completedAt: at, updatedAt: at };
}

/**
 * Transition: start working on a task.
 * @param {Task} task
 * @param {{ updatedAt?: string }} [meta]
 * @returns {Task}
 */
export function startTask(task, meta = {}) {
  assertNotTerminal(task);
  return { ...task, status: TASK_STATUS.IN_PROGRESS, updatedAt: meta.updatedAt ?? nowIso() };
}

/**
 * Transition: block a task (a dependency prevents progress).
 * @param {Task} task
 * @param {{ updatedAt?: string }} [meta]
 * @returns {Task}
 */
export function blockTask(task, meta = {}) {
  assertNotTerminal(task);
  return { ...task, status: TASK_STATUS.BLOCKED, updatedAt: meta.updatedAt ?? nowIso() };
}

/**
 * Transition: cancel a task.
 * @param {Task} task
 * @param {{ updatedAt?: string }} [meta]
 * @returns {Task}
 */
export function cancelTask(task, meta = {}) {
  assertNotTerminal(task);
  return { ...task, status: TASK_STATUS.CANCELLED, updatedAt: meta.updatedAt ?? nowIso() };
}

/**
 * Transition: reschedule a task. Requires a deadline or a period, exactly like
 * creation - the system must not silently store an empty deadline.
 * @param {Task} task
 * @param {{ deadline?: string|null, period?: TaskPeriod|null, updatedAt?: string }} input
 * @returns {Task}
 */
export function rescheduleTask(task, input = {}) {
  assertNotTerminal(task);
  const deadline = input.deadline ?? null;
  const period = normalizePeriod(input.period);
  if (!deadline && !period) {
    throw new BusinessRuleError('Reagendar exige uma data concreta ou um período.', {
      details: { rule: 'MISSING_TEMPORAL_REFERENCE' },
    });
  }
  if (deadline && !isValidIsoDate(deadline)) {
    throw new ValidationError(`Data de prazo inválida: ${deadline}`, { details: { field: 'deadline' } });
  }
  return { ...task, deadline, period, updatedAt: input.updatedAt ?? nowIso() };
}

/**
 * Transition: (re)assign a task to a project, or detach it with `null`.
 * @param {Task} task
 * @param {{ projectId: string|null, updatedAt?: string }} input
 * @returns {Task}
 */
export function assignProject(task, input) {
  return { ...task, projectId: input.projectId ?? null, updatedAt: input.updatedAt ?? nowIso() };
}

