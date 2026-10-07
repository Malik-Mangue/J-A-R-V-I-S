/**
 * OpenAI-compatible AI provider (chat completions with JSON output).
 *
 * Optional: selected with AI_PROVIDER=openai. It implements exactly the same
 * port as the deterministic provider, so nothing else changes. The runtime
 * system prompt is the one defined in docs/SYSTEM-PROMPT.md.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NotConfiguredError, AppError } from '../../shared/errors/index.js';
import { logger } from '../logging/logger.js';

const FALLBACK_SYSTEM_PROMPT =
  'You are the intelligence engine of a personal second brain. Reply with JSON only.';
let cachedSystemPrompt = null;

/**
 * The runtime system prompt is the one defined in docs/SYSTEM-PROMPT.md.
 * Resolved from the project root at runtime so the bundler does not have to
 * trace the documentation file.
 */
function systemPrompt() {
  if (cachedSystemPrompt === null) {
    const path = resolve(process.cwd(), 'docs', 'SYSTEM-PROMPT.md');
    cachedSystemPrompt = existsSync(path) ? readFileSync(path, 'utf8') : FALLBACK_SYSTEM_PROMPT;
  }
  return cachedSystemPrompt;
}

const OUTPUT_CONTRACT = `

---

# Machine contract (mandatory)

Reply with ONE JSON object and nothing else.
It must match one of the schemas in docs/OUTPUT-SCHEMAS.md:
- { "type": "INTERPRETATION", "intent", "confidence", "entities", "missingInformation", "ambiguities", "uncertainties" }
- { "type": "QUESTION", "reason", "questions": [{ "id", "text" }], "candidates": [{ "id", "name" }] }
Never output SQL, database operations or ids that are not present in the
provided context.`;

/**
 * @param {{ apiKey: string|null, baseUrl: string, model: string, fetchImpl?: typeof fetch }} options
 */
export function createOpenAiProvider(options) {
  const { apiKey, baseUrl, model } = options;
  const doFetch = options.fetchImpl ?? globalThis.fetch;

  return {
    name: 'openai',
    async interpret(input) {
      if (!apiKey) {
        throw new NotConfiguredError(
          'O provedor OpenAI está selecionado mas OPENAI_API_KEY não está definida.',
          { details: { provider: 'openai' } },
        );
      }

      const body = {
        model,
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt() + OUTPUT_CONTRACT },
          {
            role: 'user',
            content: JSON.stringify({
              currentDate: input.context?.currentDate,
              timezone: input.context?.timezone,
              relevantProjects: input.context?.relevantProjects ?? [],
              relevantTasks: input.context?.relevantTasks ?? [],
              text: input.text,
            }),
          },
        ],
      };

      const response = await doFetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await safeText(response);
        throw new AppError(`Falha do provedor de IA (${response.status}).`, {
          code: 'AI_PROVIDER_ERROR',
          details: { status: response.status },
        });
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content) {
        throw new AppError('O provedor de IA devolveu uma resposta vazia.', { code: 'AI_PROVIDER_ERROR' });
      }

      try {
        return JSON.parse(content);
      } catch {
        logger.warn('ai.invalid_json', { provider: 'openai' });
        throw new AppError('O provedor de IA devolveu JSON inválido.', { code: 'AI_PROVIDER_INVALID_JSON' });
      }
    },
  };
}

async function safeText(response) {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return '';
  }
}
