/**
 * Integration test: the voice slice, end to end, against real PostgreSQL
 * (embedded engine) - docs/ARCHITECTURE.md #38 E2E:
 *
 *   Record audio -> Transcribe -> Interpret -> Confirm -> Task created
 *
 * Also covers the honesty rules for audio:
 *  - the original audio is never persisted (only provenance + SHA-256 hash);
 *  - a repeated upload reuses the previous transcription instead of calling the
 *    provider again, and says so;
 *  - when no transcription provider is configured the failure is reported, the
 *    recording's metadata is kept and nothing is fabricated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createDatabase } from '../../src/infrastructure/database/client.js';
import { createContainer } from '../../src/application/container.js';
import {
  REUSED_PROVIDER_SUFFIX,
  audioHash,
  captureVoice,
} from '../../src/application/capture/captureVoice.js';
import { analyzeCapture } from '../../src/application/proposal/createProposal.js';
import { confirmProposal } from '../../src/application/proposal/confirmProposal.js';
import {
  createTranscriptionService,
  createUnconfiguredTranscriptionProvider,
} from '../../src/infrastructure/transcription/index.js';
import { INTENTS } from '../../src/domain/shared/constants.js';

/** Mutable clock so tests can move "today" without sleeping. */
const NOW = new Date('2026-10-03T10:00:00.000Z');
const CLOCK = () => NOW;

const TRANSCRIPT = 'Preciso estudar PostgreSQL amanhã durante duas horas.';
/** Every call the stub transcription provider received. */
const providerCalls = [];

/** @type {{ container: any, db: any, dir: string }} */
let context = {};
/** Capture created by the first test; later tests check reuse against it. */
let firstCaptureId = null;

test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'psb-audio-'));
  const db = await createDatabase({ pgliteDataDir: dir });
  const container = await createContainer({ clock: CLOCK, database: db });
  container.transcription = createTranscriptionService({
    provider: {
      name: 'stub',
      async transcribe(input) {
        providerCalls.push({
          filename: input.filename,
          mimeType: input.mimeType,
          language: input.language,
        });
        return { text: TRANSCRIPT, provider: 'stub', language: 'pt-PT', confidence: 0.97 };
      },
    },
    logger: { info() {} },
  });
  context = { container, db, dir };
});

test.after(async () => {
  await context.db?.close();
  if (context.dir) await rm(context.dir, { recursive: true, force: true });
});

test('voice slice: recorded audio becomes a confirmed task in PostgreSQL', async () => {
  const { container } = context;
  const audio = new TextEncoder().encode('audio-bytes-e2e-0001');

  const { capture, transcription, reused } = await captureVoice(container, {
    audio,
    filename: 'audio_1.webm',
    mimeType: 'audio/webm',
    durationMs: 4200,
    language: 'pt-PT',
  });

  assert.equal(reused, false);
  assert.equal(capture.type, 'VOICE');
  assert.equal(capture.text, null); // audio bytes are never stored as content
  assert.equal(capture.sizeBytes, audio.length);
  assert.equal(capture.durationMs, 4200);
  assert.equal(capture.hash, audioHash(audio));
  assert.equal(capture.hash, `sha256:${capture.hash.slice('sha256:'.length)}`);
  firstCaptureId = capture.id;
  assert.equal(transcription.provider, 'stub');
  assert.equal(transcription.text, TRANSCRIPT);
  assert.equal(transcription.durationMs, 4200);
  assert.equal(providerCalls.length, 1);
  assert.deepEqual(providerCalls[0], {
    filename: 'audio_1.webm',
    mimeType: 'audio/webm',
    language: 'pt-PT',
  });

  const analysis = await analyzeCapture(container, { captureId: capture.id });
  assert.equal(analysis.status, 'PROPOSAL');
  assert.equal(analysis.interpretation.intent, INTENTS.CREATE_TASK);
  assert.equal(analysis.preview.deadline, '2026-10-04'); // "amanhã" from the clock
  assert.match(analysis.preview.title ?? '', /Estudar PostgreSQL/);

  const { entityType, proposal, entity } = await confirmProposal(container, {
    proposalId: analysis.proposal.id,
  });
  assert.equal(entityType, 'TASK');
  assert.equal(proposal.status, 'CONFIRMED');

  const task = await container.repositories.tasks.findById(entity.id);
  assert.match(task.title, /Estudar PostgreSQL/);
  assert.equal(task.status, 'PENDING');

  // Nothing about the audio itself was persisted (docs/ARCHITECTURE.md #10).
  const { rows } = await context.db.query('select * from captures where id = $1', [capture.id]);
  const row = rows[0];
  assert.equal(row.text_content, null);
  assert.ok(row.hash?.startsWith('sha256:'));
  assert.equal(row.size_bytes, audio.length);
  assert.ok(!('audio' in (row.metadata ?? {})));
  assert.ok(!JSON.stringify(row).includes('audio-bytes-e2e'));

  // Documented audit events (docs/ARCHITECTURE.md #37).
  const captureEvents = await container.repositories.events.listByEntity('CAPTURE', capture.id);
  assert.deepEqual(
    captureEvents.map((event) => event.type),
    ['capture.created'],
  );
  const transcriptionEvents = await container.repositories.events.listByEntity(
    'TRANSCRIPTION',
    transcription.id,
  );
  assert.deepEqual(
    transcriptionEvents.map((event) => event.type),
    ['transcription.completed'],
  );
  assert.equal(transcriptionEvents[0].payload.reused, false);
  assert.equal(transcriptionEvents[0].payload.provider, 'stub');
});

