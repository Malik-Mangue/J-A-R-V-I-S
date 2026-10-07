/**
 * Unit tests: audio upload rules (used by POST /api/capture/audio).
 *
 * These rules decide whether a recording is accepted and what provenance is
 * recorded. They must be deterministic and never invent metadata.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_DURATION_MS,
  inferAudioMimeType,
  normalizeDurationMs,
  normalizeLanguage,
  parseAudioUpload,
} from '../../src/application/capture/audioUpload.js';

/** File-shaped object: avoids allocating real multi-MB payloads. */
function fakeFile({ size = 1024, name = 'audio.webm', type = 'audio/webm' } = {}) {
  return {
    name,
    type,
    size,
    async arrayBuffer() {
      return new ArrayBuffer(Math.min(size, 8));
    },
  };
}

test('rejects a missing or empty upload with 400', () => {
  assert.deepEqual(parseAudioUpload({ file: null }), {
    ok: false,
    status: 400,
    message: 'Nenhum áudio recebido.',
  });
  assert.equal(parseAudioUpload({ file: fakeFile({ size: 0 }) }).status, 400);
  assert.equal(parseAudioUpload({ file: 'not-a-file' }).status, 400);
});

test('rejects an oversized upload with 413', () => {
  const result = parseAudioUpload({ file: fakeFile({ size: MAX_AUDIO_BYTES + 1 }) });
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test('rejects an unsupported format with 415', () => {
  const result = parseAudioUpload({
    file: fakeFile({ name: 'notes.txt', type: 'text/plain' }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 415);
  assert.match(result.message, /text\/plain/);
});

test('accepts a declared audio MIME type, stripping codecs parameters', () => {
  const result = parseAudioUpload({
    file: fakeFile({ type: 'audio/webm; codecs=opus' }),
    durationMs: '1500',
    language: 'pt-PT',
  });
  assert.equal(result.ok, true);
  assert.equal(result.mimeType, 'audio/webm');
  assert.equal(result.durationMs, 1500);
  assert.equal(result.language, 'pt-PT');
  assert.equal(result.filename, 'audio.webm');
});

test('infers the MIME type from the extension when the browser sends none (iOS)', () => {
  // Safari/iOS can report an empty type (or even video/mp4) for recordings.
  assert.equal(inferAudioMimeType('', 'audio_123.m4a'), 'audio/mp4');
  assert.equal(inferAudioMimeType(null, 'recording.M4A'), 'audio/mp4');
  assert.equal(inferAudioMimeType('video/mp4', 'clip.wav'), 'audio/wav');

  const fromExtension = parseAudioUpload({
    file: fakeFile({ name: 'audio_123.m4a', type: '' }),
    durationMs: '2000',
  });
  assert.equal(fromExtension.ok, true);
  assert.equal(fromExtension.mimeType, 'audio/mp4');
  assert.equal(fromExtension.filename, 'audio_123.m4a');
});

test('a recording without filename gets a default one derived from its type', () => {
  const result = parseAudioUpload({ file: fakeFile({ name: '', type: 'audio/mpeg' }) });
  assert.equal(result.ok, true);
  assert.equal(result.filename, 'audio.mp3');
});

test('unusable durations become null (unknown) instead of being invented', () => {
  assert.equal(normalizeDurationMs('1500'), 1500);
  assert.equal(normalizeDurationMs(0), 0);
  assert.equal(normalizeDurationMs('1500.6'), 1501);
  assert.equal(normalizeDurationMs('abc'), null);
  assert.equal(normalizeDurationMs('-5'), null);
  assert.equal(normalizeDurationMs(undefined), null);
  assert.equal(normalizeDurationMs(MAX_AUDIO_DURATION_MS + 1), null);
});

test('languages are kept only when they look like a locale tag', () => {
  assert.equal(normalizeLanguage('pt-PT'), 'pt-PT');
  assert.equal(normalizeLanguage(' en-us '), 'en-us');
  assert.equal(normalizeLanguage(''), null);
  assert.equal(normalizeLanguage('../../etc/passwd'), null);
  assert.equal(normalizeLanguage('<script>'), null);
  assert.equal(normalizeLanguage(null), null);
});
