'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Voice capture.
 *
 * Two transcription paths, both real:
 *
 *  1. On-device (default): the browser's Speech Recognition produces the text
 *     and it enters the normal capture pipeline. No API key required.
 *  2. Server-side: when on-device recognition is unavailable (or produced no
 *     text), the audio is uploaded to the audio endpoint, which transcribes it
 *     through the configured transcription provider.
 *
 * Robustness rules:
 *  - the microphone is always released, including when the page is left;
 *  - a recording has a visible timer and a hard limit (3 minutes) so it can
 *    never grow into an upload the server has to reject;
 *  - a failed upload keeps the audio in memory and can be retried manually or
 *    automatically when the connection returns: an offline capture is never
 *    silently thrown away;
 *  - the original audio is never stored by the application
 *    (docs/ARCHITECTURE.md #10).
 */

const MAX_RECORDING_MS = 3 * 60 * 1000; // 3 minutes
const TICK_MS = 250;

export default function VoiceRecorder({ onTranscript, onAnalysis, disabled }) {
  const [state, setState] = useState({ status: 'IDLE' });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [interim, setInterim] = useState('');

  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptRef = useRef('');
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const autoStoppedRef = useRef(false);
  /** Last recording kept for retry: { blob, durationMs }. */
  const pendingRef = useRef(null);
  const uploadRef = useRef(null);
  const stopRef = useRef(null);

  function startRecording() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState({ status: 'ERROR', message: 'Este dispositivo não permite gravar áudio.' });
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];
        transcriptRef.current = '';
        autoStoppedRef.current = false;
        setInterim('');
        setElapsedMs(0);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          if (streamRef.current === stream) streamRef.current = null;
          const durationMs = Date.now() - startedAtRef.current;
          const transcript = transcriptRef.current.trim();
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
          chunksRef.current = [];

          if (transcript) {
            pendingRef.current = null;
            setState({
              status: 'DONE',
              note: autoStoppedRef.current
                ? 'Gravação terminada ao atingir o limite de 3 minutos.'
                : undefined,
            });
            onTranscript?.(transcript);
            return;
          }
          await uploadRef.current?.(blob, durationMs);
        };

        recorder.start();
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setState({ status: 'RECORDING' });
        startRecognition();
      })
      .catch(() => setState({ status: 'ERROR', message: 'Permissão de microfone recusada.' }));
  }

  function startRecognition() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return; // server-side transcription will be used instead

    try {
      const recognition = new Recognition();
      recognition.lang = navigator.language?.startsWith('pt') ? navigator.language : 'pt-PT';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let live = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            transcriptRef.current += `${result[0].transcript} `;
          } else {
            live += result[0].transcript;
          }
        }
        setInterim(live.trim());
      };
      // If on-device recognition fails (unsupported language, network…), the
      // recording still stops normally and the upload path takes over.
      recognition.onerror = () => {};
      recognition.onend = () => setInterim('');
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }

  function stopRecording({ auto = false } = {}) {
    autoStoppedRef.current = auto;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* recognition already stopped */
    }
    recognitionRef.current = null;
    setInterim('');
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  async function upload(blob, durationMs) {
    pendingRef.current = { blob, durationMs };
    setState({ status: 'UPLOADING' });

    const formData = new FormData();
    const extension = (blob.type.split('/')[1] || 'webm').split(';')[0];
    formData.append('audio', blob, `audio_${Date.now()}.${extension}`);
    formData.append('durationMs', String(Math.max(0, Math.round(durationMs))));
    if (typeof navigator !== 'undefined' && navigator.language) {
      formData.append('language', navigator.language);
    }

    try {
      const response = await fetch('/api/capture/audio', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok || payload.status === 'ERROR') {
        setState({ status: 'FAILED', message: payload.message ?? 'Falha ao processar o áudio.' });
        return;
      }
      pendingRef.current = null;
      setState({ status: 'DONE' });
      onAnalysis?.(payload);
    } catch {
      setState({
        status: 'FAILED',
        message:
          'Sem ligação ao servidor. A gravação fica guardada neste dispositivo e pode ser reenviada.',
      });
    }
  }

  uploadRef.current = upload;
  stopRef.current = stopRecording;

  /** Live timer while recording; also enforces the maximum length. */
  useEffect(() => {
    if (state.status !== 'RECORDING') return undefined;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS) stopRef.current?.({ auto: true });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [state.status]);

  /** A failed upload is retried automatically as soon as the network returns. */
  useEffect(() => {
    if (state.status !== 'FAILED' || typeof window === 'undefined') return undefined;
    const retry = () => {
      const pending = pendingRef.current;
      if (pending) uploadRef.current?.(pending.blob, pending.durationMs);
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [state.status]);

  /** Never leave the microphone running (docs: privacy, mobile-first PWA). */
  useEffect(
    () => () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* recognition already stopped */
      }
      recognitionRef.current = null;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null; // discard the in-flight recording on unmount
        try {
          recorder.stop();
        } catch {
          /* recorder already stopped */
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [],
  );

  const recording = state.status === 'RECORDING';
  const uploading = state.status === 'UPLOADING';

  return (
    <section className="card">
      <h2>Captura por voz</h2>

      <button
        type="button"
        className={`record-button ${recording ? 'recording' : ''}`}
        onClick={recording ? () => stopRecording() : startRecording}
        disabled={disabled || uploading}
        aria-pressed={recording}
      >
        {recording ? '● A gravar — toca para parar' : '🎙 Gravar'}
      </button>

      {recording && (
        <p className="item-meta" role="timer">
          {formatElapsed(elapsedMs)} de {formatElapsed(MAX_RECORDING_MS)}
          {interim ? ` · “${interim}”` : ''}
        </p>
      )}

      {uploading && <p className="item-meta">A transcrever no servidor…</p>}

      {state.status === 'DONE' && state.note && (
        <p className="item-meta" role="status">
          {state.note}
        </p>
      )}

      {state.status === 'FAILED' && (
        <div className="alert" data-tone="error" role="alert">
          <p>{state.message}</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                const pending = pendingRef.current;
                if (pending) upload(pending.blob, pending.durationMs);
              }}
              disabled={uploading}
            >
              Repetir envio
            </button>
            <button
              type="button"
              onClick={() => {
                pendingRef.current = null;
                setState({ status: 'IDLE' });
              }}
            >
              Descartar gravação
            </button>
          </div>
          <p className="item-meta">Também tentamos de novo sozinhos quando a ligação voltar.</p>
        </div>
      )}

      {state.status === 'ERROR' && (
        <div className="alert" data-tone="error" role="alert">
          {state.message} Podes escrever o que querias dizer em baixo.
        </div>
      )}
    </section>
  );
}

/** 0 -> "0:00", 65000 -> "1:05". */
function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac'];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? null;
}