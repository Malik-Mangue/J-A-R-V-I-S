/**
 * Unit tests: transcription provider abstraction (docs/ARCHITECTURE.md #12).
 *
 * The provider must never fabricate a transcript: when it is not configured it
 * fails with NOT_CONFIGURED, and a provider failure is surfaced as a typed
 * error - never as silent text.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOpenAiTranscriptionProvider,
  createTranscriptionService,
  createUnconfiguredTranscriptionProvider,
} from '../../src/infrastructure/transcription/index.js';

const AUDIO = new TextEncoder().encode('fake-audio-bytes');

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

test('unconfigured provider fails loudly instead of inventing a transcript', async () => {
  const provider = createUnconfiguredTranscriptionProvider();
  await assert.rejects(
    provider.transcribe({ audio: AUDIO, filename: 'a.webm' }),
    (error) => error.code === 'NOT_CONFIGURED' && error.details.provider === 'none',
  );
});

test('openai provider requires an API key', async () => {
  const provider = createOpenAiTranscriptionProvider({
    apiKey: null,
    baseUrl: 'https://api.example/v1',
    model: 'whisper-1',
  });
  await assert.rejects(
    provider.transcribe({ audio: AUDIO, filename: 'a.webm' }),
    (error) => error.code === 'NOT_CONFIGURED',
  );
});

test('openai provider sends model, file and language and returns the text', async () => {
  /** @type {{ url: string, init: any }} */
  let captured;
  const provider = createOpenAiTranscriptionProvider({
    apiKey: 'sk-test',
    baseUrl: 'https://api.example/v1',
    model: 'whisper-1',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return jsonResponse({ text: '  Preciso estudar PostgreSQL amanhã.  ' });
    },
  });

  const result = await provider.transcribe({
    audio: AUDIO,
    filename: 'audio_1.m4a',
    mimeType: 'audio/mp4',
    language: 'pt-PT',
  });

  assert.equal(captured.url, 'https://api.example/v1/audio/transcriptions');
  assert.equal(captured.init.headers.authorization, 'Bearer sk-test');
  const form = captured.init.body;
  assert.equal(form.get('model'), 'whisper-1');
  assert.equal(form.get('language'), 'pt-PT');
  const file = form.get('file');
  assert.equal(file.name, 'audio_1.m4a');

  assert.equal(result.text, 'Preciso estudar PostgreSQL amanhã.');
  assert.equal(result.provider, 'openai');
  assert.equal(result.language, 'pt-PT');
  assert.equal(result.confidence, null);
});

test('an empty transcript from the provider is an error, not a result', async () => {
  const provider = createOpenAiTranscriptionProvider({
    apiKey: 'sk-test',
    baseUrl: 'https://api.example/v1',
    model: 'whisper-1',
    fetchImpl: async () => jsonResponse({ text: '   ' }),
  });
  await assert.rejects(
    provider.transcribe({ audio: AUDIO, filename: 'a.webm' }),
    (error) => error.code === 'TRANSCRIPTION_PROVIDER_EMPTY',
  );
});

test('a provider HTTP failure is reported with its status', async () => {
  const provider = createOpenAiTranscriptionProvider({
    apiKey: 'sk-test',
    baseUrl: 'https://api.example/v1',
    model: 'whisper-1',
    fetchImpl: async () => jsonResponse({ error: 'boom' }, { ok: false, status: 502 }),
  });
  await assert.rejects(
    provider.transcribe({ audio: AUDIO, filename: 'a.webm' }),
    (error) => error.code === 'TRANSCRIPTION_PROVIDER_ERROR' && error.details.status === 502,
  );
});

test('the transcription service requires a provider and logs completions', async () => {
  assert.throws(() => createTranscriptionService({}), /provider/);

  const service = createTranscriptionService({
    provider: {
      name: 'stub',
      async transcribe() {
        return { text: 'olá', provider: 'stub', language: 'pt', confidence: 1 };
      },
    },
    logger: { info() {} },
  });
  assert.equal(service.providerName, 'stub');
  const result = await service.transcribe({ audio: AUDIO, filename: 'a.webm' });
  assert.equal(result.text, 'olá');
});
