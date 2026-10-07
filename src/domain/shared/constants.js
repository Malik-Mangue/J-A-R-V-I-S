/**
 * Domain vocabulary (the single source of truth for enums / magic strings).
 *
 * docs/MASTER-PROMPT.md #21: "Do not use magic strings when domain constants or
 * structured values are appropriate."
 *
 * The final list of intents belongs to the application domain
 * (docs/AI-CONTRACT.md #7).
 */

export const CAPTURE_TYPES = Object.freeze({
  VOICE: 'VOICE',
  TEXT: 'TEXT',
});

export const CAPTURE_SOURCES = Object.freeze({
  WEB_RECORDER: 'web_recorder',
  WEB_TEXT: 'web_text',
  API: 'api',
  VOICE_CORRECTION: 'voice_correction',
});

export const TASK_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  BLOCKED: 'BLOCKED',
});

export const TASK_PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const IDEA_STATUS = Object.freeze({
  CONSIDERING: 'CONSIDERING',
  PARKED: 'PARKED',
  CONVERTED_TO_TASK: 'CONVERTED_TO_TASK',
  CONVERTED_TO_PROJECT: 'CONVERTED_TO_PROJECT',
  DISCARDED: 'DISCARDED',
});

export const PROJECT_STATUS = Object.freeze({
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  STALLED: 'STALLED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const ENTITY_TYPES = Object.freeze({
  TASK: 'TASK',
  PROJECT: 'PROJECT',
  IDEA: 'IDEA',
  NOTE: 'NOTE',
  COMMITMENT: 'COMMITMENT',
  EXPENSE: 'EXPENSE',
});

/** Financial entry kinds (docs/ARCHITECTURE.md #21). */
export const FINANCE_ENTRY_TYPES = Object.freeze({
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
});

/** Default categories. The user may extend them; nothing is invented by the AI. */
export const FINANCE_CATEGORIES = Object.freeze([
  'TRANSPORTE',
  'ALIMENTACAO',
  'HABITACAO',
  'SAUDE',
  'EDUCACAO',
  'TECNOLOGIA',
  'SALARIO',
  'SERVICOS',
  'OUTROS',
]);

export const CURRENCIES = Object.freeze(['MZN', 'EUR', 'USD', 'BRL']);


/** Response classes every AI response must belong to (docs/AI-CONTRACT.md #13). */
export const RESPONSE_TYPES = Object.freeze({
  INTERPRETATION: 'INTERPRETATION',
  QUESTION: 'QUESTION',
  PROPOSAL: 'PROPOSAL',
  ANALYSIS: 'ANALYSIS',
  SUGGESTION: 'SUGGESTION',
  SUMMARY: 'SUMMARY',
  ERROR: 'ERROR',
});

/** Structured intents (docs/AI-CONTRACT.md #7). */
export const INTENTS = Object.freeze({
  CAPTURE_NOTE: 'CAPTURE_NOTE',
  CREATE_TASK: 'CREATE_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  COMPLETE_TASK: 'COMPLETE_TASK',
  CREATE_PROJECT: 'CREATE_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  CREATE_IDEA: 'CREATE_IDEA',
  CONVERT_IDEA_TO_TASK: 'CONVERT_IDEA_TO_TASK',
  CONVERT_IDEA_TO_PROJECT: 'CONVERT_IDEA_TO_PROJECT',
  CREATE_COMMITMENT: 'CREATE_COMMITMENT',
  CREATE_RESPONSIBILITY: 'CREATE_RESPONSIBILITY',
  CREATE_GOAL: 'CREATE_GOAL',
  CREATE_INCOME: 'CREATE_INCOME',
  CREATE_EXPENSE: 'CREATE_EXPENSE',
  CREATE_PAYMENT: 'CREATE_PAYMENT',
  CREATE_DEBT: 'CREATE_DEBT',
  CREATE_BUDGET: 'CREATE_BUDGET',
  CREATE_DECISION: 'CREATE_DECISION',
  CREATE_PROBLEM: 'CREATE_PROBLEM',
  CREATE_IMPROVEMENT: 'CREATE_IMPROVEMENT',
  ASK_CLARIFICATION: 'ASK_CLARIFICATION',
  GENERATE_SUGGESTION: 'GENERATE_SUGGESTION',
  GENERATE_REVIEW: 'GENERATE_REVIEW',
  SEARCH_CONTEXT: 'SEARCH_CONTEXT',
});

/** Proposal lifecycle. */
export const PROPOSAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  SUPERSEDED: 'SUPERSEDED',
});

/** Action & Decision Inbox (docs/SYSTEM-PROMPT.md). */
export const INBOX_TYPES = Object.freeze({
  AMBIGUITY: 'AMBIGUITY',
  DECISION: 'DECISION',
  ATTENTION: 'ATTENTION',
  SUGGESTION: 'SUGGESTION',
  PROBLEM: 'PROBLEM',
  FINANCE: 'FINANCE',
  OVERDUE: 'OVERDUE',
  PROJECT_STALLED: 'PROJECT_STALLED',
  MISSING_INFORMATION: 'MISSING_INFORMATION',
});

export const INBOX_STATUS = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
  SNOOZED: 'SNOOZED',
});

/** Categories for the configurable automation policy (docs/ARCHITECTURE.md #23). */
export const AUTOMATION_CATEGORIES = Object.freeze([
  'TASKS',
  'PROJECTS',
  'IDEAS',
  'NOTES',
  'FINANCE',
  'SUGGESTIONS',
  'OBSIDIAN_SYNC',
]);

export const DEFAULT_AUTOMATION = Object.freeze(
  Object.fromEntries(AUTOMATION_CATEGORIES.map((category) => [category, false])),
);

/**
 * Audit event names per entity (docs/ARCHITECTURE.md #37 Observability).
 *
 * Centralised so every use case emits exactly the documented names instead of
 * deriving them from the entity type.
 */
export const ENTITY_EVENT_NAMES = Object.freeze({
  TASK: 'task',
  PROJECT: 'project',
  IDEA: 'idea',
  CAPTURE: 'capture',
  PROPOSAL: 'proposal',
  INTERPRETATION: 'interpretation',
  TRANSCRIPTION: 'transcription',
  FINANCE_ENTRY: 'finance.entry',
  NOTE: 'note',
  INBOX_ITEM: 'suggestion',
  GOAL: 'goal',
  RESPONSIBILITY: 'responsibility',
});

/** Build a documented event name, e.g. entityEvent('FINANCE_ENTRY', 'created'). */
export function entityEvent(entityType, action) {
  const prefix = ENTITY_EVENT_NAMES[entityType] ?? String(entityType).toLowerCase();
  return `${prefix}.${action}`;
}
