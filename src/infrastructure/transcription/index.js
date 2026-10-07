/**
 * Transcription abstraction.
 *
 * Transcription is an independent step from interpretation
 * (docs/ARCHITECTURE.md #12). Providers implement `transcribe()`; the selected
 * provider is configured through TRANSCRIPTION_PROVIDER.
 *
 * If no provider is configured, the service fails loudly with a
 * NotConfiguredError. It never fabricates a transcript.
 */
import { NotConfiguredError, AppError } from '../../shared/errors/index.js';
import { logger } from '../logging/logger.js';

/**
 * @typedef {object} TranscriptionInput
 * @property {Uint8Array|ArrayBuffer} audio
 * @property {string} filename
 * @property {string} [mimeType]
 * @property {string} [language]
 *
 * @typedef {object} TranscriptionResult
 * @property {string} text
 * @property {string} provider
 * @property {string|null} language
 * @property {number|null} confidence
 */

/**
 * Provider used when audio transcription is not configured. Keeps the pipeline
 * honest: it reports the missing configuration instead of pretending.
 * @returns {{ name: string, transcribe: (input: TranscriptionInput) => Promise<TranscriptionResult> }}
 */
export function createUnconfiguredTranscriptionProvider() {
  return {
    name: 'none',
    async transcribe() {
      throw new NotConfiguredError(
        'A transcrição de áudio não está configurada. Defina TRANSCRIPTION_PROVIDER (ex.: openai) e a chave correspondente, ou use a captura por texto.',
        { details: { provider: 'none' } },
      );
    },
  };
}

/**
 * OpenAI-compatible Whisper transcription provider.
 * @param {{ apiKey: string|null, baseUrl: string, model: string, fetchImpl?: typeof fetch }} options
 */
export function createOpenAiTranscriptionProvider(options) {
  const { apiKey, baseUrl, model } = options;
  const doFetch = options.fetchImpl ?? globalThis.fetch;

  return {
    name: 'openai',
    async transcribe(input) {
      if (!apiKey) {
        throw new NotConfiguredError('TRANSCRIPTION_PROVIDER=openai exige OPENAI_API_KEY.', {
          details: { provider: 'openai' },
        });
      }

      const form = new FormData();
      form.append('model', model);
      form.append(
        'file',
        new Blob([input.audio], { type: input.mimeType ?? 'application/octet-stream' }),
        input.filename,
      );
      if (input.language) form.append('language', input.language);

      const response = await doFetch(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
      });

      if (!response.ok) {
        throw new AppError(`Falha do provedor de transcrição (${response.status}).`, {
          code: 'TRANSCRIPTION_PROVIDER_ERROR',
          details: { status: response.status },
        });
      }

      const payload = await response.json();
      const text = String(payload?.text ?? '').trim();
      if (!text) {
        throw new AppError('O provedor de transcrição devolveu texto vazio.', {
          code: 'TRANSCRIPTION_PROVIDER_EMPTY',
        });
      }
      return { text, provider: 'openai', language: input.language ?? null, confidence: null };
    },
  };
}

/**
 * @param {object} options
 * @param {{ name: string, transcribe: Function }} options.provider
 */
export function createTranscriptionService({ provider, logger: log = logger }) {
  if (!provider || typeof provider.transcribe !== 'function') {
    throw new TypeError('createTranscriptionService requires a provider implementing transcribe()');
  }
  return {
    providerName: provider.name,
    /**
     * @param {TranscriptionInput} input
     * @returns {Promise<TranscriptionResult>}
     */
    async transcribe(input) {
      const result = await provider.transcribe(input);
      log.info('transcription.completed', { provider: provider.name, length: result.text.length });
      return result;
    },
  };
}
