/**
 * Interpretation domain entity.
 *
 * An Interpretation is the structured, *unconfirmed* reading of a capture
 * produced by the AI layer. It is never a fact: only a confirmed Proposal leads
 * to domain data (docs/ARCHITECTURE.md #3).
 */
import { ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { INTENTS } from '../shared/constants.js';

const INTENT_VALUES = Object.values(INTENTS);

/**
 * @typedef {object} Interpretation
 * @property {string} id
 * @property {string} userId
 * @property {string} captureId
 * @property {string|null} transcriptionId
 * @property {string} intent
 * @property {number} confidence
 * @property {object} entities
 * @property {Array<{field: string, reason?: string}>} missingInformation
 * @property {Array<{field: string, candidates?: string[]}>} ambiguities
 * @property {Array<{field: string, reason?: string}>} uncertainties
 * @property {Array<{id?: string, text: string}>} questions
 * @property {string} createdAt
 */

/**
 * @param {object} input
 * @param {object} [meta]
 * @returns {Interpretation}
 */
export function createInterpretation(input, meta = {}) {
  const intent = String(input.intent ?? '');
  if (!INTENT_VALUES.includes(intent)) {
    throw new ValidationError(`Intenção desconhecida: ${input.intent}`, {
      details: { field: 'intent', allowed: INTENT_VALUES },
    });
  }
  if (!input.captureId) {
    throw new ValidationError('Uma interpretação precisa de uma captura de origem.', {
      details: { field: 'captureId' },
    });
  }
  const confidence = Number(input.confidence);
  return {
    id: meta.id ?? newId('interpretation'),
    userId: meta.userId ?? 'user_local',
    captureId: input.captureId,
    transcriptionId: input.transcriptionId ?? null,
    intent,
    confidence: Number.isFinite(confidence) ? clamp01(confidence) : 0,
    entities: input.entities ?? {},
    missingInformation: arrayOrEmpty(input.missingInformation),
    ambiguities: arrayOrEmpty(input.ambiguities),
    uncertainties: arrayOrEmpty(input.uncertainties),
    questions: arrayOrEmpty(input.questions),
    createdAt: meta.createdAt ?? nowIso(),
  };
}

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}
