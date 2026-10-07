/**
 * Timezone-aware calendar helpers.
 *
 * The whole system reasons about *local calendar dates* (the user's day),
 * never about raw UTC timestamps, because "sexta-feira" must mean Friday in the
 * user's timezone (docs/ARCHITECTURE.md #15 Temporal Intelligence).
 *
 * A "date" in this module is a plain object `{ year, month, day }` (month is
 * 1-based). Serialized form is the ISO calendar date `YYYY-MM-DD`.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @typedef {{ year: number, month: number, day: number }} DateParts
 */

/** Remove diacritics and lowercase, for robust keyword matching. */
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Extract the local calendar date for an instant in a given IANA timezone.
 * @param {Date} [instant]
 * @param {string} [timezone]
 * @returns {DateParts}
 */
export function toLocalDateParts(instant = new Date(), timezone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(instant);
  const pick = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

/**
 * Extract the local wall-clock time (HH:MM) for an instant in a timezone.
 * @param {Date} [instant]
 * @param {string} [timezone]
 * @returns {string}
 */
export function toLocalTime(instant = new Date(), timezone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(instant);
}

/** @param {DateParts} parts */
export function toIsoDate(parts) {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @param {string} iso */
export function fromIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function isValidIsoDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
  const { year, month, day } = fromIsoDate(iso);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Add (or subtract) days from a calendar date.
 * @param {DateParts} parts
 * @param {number} days
 * @returns {DateParts}
 */
export function addDays(parts, days) {
  const base = Date.UTC(parts.year, parts.month - 1, parts.day) + days * MS_PER_DAY;
  const d = new Date(base);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Day of week, 0 = Sunday … 6 = Saturday (calendar-safe, UTC arithmetic).
 * @param {DateParts} parts
 */
export function weekday(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** Monday-based start of week, as required by the pt-PT calendar convention. */
export function startOfWeek(parts) {
  const wd = weekday(parts); // 0=Sun … 6=Sat
  const offset = (wd + 6) % 7; // number of days since Monday
  return addDays(parts, -offset);
}

export function endOfWeek(parts) {
  return addDays(startOfWeek(parts), 6);
}

export function startOfMonth(parts) {
  return { year: parts.year, month: parts.month, day: 1 };
}

export function endOfMonth(parts) {
  return { year: parts.year, month: parts.month, day: daysInMonth(parts.year, parts.month) };
}

/** 1 = first half (1–15), 2 = second half (16–end). */
export function halfOfMonth(parts, half) {
  if (half === 1) {
    return { start: startOfMonth(parts), end: { year: parts.year, month: parts.month, day: 15 } };
  }
  return { start: { year: parts.year, month: parts.month, day: 16 }, end: endOfMonth(parts) };
}

export function addMonths(parts, months) {
  const total = (parts.year * 12 + (parts.month - 1)) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(parts.day, daysInMonth(year, month));
  return { year, month, day };
}

export function compareIsoDates(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Human friendly `DD/MM/YYYY` used in previews (docs/README.md #10). */
export function formatIsoForDisplay(iso) {
  if (!iso) return null;
  const { year, month, day } = fromIsoDate(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(day)}/${pad(month)}/${year}`;
}

export const WEEKDAY_NAMES_PT = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];
