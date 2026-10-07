/**
 * Proposal domain entity.
 *
 * A Proposal is the bridge between an AI interpretation and a confirmed domain
 * command. The application executes a command ONLY after the user confirms
 * (docs/AI-CONTRACT.md #3/#4, docs/ARCHITECTURE.md #9).
 */
import { ConflictError, ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { PROPOSAL_STATUS } from '../shared/constants.js';

/**
 * @typedef {object} Proposal
 * @property {string} id
 * @property {string} userId
 * @property {string} captureId
 * @property {string|null} interpretationId
 * @property {string} intent
 * @property {object|null} payload
 * @property {Array<object>} changes
 * @property {string[]} warnings
 * @property {string} status
 * @property {string} createdAt
 * @property {string|null} resolvedAt
 * @property {string|null} resultEntityId
 * @property {string|null} resultEntityType
 * @property {string|null} cancellationReason
 */

/**
 * @param {object} input
 * @param {object} [meta]
 * @returns {Proposal}
 */
export function createProposal(input, meta = {}) {
  if (!input.captureId) {
    throw new ValidationError('Uma proposta precisa de uma captura de origem.', { details: { field: 'captureId' } });
  }
  if (!input.intent) {
    throw new ValidationError('Uma proposta precisa de uma intenção.', { details: { field: 'intent' } });
  }
  return {
    id: meta.id ?? newId('proposal'),
    userId: meta.userId ?? 'user_local',
    captureId: input.captureId,
    interpretationId: input.interpretationId ?? null,
    intent: input.intent,
    payload: input.payload ?? null,
    changes: Array.isArray(input.changes) ? input.changes : [],
    warnings: Array.isArray(input.warnings) ? input.warnings : [],
    status: PROPOSAL_STATUS.PENDING,
    createdAt: meta.createdAt ?? nowIso(),
    resolvedAt: null,
    resultEntityId: null,
    resultEntityType: null,
    cancellationReason: null,
  };
}

/**
 * Replace a proposal's payload (user edit / voice correction). The proposal
 * keeps its origin for provenance but records the edit as a change.
 *
 * @param {Proposal} proposal
 * @param {{ payload: object, changes?: Array<object>, updatedAt?: string }} input
 * @returns {Proposal}
 */
export function editProposal(proposal, input) {
  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw new ConflictError('Só é possível editar propostas pendentes.', {
      details: { status: proposal.status },
    });
  }
  return {
    ...proposal,
    payload: input.payload ?? proposal.payload,
    changes: [...proposal.changes, ...(Array.isArray(input.changes) ? input.changes : [])],
  };
}

/**
 * @param {Proposal} proposal
 * @param {{ confirmedAt?: string, resultEntityId: string, resultEntityType: string }} input
 * @returns {Proposal}
 */
export function confirmProposal(proposal, input) {
  if (proposal.status === PROPOSAL_STATUS.CONFIRMED) return proposal;
  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw new ConflictError(`Não é possível confirmar uma proposta ${proposal.status.toLowerCase()}.`, {
      details: { status: proposal.status },
    });
  }
  if (!input.resultEntityId || !input.resultEntityType) {
    throw new ValidationError('Confirmar exige a entidade criada pelo comando.');
  }
  const at = input.confirmedAt ?? nowIso();
  return {
    ...proposal,
    status: PROPOSAL_STATUS.CONFIRMED,
    resolvedAt: at,
    resultEntityId: input.resultEntityId,
    resultEntityType: input.resultEntityType,
  };
}

/**
 * @param {Proposal} proposal
 * @param {{ cancelledAt?: string, reason?: string }} [input]
 * @returns {Proposal}
 */
export function cancelProposal(proposal, input = {}) {
  if (proposal.status === PROPOSAL_STATUS.CANCELLED) return proposal;
  if (proposal.status !== PROPOSAL_STATUS.PENDING) {
    throw new ConflictError(`Não é possível cancelar uma proposta ${proposal.status.toLowerCase()}.`, {
      details: { status: proposal.status },
    });
  }
  return {
    ...proposal,
    status: PROPOSAL_STATUS.CANCELLED,
    resolvedAt: input.cancelledAt ?? nowIso(),
    cancellationReason: input.reason ?? null,
  };
}

/**
 * Mark a pending proposal as superseded by a newer interpretation of a
 * correction capture.
 * @param {Proposal} proposal
 * @param {{ updatedAt?: string }} [input]
 * @returns {Proposal}
 */
export function supersedeProposal(proposal, input = {}) {
  if (proposal.status !== PROPOSAL_STATUS.PENDING) return proposal;
  return { ...proposal, status: PROPOSAL_STATUS.SUPERSEDED, resolvedAt: input.updatedAt ?? nowIso() };
}
