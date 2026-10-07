/**
 * Money value object.
 *
 * docs/ARCHITECTURE.md #21: "Não utilizar float JavaScript como fonte de
 * verdade para dinheiro." Amounts are stored as integer *minor units*
 * (cents/centavos) plus an ISO currency code. Formatting to a decimal string
 * happens only at the presentation boundary.
 */
import { ValidationError } from '../../shared/errors/index.js';
import { CURRENCIES } from '../shared/constants.js';

export const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Parse a human monetary string/number into integer minor units.
 * Accepts "46", "46,50", "1.234,56", "1,234.56", "46.5".
 *
 * @param {string|number} value
 * @returns {number} integer minor units
 */
export function parseAmountToMinor(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ValidationError('Valor monetário inválido.', { details: { value } });
    }
    return Math.round(value * MINOR_UNITS_PER_MAJOR);
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    throw new ValidationError('Valor monetário em falta.', { details: { field: 'amount' } });
  }

  // Remove currency words ("meticais", "MZN", "euros") and any text around the
  // number, keeping only the numeric characters and separators.
  const cleaned = raw.replace(/[^\d.,\-+]/g, '').trim();
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized;

  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator comes last is the decimal separator.
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = cleaned.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  } else if (lastComma !== -1) {
    normalized = cleaned.replace(',', '.');
  } else {
    normalized = cleaned;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new ValidationError(`Não foi possível interpretar o valor monetário: ${value}`, {
      details: { value },
    });
  }

  const [major, fraction = ''] = normalized.split('.');
  const sign = major.startsWith('-') ? -1 : 1;
  const majorAbs = Math.abs(Number(major));
  const fractionPadded = (fraction + '00').slice(0, 2);
  return sign * (majorAbs * MINOR_UNITS_PER_MAJOR + Number(fractionPadded));
}

/**
 * Format integer minor units for display, e.g. 4600 -> "46,00 MZN".
 * @param {number} minor
 * @param {string} currency
 */
export function formatMinor(minor, currency = 'MZN') {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const major = Math.floor(abs / MINOR_UNITS_PER_MAJOR);
  const cents = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, '0');
  return `${sign}${major},${cents} ${currency}`;
}

/** @param {string} currency */
export function assertSupportedCurrency(currency) {
  if (!CURRENCIES.includes(currency)) {
    throw new ValidationError(`Moeda não suportada: ${currency}`, {
      details: { field: 'currency', allowed: CURRENCIES },
    });
  }
  return currency;
}