test('the same recording uploaded again reuses the transcription (and says so)', async () => {
  const { container } = context;
  const audio = new TextEncoder().encode('audio-bytes-e2e-0001');
  const callsBefore = providerCalls.length; // one call so far (the first test)

  const second = await captureVoice(container, {
    audio,
    filename: 'audio_1 (copy).webm',
    mimeType: 'audio/webm',
    durationMs: 4200,
    language: 'pt-PT',
  });

  assert.equal(second.reused, true);
  assert.equal(second.transcription.text, TRANSCRIPT);
  assert.equal(second.transcription.provider, `stub${REUSED_PROVIDER_SUFFIX}`);
  assert.equal(second.capture.metadata.reusedFromCaptureId, firstCaptureId);
  assert.equal(providerCalls.length, callsBefore, 'no extra provider call for identical bytes');

  const events = await container.repositories.events.listByEntity(
    'TRANSCRIPTION',
    second.transcription.id,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'transcription.completed');
  assert.equal(events[0].payload.reused, true);
  assert.equal(events[0].payload.sourceCaptureId, second.capture.metadata.reusedFromCaptureId);

  // A third upload of the same bytes still says "+reused" exactly once.
  const third = await captureVoice(container, {
    audio,
    filename: 'audio_1 (copy 2).webm',
    mimeType: 'audio/webm',
  });
  assert.equal(third.transcription.provider, `stub${REUSED_PROVIDER_SUFFIX}`);
  assert.equal(providerCalls.length, callsBefore);

  // Different bytes are transcribed for real.
  const other = new TextEncoder().encode('different-audio-bytes-0002');
  const fresh = await captureVoice(container, { audio: other, filename: 'b.webm', mimeType: 'audio/webm' });
  assert.equal(fresh.reused, false);
  assert.equal(providerCalls.length, callsBefore + 1);
});

test('without a transcription provider the failure is honest and nothing is lost', async () => {
  const strict = await createContainer({ clock: CLOCK, database: context.db });
  strict.transcription = createTranscriptionService({
    provider: createUnconfiguredTranscriptionProvider(),
    logger: { info() {} },
  });

  const audio = new TextEncoder().encode('audio-bytes-unconfigured');
  let failedCaptureId = null;

  await assert.rejects(
    captureVoice(strict, { audio, filename: 'x.webm', mimeType: 'audio/webm', durationMs: 900 }),
    (error) => {
      assert.equal(error.code, 'NOT_CONFIGURED');
      failedCaptureId = error.details.captureId;
      assert.ok(failedCaptureId, 'the error points at the saved capture');
      return true;
    },
  );

  // The recording's provenance was still persisted - nothing silently lost.
  const saved = await strict.repositories.captures.findById(failedCaptureId);
  assert.equal(saved.type, 'VOICE');
  assert.equal(saved.hash, audioHash(audio));
  assert.equal(saved.durationMs, 900);
  const storedTranscription = await strict.repositories.transcriptions.findByCaptureId(failedCaptureId);
  assert.equal(storedTranscription, null);

  // And interpretation refuses instead of fabricating a transcript.
  await assert.rejects(
    analyzeCapture(strict, { captureId: failedCaptureId }),
    (error) => error.code === 'NOT_CONFIGURED',
  );
});

test('empty audio is rejected as a validation error', async () => {
  const { container } = context;
  await assert.rejects(
    captureVoice(container, { audio: new Uint8Array(0), filename: 'empty.webm' }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});

