/**
 * FinanceEntry domain entity.
 *
 * Financial records require special care: never invent monetary values
 * (docs/MASTER-PROMPT.md #12). Amounts are integer minor units.
 */
import { ValidationError } from '../../shared/errors/index.js';
import { newId, nowIso } from '../../shared/ids/index.js';
import { isValidIsoDate } from '../../shared/dates/index.js';
import { FINANCE_ENTRY_TYPES } from '../shared/constants.js';
import { assertSupportedCurrency, parseAmountToMinor } from './money.js';

const ENTRY_TYPES = Object.values(FINANCE_ENTRY_TYPES);

/**
 * @typedef {object} FinanceEntry
 * @property {string} id
 * @property {string} userId
 * @property {string} type               INCOME | EXPENSE | TRANSFER
 * @property {number} amountMinor
 * @property {string} currency
 * @property {string} category
 * @property {string|null} description
 * @property {string} occurredOn         ISO date
 * @property {string} source
 * @property {object|null} provenance
 * @property {string} createdAt
 */

/**
 * @param {object} input
 * @param {object} [meta]
 * @param {string} [meta.referenceDate] used when occurredOn is not supplied
 * @param {string} [meta.defaultCurrency] user-configured currency, never invented
 * @returns {FinanceEntry}
 */
export function createFinanceEntry(input, meta = {}) {
  const type = String(input.type ?? '').toUpperCase();
  if (!ENTRY_TYPES.includes(type)) {
    throw new ValidationError(`Tipo de registo financeiro inválido: ${input.type}`, {
      details: { field: 'type', allowed: ENTRY_TYPES },
    });
  }

  // docs/SYSTEM-PROMPT.md: "If the currency is unknown and it matters, ask."
  // The currency must come from the statement or from the user's configuration;
  // the system never assumes one.
  const currencyInput = input.currency ?? meta.defaultCurrency ?? null;
  if (!currencyInput) {
    throw new ValidationError('Indica a moeda do registo (por exemplo: MZN).', {
      details: { field: 'currency' },
    });
  }
  const currency = assertSupportedCurrency(String(currencyInput).toUpperCase());
  const amountMinor =
    input.amountMinor !== undefined ? Math.round(Number(input.amountMinor)) : parseAmountToMinor(input.amount);

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new ValidationError('O valor financeiro tem de ser um número positivo.', {
      details: { field: 'amount' },
    });
  }

  const occurredOn = input.occurredOn ?? meta.referenceDate ?? null;
  if (!occurredOn || !isValidIsoDate(occurredOn)) {
    throw new ValidationError('É necessário indicar a data do registo financeiro.', {
      details: { field: 'occurredOn' },
    });
  }

  return {
    id: meta.id ?? newId('financeEntry'),
    userId: meta.userId ?? 'user_local',
    type,
    amountMinor,
    currency,
    category: String(input.category ?? 'OUTROS').toUpperCase(),
    description: String(input.description ?? '').trim() || null,
    occurredOn,
    source: input.source ?? 'capture',
    provenance: input.provenance ?? null,
    createdAt: meta.createdAt ?? nowIso(),
  };
}
