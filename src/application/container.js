/**
 * Application composition root.
 *
 * Wires infrastructure to use cases exactly once per process. The presentation
 * layer (Next.js) only ever imports `getContainer()` and the use-case functions.
 */
import { config } from '../infrastructure/config.js';
import { logger } from '../infrastructure/logging/logger.js';
import { createDatabase } from '../infrastructure/database/client.js';
import { ensureSeedData, runMigrations } from '../infrastructure/database/migrate.js';
import { createRepositories } from '../infrastructure/database/repositories/index.js';
import { createAiService } from '../infrastructure/ai/aiService.js';
import { createRuleBasedAiProvider } from '../infrastructure/ai/ruleBasedProvider.js';
import { createOpenAiProvider } from '../infrastructure/ai/openaiProvider.js';
import {
  createOpenAiTranscriptionProvider,
  createTranscriptionService,
  createUnconfiguredTranscriptionProvider,
} from '../infrastructure/transcription/index.js';

const SINGLETON_KEY = Symbol.for('personal-second-brain.container');

/**
 * @typedef {object} Container
 * @property {import('../infrastructure/database/client.js').Database} db
 * @property {ReturnType<typeof createRepositories>} repositories
 * @property {ReturnType<typeof createAiService>} ai
 * @property {ReturnType<typeof createTranscriptionService>} transcription
 * @property {string} userId
 * @property {string} timezone
 * @property {() => Date} clock
 */

async function buildContainer({ clock, database } = {}) {
  const db = database ?? (await createDatabase());
  await runMigrations(db);
  await ensureSeedData(db, {
    userId: config.app.defaultUserId,
    timezone: config.app.timezone,
    locale: config.app.locale,
  });

  const repositories = createRepositories(db);

  const aiProvider =
    config.ai.provider === 'openai'
      ? createOpenAiProvider({ apiKey: config.ai.apiKey, baseUrl: config.ai.baseUrl, model: config.ai.model })
      : createRuleBasedAiProvider();
  const ai = createAiService({ provider: aiProvider });

  const transcriptionProvider =
    config.transcription.provider === 'openai'
      ? createOpenAiTranscriptionProvider({
          apiKey: config.transcription.apiKey,
          baseUrl: config.transcription.baseUrl,
          model: config.transcription.model,
        })
      : createUnconfiguredTranscriptionProvider();
  const transcription = createTranscriptionService({ provider: transcriptionProvider });

  logger.info('container.ready', {
    database: db.kind,
    aiProvider: ai.providerName,
    transcriptionProvider: transcription.providerName,
  });

  return {
    db,
    repositories,
    ai,
    transcription,
    userId: config.app.defaultUserId,
    timezone: config.app.timezone,
    defaultCurrency: config.app.defaultCurrency,
    clock: clock ?? (() => new Date()),
  };
}

/**
 * Build an isolated container (used by tests, which inject both the clock and a
 * throwaway database).
 * @param {{ clock?: () => Date, database?: import('../infrastructure/database/client.js').Database }} [options]
 * @returns {Promise<Container>}
 */
export function createContainer(options) {
  return buildContainer(options);
}

/**
 * Process-wide container (reused across Next.js hot reloads in development).
 * @returns {Promise<Container>}
 */
export function getContainer() {
  const globalStore = /** @type {Record<symbol, unknown>} */ (globalThis);
  if (!globalStore[SINGLETON_KEY]) {
    globalStore[SINGLETON_KEY] = buildContainer();
  }
  return /** @type {Promise<Container>} */ (globalStore[SINGLETON_KEY]);
}

/**
 * Run a use case inside a single database transaction. Repositories bound to
 * the transaction are passed to the callback so that a multi-step command is
 * atomic (docs/AI-CONTRACT.md #2: the application owns transactions).
 *
 * @template T
 * @param {Container} container
 * @param {(repositories: ReturnType<typeof createRepositories>, tx: object) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function withTransaction(container, fn) {
  return container.db.transaction((tx) => fn(createRepositories(tx), tx));
}
