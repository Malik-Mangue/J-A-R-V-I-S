'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  cancelProposalAction,
  confirmProposalAction,
  correctProposalByVoiceAction,
  updateProposalAction,
} from '../../app/actions/capture.js';
import { describeProposal } from '../../src/application/proposal/preview.js';

/**
 * "ENTENDI:" preview (docs/README.md #10).
 *
 * The user can Confirmar, Editar, Corrigir por voz or Descartar. Nothing is
 * written to the database until Confirmar is pressed.
 */
export default function ProposalPreview({ proposalId, intent, preview }) {
  const [confirmState, confirmAction, confirming] = useActionState(confirmProposalAction, null);
  const [cancelState, cancelAction, cancelling] = useActionState(cancelProposalAction, null);
  const [updateState, updateAction, updating] = useActionState(updateProposalAction, null);
  const [correctionState, correctionAction, correcting] = useActionState(correctProposalByVoiceAction, null);
  const [editing, setEditing] = useState(false);
  const [correctingByVoice, setCorrectingByVoice] = useState(false);

  const payload = updateState?.payload ?? preview ?? {};
  const description = describeProposal(intent, payload);

  useEffect(() => {
    if (updateState?.status === 'UPDATED') setEditing(false);
    if (correctionState?.status === 'PROPOSAL') setCorrectingByVoice(false);
  }, [updateState, correctionState]);

  if (cancelState?.status === 'CANCELLED') {
    return (
      <div className="alert" data-tone="success" role="status">
        Proposta descartada. Nada foi guardado.
      </div>
    );
  }

  if (confirmState?.status === 'CONFIRMED') {
    return (
      <div className="alert" data-tone="success" role="status">
        Guardado como {confirmState.entityType}.
      </div>
    );
  }

  return (
    <section className="card" aria-label="Pré-visualização">
      <h2>Entendi</h2>

      <table className="preview-table">
        <tbody>
          <tr>
            <th scope="row">Tipo</th>
            <td>
              <span className="badge">{description.entity}</span>
            </td>
          </tr>
          {description.fields.map((field) => (
            <tr key={field.label}>
              <th scope="row">{field.label}</th>
              <td>{field.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirmState?.status === 'ERROR' && (
        <div className="alert" data-tone="error" role="alert">
          {confirmState.message}
        </div>
      )}

      {editing ? (
        <form action={updateAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="proposalId" value={proposalId} />
          <label htmlFor="edit-title">Título</label>
          <input id="edit-title" name="title" defaultValue={payload.title ?? payload.name ?? ''} />
          <label htmlFor="edit-temporal">Quando?</label>
          <input
            id="edit-temporal"
            name="temporal"
            placeholder="ex.: sexta, próxima semana, 15/10"
            defaultValue=""
          />
          <p className="item-meta">Escreve em português normal: o sistema converte a data de forma determinística.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" disabled={updating}>
              Guardar alterações
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancelar edição
            </button>
          </div>
        </form>
      ) : (
        <div className="row" style={{ marginTop: 14 }}>
          <form action={confirmAction}>
            <input type="hidden" name="proposalId" value={proposalId} />
            {payload.title ? <input type="hidden" name="title" value={payload.title} /> : null}
            {payload.name ? <input type="hidden" name="name" value={payload.name} /> : null}
            <button type="submit" className="primary" disabled={confirming}>
              Confirmar
            </button>
          </form>
          <button type="button" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" onClick={() => setCorrectingByVoice(true)}>
            Corrigir por voz
          </button>
          <form action={cancelAction}>
            <input type="hidden" name="proposalId" value={proposalId} />
            <button type="submit" className="danger" disabled={cancelling}>
              Descartar
            </button>
          </form>
        </div>
      )}

      {correctingByVoice && (
        <form action={correctionAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="proposalId" value={proposalId} />
          <label htmlFor="correction">O que está errado?</label>
          <input
            id="correction"
            name="correction"
            placeholder="Ex.: não, a data é dia 15"
            autoComplete="off"
          />
          <p className="item-meta">Exemplos: “não, é dia 15”, “o projeto é Gestão Académica”, “é despesa, não tarefa”.</p>
          {correctionState?.status === 'NEEDS_INFORMATION' && (
            <div className="alert" data-tone="question" role="status">
              {(correctionState.questions ?? []).join(' ')}
            </div>
          )}
          {correctionState?.status === 'ERROR' && (
            <div className="alert" data-tone="error" role="alert">
              {correctionState.message}
            </div>
          )}
          {correctionState?.status === 'PROPOSAL' && (
            <div className="alert" data-tone="success" role="status">
              Correção aplicada. Confirma a nova versão.
            </div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button type="submit" disabled={correcting}>
              {correcting ? 'A corrigir…' : 'Aplicar correção'}
            </button>
            <button type="button" onClick={() => setCorrectingByVoice(false)}>
              Fechar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}