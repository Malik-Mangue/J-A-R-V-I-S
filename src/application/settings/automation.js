/**
 * Use cases: GetAutomationSettings / SetAutomationSettings
 *
 * docs/README.md #15 and docs/ARCHITECTURE.md #23: automation is configurable
 * and conservative by default. The user decides which categories - if any -
 * may be committed without an explicit confirmation.
 */
import { ValidationError } from '../../shared/errors/index.js';
import { AUTOMATION_CATEGORIES } from '../../domain/shared/constants.js';

/** @param {import('../container.js').Container} container */
export async function getAutomationSettings(container) {
  return container.repositories.settings.getAutomation(container.userId);
}

/**
 * @param {import('../container.js').Container} container
 * @param {Record<string, boolean>} patch
 */
export async function setAutomationSettings(container, patch) {
  for (const [category, value] of Object.entries(patch ?? {})) {
    if (!AUTOMATION_CATEGORIES.includes(category)) {
      throw new ValidationError(`Categoria de automação desconhecida: ${category}`, {
        details: { allowed: AUTOMATION_CATEGORIES },
      });
    }
    if (typeof value !== 'boolean') {
      throw new ValidationError(`O valor de automação para ${category} tem de ser verdadeiro ou falso.`, {
        details: { field: category },
      });
    }
  }
  return container.repositories.settings.setAutomation(container.userId, patch);
}