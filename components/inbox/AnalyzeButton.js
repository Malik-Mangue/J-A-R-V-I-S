'use client';

import { useActionState } from 'react';
import { generateSuggestionsAction } from '../../app/actions/capture.js';

/**
 * Manual trigger for the suggestion detector. Running the analysis is not the
 * same as creating inbox items: materialising suggestions still requires the
 * SUGGESTIONS automation to be enabled (docs/ARCHITECTURE.md #22).
 */
export default function AnalyzeButton() {
  const [state, action, pending] = useActionState(generateSuggestionsAction, null);

  return (
    <>
      <form action={action}>
        <button type="submit" disabled={pending}>
          {pending ? 'A analisar…' : 'Analisar agora'}
        </button>
      </form>
      {state?.status === 'SKIPPED' && (
        <div className="alert" data-tone="question" role="status">
          {state.reason ?? 'Nada foi criado.'} Activa a automação em Definições se quiseres sugestões automáticas.
        </div>
      )}
      {state?.status === 'OK' && (
        <div className="alert" data-tone="success" role="status">
          {state.created === 0 ? 'Sem sugestões novas.' : `${state.created} sugestão(ões) criada(s) na Inbox.`}
        </div>
      )}
      {state?.status === 'ERROR' && (
        <div className="alert" data-tone="error" role="alert">
          {state.message}
        </div>
      )}
    </>
  );
}