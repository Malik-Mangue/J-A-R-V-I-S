'use client';

import { useActionState } from 'react';
import { setAutomationAction } from '../../app/actions/capture.js';

const LABELS = {
  TASKS: 'Tarefas',
  PROJECTS: 'Projetos',
  IDEAS: 'Ideias',
  NOTES: 'Notas',
  FINANCE: 'Finanças',
  SUGGESTIONS: 'Sugestões (criar itens na Inbox automaticamente)',
  OBSIDIAN_SYNC: 'Sincronização com Obsidian',
};

/**
 * Automation toggles. Each category is explicitly on or off; the user is the
 * only one who can change it (docs/ARCHITECTURE.md #23).
 */
export default function AutomationForm({ settings, categories }) {
  const [state, action, pending] = useActionState(setAutomationAction, null);
  const list = categories ?? Object.keys(settings ?? {});

  return (
    <form action={action}>
      {list.map((category) => (
        <label key={category} className="row" style={{ alignItems: 'center', gap: 10 }}>
          {/* Unchecked boxes are omitted from the payload: send an explicit "off". */}
          <input type="hidden" name={`automation:${category}`} value="off" />
          <input
            type="checkbox"
            name={`automation:${category}`}
            defaultChecked={settings?.[category] === true}
            style={{ width: 'auto' }}
          />
          <span style={{ margin: 0 }}>{LABELS[category] ?? category}</span>
        </label>
      ))}
      <div className="row" style={{ marginTop: 14 }}>
        <button type="submit" className="primary" disabled={pending}>
          {pending ? 'A guardar…' : 'Guardar'}
        </button>
        {state?.status === 'SAVED' && (
          <span className="alert" data-tone="success" role="status">
            Guardado.
          </span>
        )}
        {state?.status === 'ERROR' && (
          <span className="alert" data-tone="error" role="alert">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}