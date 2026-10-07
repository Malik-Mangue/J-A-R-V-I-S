/**
 * Business validation + proposal payload construction.
 *
 * This is the "Business Validation" step of docs/ARCHITECTURE.md #32 and #3.
 * It is deterministic: it never trusts the AI entities blindly. Temporal
 * expressions are re-resolved with the rule engine, required fields are checked,
 * and the resulting payload is what the user will see in the preview.
 */
import { parseTemporal } from '../../shared/dates/index.js';
import { INTENTS } from '../../domain/shared/constants.js';
import { assertNoDatabaseCommands } from './safety.js';

/** Required business fields per intent. */
const REQUIRED_FIELDS = {
  [INTENTS.CREATE_TASK]: ['title', 'temporal'],
  [INTENTS.CREATE_IDEA]: ['title'],
  [INTENTS.CREATE_PROJECT]: ['name'],
  [INTENTS.CREATE_EXPENSE]: ['amountMinor'],
  [INTENTS.CREATE_INCOME]: ['amountMinor'],
  [INTENTS.CAPTURE_NOTE]: ['text'],
};

/**
 * @param {object} input
 * @param {object} input.capture
 * @param {object} input.interpretation
 * @param {object} input.response    validated AI response
 * @param {string} input.currentDate ISO date
 * @param {string} input.timezone
 * @returns {{ actionable: boolean, intent: string, payload: object|null, changes: object[], warnings: string[], missingInformation: object[] }}
 */
export function buildProposalPayload(input) {
  const { capture, interpretation, response } = input;
  const text = capture.text ?? response.transcript ?? '';
  const entities = interpretation.entities ?? {};
  const intent = interpretation.intent;

  // Defence in depth: refuse any attempt to smuggle a database operation.
  assertNoDatabaseCommands(entities, 'entities');

  const temporal = parseTemporal(text, {
    now: new Date(`${input.currentDate}T12:00:00Z`),
    timezone: input.timezone,
  });

  const missingInformation = [...(interpretation.missingInformation ?? [])];
  const warnings = [...(interpretation.uncertainties ?? []).map((u) => u.reason ?? `Incerteza em ${u.field}`)];

  // docs/AI-CONTRACT.md #9 + docs/ARCHITECTURE.md rule 6: when several entities
  // are plausible the system must ASK. An unresolved ambiguity is therefore
  // blocking - the proposal is not created.
  for (const ambiguity of interpretation.ambiguities ?? []) {
    if (!missingInformation.some((item) => item.field === ambiguity.field)) {
      missingInformation.push({
        field: ambiguity.field,
        reason: `Há mais do que uma entidade possível (${(ambiguity.candidates ?? []).join(', ')}).`,
      });
    }
  }

  let payload = null;

  switch (intent) {
    case INTENTS.CREATE_TASK: {
      const deadline = temporal.deadline ?? entities.deadline ?? null;
      const period = temporal.period ?? entities.period ?? null;
      payload = {
        title: entities.title ?? null,
        description: entities.description ?? null,
        deadline,
        period,
        priority: entities.priority ?? null,
        projectId: entities.projectId ?? null,
        time: temporal.time ?? entities.time ?? null,
      };
      break;
    }
    case INTENTS.CREATE_IDEA: {
      payload = {
        title: entities.title ?? null,
        description: entities.description ?? null,
        projectId: entities.projectId ?? null,
      };
      break;
    }
    case INTENTS.CREATE_PROJECT: {
      payload = {
        name: entities.title ?? entities.name ?? null,
        objective: entities.objective ?? null,
        description: entities.description ?? null,
        deadline: temporal.deadline ?? entities.deadline ?? null,
      };
      break;
    }
    case INTENTS.CREATE_EXPENSE:
    case INTENTS.CREATE_INCOME: {
      payload = {
        type: intent === INTENTS.CREATE_EXPENSE ? 'EXPENSE' : 'INCOME',
        amountMinor: entities.amountMinor ?? null,
        currency: entities.currency ?? 'MZN',
        category: entities.category ?? 'OUTROS',
        description: entities.description ?? entities.title ?? null,
        occurredOn: input.currentDate,
      };
      break;
    }
    case INTENTS.CAPTURE_NOTE:
    default: {
      payload = { text: text.trim() };
      break;
    }
  }

  // Deterministic completeness check.
  const required = REQUIRED_FIELDS[intent] ?? [];
  for (const field of required) {
    if (field === 'temporal') {
      if (!payload.deadline && !payload.period && !missingInformation.some((m) => m.field === 'deadline')) {
        missingInformation.push({
          field: 'deadline',
          reason: 'Uma tarefa precisa de uma data concreta ou de um período.',
        });
      }
      continue;
    }
    if (payload[field] === null || payload[field] === undefined || payload[field] === '') {
      if (!missingInformation.some((m) => m.field === field)) {
        missingInformation.push({ field, reason: 'Informação em falta.' });
      }
    }
  }

  const actionable = missingInformation.length === 0;
  return {
    actionable,
    intent,
    payload,
    changes: toChanges(payload),
    warnings: [...new Set(warnings)],
    missingInformation,
    temporal,
  };
}

/** @param {object|null} payload */
function toChanges(payload) {
  if (!payload) return [];
  return Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([field, value]) => ({ field, value }));
}
