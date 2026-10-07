'use client';

import { useActionState, useState } from 'react';
import { captureTextAction } from '../../app/actions/capture.js';
import VoiceRecorder from './VoiceRecorder.js';
import ProposalPreview from './ProposalPreview.js';

/**
 * Capture panel: the fastest path from thought to structured data
 * (docs/ARCHITECTURE.md #39: Abrir -> Falar -> Confirmar).
 *
 * The component only manages UI state; every decision is taken by the
 * application/domain layers through server actions.
 */
export default function CapturePanel({ initialAnalysis = null }) {
  const [state, formAction, pending] = useActionState(captureTextAction, null);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [draft, setDraft] = useState('');
  /** Where the current text came from: { source: 'device' | 'server', transcript, provider }. */
  const [provenance, setProvenance] = useState(null);

  const current = analysis ?? state;

  /**
   * On-device transcription: the spoken text enters the same capture pipeline
   * as typed text, so voice and text behave identically from here on.
   */
  async function handleTranscript(text) {
    setDraft(text);
    setAnalysis(null);
    setProvenance({ source: 'device', transcript: text, provider: null });
    const formData = new FormData();
    formData.set('text', text);
    await formAction(formData);
  }

  /**
   * Server-side transcription: the transcript is shown and pre-filled so the
   * user can verify (and correct) what the system actually heard.
   */
  function handleAnalysis(payload) {
    setAnalysis(payload);
    if (payload?.transcript) {
      setDraft(payload.transcript);
      setProvenance({
        source: payload.source ?? 'server',
        transcript: payload.transcript,
        provider: payload.provider ?? null,
      });
    }
  }

  return (
    <>
      <VoiceRecorder onTranscript={handleTranscript} onAnalysis={handleAnalysis} />

      {provenance?.transcript && (
        <p className="item-meta" role="status">
          🎙 {provenance.source === 'device' ? 'Ditado (reconhecimento no dispositivo)' : 'Transcrição no servidor'}
          {provenance.provider ? ` · ${provenance.provider}` : ''}: “{provenance.transcript}” — edita em
          baixo se algo estiver errado.
        </p>
      )}

      <section className="card">
        <h2>Captura por texto</h2>
        <form action={formAction}>
          <label htmlFor="capture-text">O que tens em mente?</label>
          <textarea
            id="capture-text"
            name="text"
            placeholder="Ex.: Preciso terminar o módulo de autenticação até sexta-feira."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button type="submit" className="primary" disabled={pending}>
              {pending ? 'A interpretar…' : 'Interpretar'}
            </button>
          </div>
        </form>

        {state?.status === 'ERROR' && (
          <div className="alert" data-tone="error" role="alert">
            {state.message}
          </div>
        )}

        {current?.status === 'NEEDS_INFORMATION' && (
          <div className="alert" data-tone="question" role="status">
            <strong>Falta informação para criar isto.</strong>
            <ul>
              {current.questions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
            <p className="item-meta">Responde por escrito (ou por voz) e o sistema volta a interpretar.</p>
          </div>
        )}
      </section>

      {current?.status === 'PROPOSAL' && current.proposalId && (
        <ProposalPreview proposalId={current.proposalId} intent={current.intent} preview={current.preview} />
      )}

      {current?.status === 'PROPOSAL' && current.warnings?.length > 0 && (
        <div className="alert" data-tone="question">
          {current.warnings.join(' · ')}
        </div>
      )}
    </>
  );
}