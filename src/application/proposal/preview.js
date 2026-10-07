/**
 * Proposal preview formatting.
 *
 * docs/README.md #10 defines the "ENTENDI:" preview shown before confirmation.
 * Formatting lives in the application layer so React components stay dumb.
 */
import { formatIsoForDisplay } from '../../shared/dates/index.js';
import { formatMinor } from '../../domain/finance/money.js';
import { INTENTS } from '../../domain/shared/constants.js';

const LABELS = {
  [INTENTS.CREATE_TASK]: { entity: 'Tarefa', fields: { title: 'Título', description: 'Descrição', deadline: 'Data', period: 'Período', priority: 'Prioridade', projectId: 'Projeto' } },
  [INTENTS.CREATE_IDEA]: { entity: 'Ideia', fields: { title: 'Título', description: 'Descrição', projectId: 'Projeto' } },
  [INTENTS.CREATE_PROJECT]: { entity: 'Projeto', fields: { name: 'Nome', objective: 'Objetivo', description: 'Descrição', deadline: 'Prazo' } },
  [INTENTS.CREATE_EXPENSE]: { entity: 'Despesa', fields: { amountMinor: 'Valor', currency: 'Moeda', category: 'Categoria', description: 'Descrição', occurredOn: 'Data' } },
  [INTENTS.CREATE_INCOME]: { entity: 'Receita', fields: { amountMinor: 'Valor', currency: 'Moeda', category: 'Categoria', description: 'Descrição', occurredOn: 'Data' } },
  [INTENTS.CAPTURE_NOTE]: { entity: 'Nota', fields: { text: 'Conteúdo' } },
};

/**
 * @param {string} intent
 * @param {object|null} payload
 * @returns {{ entity: string, fields: {label: string, value: string, raw: unknown}[] }}
 */
export function describeProposal(intent, payload) {
  const labels = LABELS[intent] ?? { entity: 'Registo', fields: {} };
  const source = payload ?? {};
  const currency = source.currency ?? 'MZN';
  const fields = Object.entries(labels.fields).map(([key, label]) => ({
    label,
    value: formatValue(key, source[key], currency),
    raw: source[key],
  }));
  return { entity: labels.entity, fields: fields.filter((field) => field.value !== '—') };
}

function formatValue(key, value, currency) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'deadline' || key === 'occurredOn') return formatIsoForDisplay(String(value));
  if (key === 'amountMinor') return formatMinor(Number(value), currency);
  if (key === 'period' && typeof value === 'object') return String(value.label ?? `${value.start} – ${value.end}`);
  return String(value);
}