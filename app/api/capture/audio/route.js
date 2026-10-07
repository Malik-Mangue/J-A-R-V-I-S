import { NextResponse } from 'next/server';
import { getContainer } from '../../../../src/application/container.js';
import { captureVoice } from '../../../../src/application/capture/captureVoice.js';
import { parseAudioUpload } from '../../../../src/application/capture/audioUpload.js';
import { analyzeCapture } from '../../../../src/application/proposal/createProposal.js';
import { isAppError } from '../../../../src/shared/errors/index.js';

/**
 * Audio upload endpoint.
 *
 * This is one of the cases where a real HTTP interface IS needed: the browser
 * posts a multipart file upload (docs/ARCHITECTURE.md #30).
 *
 * The uploaded audio is processed transiently: the original file is never stored
 * in the database, only provenance metadata and the resulting transcription
 * (docs/ARCHITECTURE.md #10).
 *
 * All validation lives in `parseAudioUpload` (pure, unit-tested); this handler
 * only adapts HTTP <-> application layer.
 */

export const runtime = 'nodejs';

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ status: 'ERROR', message: 'Pedido inválido.' }, { status: 400 });
  }

  const parsed = parseAudioUpload({
    file: formData.get('audio'),
    durationMs: formData.get('durationMs'),
    language: formData.get('language'),
  });
  if (!parsed.ok) {
    return NextResponse.json({ status: 'ERROR', message: parsed.message }, { status: parsed.status });
  }

  try {
    const container = await getContainer();
    const audio = new Uint8Array(await formData.get('audio').arrayBuffer());

    const { capture, transcription, reused } = await captureVoice(container, {
      audio,
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      durationMs: parsed.durationMs ?? undefined,
      language: parsed.language ?? undefined,
    });

    const analysis = await analyzeCapture(container, { captureId: capture.id });

    return NextResponse.json({
      status: analysis.status,
      source: 'voice',
      transcript: transcription.text,
      provider: transcription.provider,
      transcriptionLanguage: transcription.language,
      reused,
      durationMs: capture.durationMs,
      captureId: capture.id,
      proposalId: analysis.proposal?.id ?? null,
      preview: analysis.preview,
      intent: analysis.interpretation.intent,
      questions: analysis.questions.map((question) => question.text),
      missingInformation: analysis.missingInformation,
      warnings: analysis.warnings,
      confidence: analysis.interpretation.confidence,
    });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === 'NOT_CONFIGURED' ? 503 : error.code === 'VALIDATION_ERROR' ? 400 : 500;
      return NextResponse.json(
        { status: 'ERROR', code: error.code, message: error.message, details: error.details },
        { status },
      );
    }
    return NextResponse.json({ status: 'ERROR', message: 'Não foi possível processar o áudio.' }, { status: 500 });
  }
}