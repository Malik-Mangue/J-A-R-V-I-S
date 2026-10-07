/**
 * Controlled context builder.
 *
 * docs/AI-CONTRACT.md #11/#12: the AI receives only *relevant* context, and
 * confirmed database state outranks AI inference. We never send the whole
 * database.
 */
import { normalizeText, toIsoDate, toLocalDateParts } from '../shared/dates/index.js';

const STOPWORDS = new Set([
  'para', 'quero', 'preciso', 'tenho', 'sobre', 'como', 'esta', 'este', 'isso',
  'aquilo', 'aquele', 'aquela', 'coisa', 'depois', 'antes', 'muito', 'mais',
  'menos', 'meu', 'minha', 'nosso', 'todos', 'todas', 'fazer', 'ficar', 'estar',
  'vou', 'devo', 'com', 'sem', 'por', 'que', 'dos', 'das', 'uma', 'uns', 'umas',
  'nao', 'sim', 'ser', 'ter', 'foi', 'era',
]);

/**
 * @param {string} text
 * @returns {string[]}
 */
export function significantTokens(text) {
  return [
    ...new Set(
      normalizeText(text)
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
    ),
  ].slice(0, 8);
}

/**
 * @param {import('./container.js').Container} container
 * @param {{ text: string }} input
 */
export async function buildInterpretationContext(container, input) {
  const todayIso = toIsoDate(toLocalDateParts(container.clock(), container.timezone));
  const projects = new Map();

  for (const token of significantTokens(input.text)) {
    const matches = await container.repositories.projects.searchByName(container.userId, token);
    for (const project of matches) projects.set(project.id, project);
    if (projects.size >= 5) break;
  }

  // When the statement does not name anything, give the model a bounded view of
  // active projects so references like "aquele projeto" can be resolved or
  // reported as ambiguous instead of guessed.
  if (projects.size === 0) {
    const all = await container.repositories.projects.listByUser(container.userId);
    for (const project of all.slice(0, 10)) projects.set(project.id, project);
  }

  const openTasks = await container.repositories.tasks.listByUser(container.userId, {
    statuses: ['PENDING', 'IN_PROGRESS', 'BLOCKED'],
  });

  return {
    currentDate: todayIso,
    timezone: container.timezone,
    locale: container.localeHint ?? 'pt-MZ',
    relevantProjects: [...projects.values()].map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
    })),
    relevantTasks: openTasks.slice(0, 10).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      deadline: task.deadline,
    })),
  };
}
