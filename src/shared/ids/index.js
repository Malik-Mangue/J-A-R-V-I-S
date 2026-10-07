/**
 * Entity identifier generation.
 *
 * IDs are always produced by the application, never by the AI
 * (docs/AI-CONTRACT.md #10). They are prefixed so that an identifier is
 * self-describing in logs, provenance chains and Obsidian front-matter
 * (docs/ARCHITECTURE.md #27).
 */
import { randomUUID } from 'node:crypto';

/** @type {Record<string, string>} */
export const ID_PREFIXES = {
  user: 'user',
  capture: 'cap',
  transcription: 'trc',
  interpretation: 'itp',
  proposal: 'prop',
  task: 'task',
  project: 'project',
  idea: 'idea',
  commitment: 'cmt',
  responsibility: 'resp',
  goal: 'goal',
  financeEntry: 'fin',
  inboxItem: 'inb',
  suggestion: 'sug',
  review: 'rev',
  decision: 'dec',
  event: 'evt',
};

/**
 * Create a prefixed, collision-resistant identifier.
 * @param {keyof typeof ID_PREFIXES} kind
 * @returns {string}
 */
export function newId(kind) {
  const prefix = ID_PREFIXES[kind];
  if (!prefix) {
    throw new Error(`Unknown id kind: ${kind}`);
  }
  return `${prefix}_${randomUUID()}`;
}

export const nowIso = () => new Date().toISOString();

export const nowMillis = () => Date.now();
