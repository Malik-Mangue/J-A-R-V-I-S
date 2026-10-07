/**
 * AI output schemas + validation entry point.
 *
 * Mirrors docs/OUTPUT-SCHEMAS.md. Every AI response is validated here BEFORE it
 * reaches business validation (docs/ARCHITECTURE.md #32). The AI response must
 * be rejected if it fails schema validation.
 */
import { INTENTS, RESPONSE_TYPES } from '../../domain/shared/constants.js';
import { collectSchemaErrors, assertSchema } from './schema.js';
import { ValidationError } from '../errors/index.js';

const INTENT_VALUES = Object.values(INTENTS);
const RESPONSE_TYPE_VALUES = Object.values(RESPONSE_TYPES);

const questionList = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      text: { type: 'string', minLength: 1 },
    },
    required: ['text'],
  },
};

const missingInformation = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      field: { type: 'string', minLength: 1 },
      reason: { type: 'string' },
    },
    required: ['field'],
  },
};

const ambiguities = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      field: { type: 'string' },
      candidates: { type: 'array', items: { type: 'string' } },
    },
    required: ['field'],
  },
};

const uncertainties = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      field: { type: 'string' },
      reason: { type: 'string' },
    },
    required: ['field'],
  },
};

export const INTERPRETATION_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: [RESPONSE_TYPES.INTERPRETATION] },
    intent: { type: 'string', enum: INTENT_VALUES },
    confidence: { type: 'number', min: 0, max: 1 },
    entities: { type: 'object' },
    missingInformation,
    ambiguities,
    uncertainties,
    questions: questionList,
  },
  required: ['type', 'intent', 'confidence', 'entities'],
};

export const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: [RESPONSE_TYPES.QUESTION] },
    reason: { type: 'string' },
    questions: questionList,
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'name'],
      },
    },
  },
  required: ['type', 'questions'],
};

export const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: [RESPONSE_TYPES.PROPOSAL] },
    intent: { type: 'string', enum: INTENT_VALUES },
    proposal: { type: 'object', nullable: true },
    changes: { type: 'array', items: { type: 'object' } },
    warnings: { type: 'array', items: { type: 'string' } },
    uncertainties,
    missingInformation,
  },
  required: ['type', 'intent'],
};

export const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: [RESPONSE_TYPES.SUGGESTION] },
    category: { type: 'string' },
    title: { type: 'string' },
    observation: { type: 'string' },
    evidence: { type: 'array', items: { type: 'object' } },
    suggestion: { type: 'string' },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
  },
  required: ['type', 'category'],
};

export const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: [RESPONSE_TYPES.ANALYSIS] },
    period: {
      type: 'object',
      properties: { start: { type: 'string' }, end: { type: 'string' } },
      required: ['start', 'end'],
    },
    facts: { type: 'array' },
    observations: { type: 'array' },
    patterns: { type: 'array' },
    problems: { type: 'array' },
    suggestions: { type: 'array' },
    futureItems: { type: 'array' },
  },
  required: ['type', 'period'],
};

const SCHEMAS_BY_TYPE = {
  [RESPONSE_TYPES.INTERPRETATION]: INTERPRETATION_SCHEMA,
  [RESPONSE_TYPES.QUESTION]: QUESTION_SCHEMA,
  [RESPONSE_TYPES.PROPOSAL]: PROPOSAL_SCHEMA,
  [RESPONSE_TYPES.SUGGESTION]: SUGGESTION_SCHEMA,
  [RESPONSE_TYPES.ANALYSIS]: ANALYSIS_SCHEMA,
};

/**
 * Validate a raw AI response. Throws ValidationError when the response is not a
 * well-formed, known response type.
 *
 * @param {unknown} response
 * @returns {object} the validated response
 */
export function assertAiResponse(response) {
  if (response === null || typeof response !== 'object') {
    throw new ValidationError('AI response must be a JSON object', { details: { received: typeof response } });
  }
  const type = /** @type {{type?: string}} */ (response).type;
  if (!type || !RESPONSE_TYPE_VALUES.includes(type)) {
    throw new ValidationError(`AI response has an unknown or missing type: ${JSON.stringify(type)}`, {
      details: { allowedTypes: RESPONSE_TYPE_VALUES },
    });
  }
  const schema = SCHEMAS_BY_TYPE[type];
  if (!schema) {
    // SUMMARY / ERROR are accepted as-is (free-form), per docs/AI-CONTRACT.md #13.
    return response;
  }
  return assertSchema(response, schema, `AI ${type} response`);
}

/**
 * Non-throwing variant used by tests and diagnostics.
 * @param {unknown} response
 */
export function validateAiResponse(response) {
  const errors = [];
  if (response === null || typeof response !== 'object') {
    return { valid: false, errors: [{ path: '$', message: 'response must be an object' }] };
  }
  const type = /** @type {{type?: string}} */ (response).type;
  const schema = SCHEMAS_BY_TYPE[type];
  if (!schema) {
    return { valid: false, errors: [{ path: '$.type', message: `unknown response type: ${type}` }] };
  }
  errors.push(...collectSchemaErrors(response, schema));
  return { valid: errors.length === 0, errors };
}
