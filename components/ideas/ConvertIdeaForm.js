'use client';

import { useActionState } from 'react';
import { convertIdeaAction } from '../../app/actions/capture.js';

/**
 * Explicit idea conversion (docs/ARCHITECTURE.md rule 3).
 *
 * A task needs an adequate temporal reference; when it is missing the use case
 * answers with the question, which is rendered here.
 */
export default function ConvertIdeaForm({ idea }) {
  const [state, action, pending] = useActionState(convertIdeaAction, null);

  return (
    <form action={action} className="row" style={{ marginBottom: 10 }}>
      <input type="hidden" name="ideaId" value={idea.id} />
      <div style={{ flexBasis: '100%' }}>
        <label htmlFor={`temporal-${idea.id}`}>Quando? (obrigatório para tarefa)</label>
        <input
          id={`temporal-${idea.id}`}
          name="temporal"
          placeholder="ex.: sexta, próxima semana, 15/10, mais tarde"
          autoComplete="off"
        />
      </div>
      <button type="submit" name="target" value="TASK" disabled={pending}>
        Criar tarefa
      </button>
      <button type="submit" name="target" value="PROJECT" disabled={pending}>
        Criar projeto
      </button>

      {state?.status === 'ERROR' && (
        <div className="alert" data-tone="error" role="alert" style={{ flexBasis: '100%' }}>
          {state.message}
        </div>
      )}
      {state?.status === 'CONVERTED' && (
        <div className="alert" data-tone="success" role="status" style={{ flexBasis: '100%' }}>
          Convertida em {state.entityType === 'PROJECT' ? 'projeto' : 'tarefa'}.
        </div>
      )}
    </form>
  );
}