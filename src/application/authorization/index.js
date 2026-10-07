/**
 * Authorization policy.
 *
 * docs/AI-CONTRACT.md #2: the application owns authentication and authorization.
 * docs/AI-CONTRACT.md #14: "The AI does not decide whether it has permission to
 * execute. The application determines: is this operation allowed? does
 * automation permit it? does this operation require confirmation?"
 *
 * The system is single-user for now, but entities carry `user_id`
 * (docs/ARCHITECTURE.md #33/#34), so every command verifies ownership. This is
 * the boundary that later becomes real multi-user authorization without
 * rewriting the use cases.
 */
import { BusinessRuleError } from '../../shared/errors/index.js';

/**
 * Ensure the acting user owns the entity before mutating it.
 *
 * @param {{ id?: string, userId?: string }|null} entity
 * @param {string} userId
 * @param {string} entityType for the error message
 */
export function assertOwnership(entity, userId, entityType) {
  if (!entity) {
    throw new BusinessRuleError(`${entityType} não encontrada.`, {
      details: { rule: 'NOT_FOUND' },
    });
  }
  if (entity.userId !== userId) {
    // Deliberately the same message as "not found": we do not leak the
    // existence of other users' records.
    throw new BusinessRuleError(`${entityType} não encontrada.`, {
      details: { rule: 'NOT_FOUND' },
    });
  }
  return entity;
}

/**
 * Decide whether a category may be written without an explicit confirmation.
 *
 * Automation is OFF by default (docs/MASTER-PROMPT.md #13,
 * docs/ARCHITECTURE.md #23). Even when enabled, business rules such as
 * "automation technical does not mean business authority" still apply: this
 * function only answers the technical question.
 *
 * @param {{ category: string, automation: Record<string, boolean> }} input
 * @returns {{ automated: boolean, requiresConfirmation: boolean }}
 */
export function resolveExecutionPolicy({ category, automation }) {
  const automated = automation?.[category] === true;
  return { automated, requiresConfirmation: !automated };
}

/**
 * Map an intent to the automation category that governs it
 * (docs/ARCHITECTURE.md #23 configuration example).
 * @param {string} intent
 * @returns {string}
 */
export function automationCategoryForIntent(intent) {
  if (intent?.startsWith('CREATE_TASK') || intent === 'UPDATE_TASK' || intent === 'COMPLETE_TASK') return 'TASKS';
  if (intent?.startsWith('CREATE_PROJECT') || intent === 'UPDATE_PROJECT') return 'PROJECTS';
  if (intent?.startsWith('CREATE_IDEA')) return 'IDEAS';
  if (intent === 'CAPTURE_NOTE') return 'NOTES';
  if (intent?.includes('INCOME') || intent?.includes('EXPENSE') || intent?.includes('PAYMENT') || intent?.includes('DEBT') || intent?.includes('BUDGET')) {
    return 'FINANCE';
  }
  return 'TASKS';
}