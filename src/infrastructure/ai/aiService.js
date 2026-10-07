/**
 * AI service: the application-facing entry point of the AI layer.
 *
 * Responsibilities:
 *  - hold the selected provider (dependency inversion, docs/ARCHITECTURE.md #31);
 *  - validate every response against the documented schemas BEFORE any business
 *    logic sees it (docs/ARCHITECTURE.md #32, docs/OUTPUT-SCHEMAS.md #6);
 *  - log the interpretation event without leaking secrets.
 */
import { assertAiResponse } from '../../shared/validation/aiSchemas.js';
import { logger } from '../logging/logger.js';

/**
 * @param {object} options
 * @param {{ name: string, interpret: (input: object) => Promise<object> }} options.provider
 * @param {{ info: Function, warn: Function, error: Function }} [options.logger]
 */
export function createAiService({ provider, logger: log = logger }) {
  if (!provider || typeof provider.interpret !== 'function') {
    throw new TypeError('createAiService requires a provider implementing interpret()');
  }

  return {
    providerName: provider.name,
    provider,

    /**
     * Interpret a transcript/typed text. The returned object is guaranteed to
     * conform to docs/OUTPUT-SCHEMAS.md.
     *
     * @param {{ text: string, context: object, userId?: string }} input
     * @returns {Promise<object>}
     */
    async interpret(input) {
      const raw = await provider.interpret(input);
      const validated = assertAiResponse(raw);
      log.info('interpretation.created', {
        provider: provider.name,
        intent: validated.intent ?? null,
        type: validated.type,
        confidence: validated.confidence ?? null,
      });
      return validated;
    },
  };
}
