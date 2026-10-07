/**
 * Safety guard for AI output.
 *
 * docs/AI-CONTRACT.md #4/#6: the AI operates at the domain-command level and
 * must never emit SQL or database operations. Schema validation cannot catch
 * these inside free-form objects, so this check runs on every payload before it
 * can reach the database.
 */
import { ValidationError } from '../../shared/errors/index.js';

const FORBIDDEN_KEYS = [
  'executeSql',
  'execute_sql',
  'sql',
  'databaseOperation',
  'database_operation',
  'table',
  'query',
  'command',
  'truncate',
];

/**
 * @param {unknown} value
 * @param {string} [path]
 */
export function assertNoDatabaseCommands(value, path = 'proposal') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoDatabaseCommands(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new ValidationError(`O modelo tentou enviar uma operação de base de dados (${path}.${key}).`, {
        code: 'AI_FORBIDDEN_OPERATION',
        details: { path: `${path}.${key}` },
      });
    }
    assertNoDatabaseCommands(child, `${path}.${key}`);
  }
}