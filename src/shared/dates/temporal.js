/**
 * Deterministic Portuguese temporal expression parser.
 *
 * This is part of the *Rule Engine* described in docs/README.md
 * ("IA e regras determinísticas"): everything that can be resolved
 * deterministically must be resolved by software rules, not left to the
 * probabilistic AI (docs/MASTER-PROMPT.md "Deterministic rules where possible").
 *
 * The parser never fabricates a date. If the user writes "algum dia" the result
 * explicitly reports `vague: true` and leaves `deadline`/`period` null
 * (docs/ARCHITECTURE.md #15: `"algum dia"` must NOT be turned into a date).
 */
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isValidIsoDate,
  normalizeText,
  startOfMonth,
  startOfWeek,
  toIsoDate,
  toLocalDateParts,
  weekday,
} from './calendar.js';
import { END_OF_MONTH_START_DAY } from './policies.js';

/** @typedef {import('./calendar.js').DateParts} DateParts */

/**
 * @typedef {object} Period
 * @property {string} kind     stable identifier, e.g. NEXT_WEEK
 * @property {string} label    human label, e.g. "próxima semana"
 * @property {string} start    ISO date
 * @property {string} end      ISO date
 */

/**
 * @typedef {object} TemporalResolution
 * @property {string|null} deadline   concrete ISO date, when the user gave one
 * @property {Period|null} period     range, when the user gave a range
 * @property {string|null} time       "HH:MM" when the user gave a time
 * @property {boolean} vague          user used an intentionally vague expression
 * @property {string[]} expressions   matched raw expressions (for provenance/preview)
 */

const WEEKDAYS = {
  domingo: 0,
  segunda: 1,
  'segunda-feira': 1,
  terca: 2,
  'terca-feira': 2,
  quarta: 3,
  'quarta-feira': 3,
  quinta: 4,
  'quinta-feira': 4,
  sexta: 5,
  'sexta-feira': 5,
  sabado: 6,
};

const VAGUE_PATTERNS = [
  /\balgum dia\b/,
  /\bum dia destes\b/,
  /\bquando puder\b/,
  /\bsem pressa\b/,
  /\boportunamente\b/,
  /\beventualmente\b/,
  /\bna altura certa\b/,
];

/**
 * Parse a free-text Portuguese temporal expression against a reference instant.
 *
 * @param {string} text
 * @param {{ now?: Date, timezone?: string }} [options]
 * @returns {TemporalResolution}
 */
export function parseTemporal(text, options = {}) {
  const now = options.now ?? new Date();
  const timezone = options.timezone ?? 'UTC';
  const raw = String(text ?? '');
  const n = normalizeText(raw);
  const today = toLocalDateParts(now, timezone);

  /** @type {TemporalResolution} */
  const result = {
    deadline: null,
    period: null,
    time: null,
    vague: false,
    expressions: [],
  };

  // 1. Explicit calendar dates have the highest precedence.
  const explicit = matchExplicitDate(n, today);
  if (explicit) {
    result.deadline = explicit.iso;
    result.expressions.push(explicit.raw);
  }

  // 2. Vagueness is detected explicitly and never guessed.
  for (const pattern of VAGUE_PATTERNS) {
    const match = pattern.exec(n);
    if (match) {
      result.vague = true;
      result.expressions.push(match[0]);
    }
  }

  // 3. Weekday references.
  if (!result.deadline) {
    const weekdayMatch = matchWeekday(n, today);
    if (weekdayMatch) {
      result.deadline = weekdayMatch.iso;
      result.expressions.push(weekdayMatch.raw);
    }
  }

  // 4. Relative day references.
  if (!result.deadline) {
    const relative = matchRelativeDay(n, today);
    if (relative) {
      result.deadline = relative.iso;
      result.expressions.push(relative.raw);
    }
  }

  // 5. Relative offsets ("daqui a duas semanas").
  if (!result.deadline && !result.period) {
    const offset = matchRelativeOffset(n, today);
    if (offset) {
      if (offset.period) result.period = offset.period;
      else result.deadline = offset.iso;
      result.expressions.push(offset.raw);
    }
  }

  // 6. Period expressions (week / month / weekend / half of month).
  if (!result.period) {
    const period = matchPeriod(n, today);
    if (period) {
      result.period = period;
      result.expressions.push(period.raw);
    }
  }

  // 7. Time of day.
  const time = matchTime(n);
  if (time) {
    result.time = time.value;
    result.expressions.push(time.raw);
  }

  result.expressions = [...new Set(result.expressions)];
  return result;
}

/**
 * @param {string} n normalized text
 * @param {DateParts} today
 */
function matchExplicitDate(n, today) {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(n);
  if (iso) {
    const value = `${iso[1]}-${iso[2]}-${iso[3]}`;
    if (isValidIsoDate(value)) return { iso: value, raw: iso[0] };
  }

  const numeric = /\b(\d{1,2})[/](\d{1,2})(?:[/](\d{2,4}))?\b/.exec(n);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year;
    if (numeric[3]) {
      year = Number(numeric[3]);
      if (year < 100) year += 2000;
    } else {
      year = today.year;
      // A month already passed (and no explicit year) means next year.
      if (month < today.month) year += 1;
    }
    const candidate = toIsoDate({ year, month, day });
    if (isValidIsoDate(candidate)) return { iso: candidate, raw: numeric[0] };
  }

  const dayOnly = /\b(?:no dia|dia) (\d{1,2})\b/.exec(n);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    const base = day < today.day ? addMonths({ year: today.year, month: today.month, day }, 1) : today;
    const candidate = toIsoDate({ year: base.year, month: base.month, day });
    if (isValidIsoDate(candidate)) return { iso: candidate, raw: dayOnly[0] };
  }

  return null;
}

/**
 * @param {string} n
 * @param {DateParts} today
 */
function matchWeekday(n, today) {
  for (const [name, target] of Object.entries(WEEKDAYS)) {
    const pattern = new RegExp(`\\b(proxima |proximo |na proxima |esta |nesta )?${name}\\b`);
    const match = pattern.exec(n);
    if (!match) continue;

    const hint = match[1] ?? '';
    const hasNextHint = /proxima|proximo/.test(hint);
    const isNextWeekPhrase = /\b(proxima semana|semana que vem|para a semana)\b/.test(n);
    const delta = (target - weekday(today) + 7) % 7;

    if (isNextWeekPhrase) {
      // "na próxima semana, sexta" always means the Friday of next week.
      const nextWeekStart = addDays(startOfWeek(today), 7);
      const offsetFromMonday = (target + 6) % 7;
      return { iso: toIsoDate(addDays(nextWeekStart, offsetFromMonday)), raw: match[0].trim() };
    }

    if (delta === 0) {
      // "sexta" said on a Friday means today; "próxima sexta" means next week.
      return { iso: toIsoDate(addDays(today, hasNextHint ? 7 : 0)), raw: match[0].trim() };
    }
    return { iso: toIsoDate(addDays(today, delta)), raw: match[0].trim() };
  }
  return null;
}

/**
 * @param {string} n
 * @param {DateParts} today
 */
function matchRelativeDay(n, today) {
  if (/\bdepois de amanha\b/.test(n)) return { iso: toIsoDate(addDays(today, 2)), raw: 'depois de amanhã' };
  if (/\bamanha\b/.test(n)) return { iso: toIsoDate(addDays(today, 1)), raw: 'amanhã' };
  if (/\bhoje\b/.test(n)) return { iso: toIsoDate(today), raw: 'hoje' };
  if (/\bontem\b/.test(n)) return { iso: toIsoDate(addDays(today, -1)), raw: 'ontem' };
  return null;
}

const NUMBER_WORDS = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  quinze: 15,
  trinta: 30,
};

/**
 * @param {string} n
 * @param {DateParts} today
 */
function matchRelativeOffset(n, today) {
  const match = /\b(?:daqui a|dentro de|em|para) (\d{1,3}|[a-z]+) (dia|dias|semana|semanas|mes|meses)\b/.exec(n);
  if (!match) return null;
  const amount = /^\d+$/.test(match[1]) ? Number(match[1]) : NUMBER_WORDS[match[1]];
  if (!amount) return null;
  const unit = match[2];
  if (unit.startsWith('dia')) {
    return { iso: toIsoDate(addDays(today, amount)), raw: match[0], period: null };
  }
  if (unit.startsWith('semana')) {
    const start = addDays(startOfWeek(today), amount * 7);
    return {
      iso: null,
      raw: match[0],
      period: {
        kind: 'OFFSET_WEEK',
        label: `daqui a ${amount} semana(s)`,
        start: toIsoDate(start),
        end: toIsoDate(addDays(start, 6)),
      },
    };
  }
  if (unit.startsWith('mes')) {
    const start = addMonths(startOfMonth(today), amount);
    return {
      iso: null,
      raw: match[0],
      period: {
        kind: 'OFFSET_MONTH',
        label: `daqui a ${amount} mês(es)`,
        start: toIsoDate(start),
        end: toIsoDate(endOfMonth(start)),
      },
    };
  }
  return null;
}

/**
 * @param {string} n
 * @param {DateParts} today
 */
function matchPeriod(n, today) {
  const make = (kind, label, start, end, raw) => ({
    kind,
    label,
    start: toIsoDate(start),
    end: toIsoDate(end),
    raw,
  });

  if (/\b(proxima semana|semana que vem|para a semana)\b/.test(n)) {
    const start = addDays(startOfWeek(today), 7);
    return make('NEXT_WEEK', 'próxima semana', start, addDays(start, 6), 'próxima semana');
  }
  if (/\b(esta semana|nesta semana)\b/.test(n)) {
    return make('THIS_WEEK', 'esta semana', startOfWeek(today), endOfWeek(today), 'esta semana');
  }
  if (/\b(semana passada|ultima semana)\b/.test(n)) {
    const start = addDays(startOfWeek(today), -7);
    return make('LAST_WEEK', 'semana passada', start, addDays(start, 6), 'semana passada');
  }
  if (/\b(proximo mes|mes que vem)\b/.test(n)) {
    const start = addMonths(startOfMonth(today), 1);
    return make('NEXT_MONTH', 'próximo mês', start, endOfMonth(start), 'próximo mês');
  }
  if (/\b(este mes|neste mes)\b/.test(n)) {
    return make('THIS_MONTH', 'este mês', startOfMonth(today), endOfMonth(today), 'este mês');
  }
  if (/\b(fim do mes|final do mes)\b/.test(n)) {
    const start = { year: today.year, month: today.month, day: END_OF_MONTH_START_DAY };
    return make('END_OF_MONTH', 'fim do mês', start, endOfMonth(today), 'fim do mês');
  }
  if (/\b(segunda metade do mes|2a metade do mes)\b/.test(n)) {
    const start = { year: today.year, month: today.month, day: 16 };
    return make('SECOND_HALF_OF_MONTH', 'segunda metade do mês', start, endOfMonth(today), 'segunda metade do mês');
  }
  if (/\b(primeira metade do mes|1a metade do mes)\b/.test(n)) {
    const start = startOfMonth(today);
    return make(
      'FIRST_HALF_OF_MONTH',
      'primeira metade do mês',
      start,
      { year: today.year, month: today.month, day: 15 },
      'primeira metade do mês',
    );
  }
  if (/\b(fim de semana|no fim de semana|este fim de semana)\b/.test(n)) {
    const saturdayOffset = (6 - weekday(today) + 7) % 7;
    const start = addDays(today, saturdayOffset);
    return make('WEEKEND', 'fim de semana', start, addDays(start, 1), 'fim de semana');
  }
  return null;
}

/** @param {string} n */
function matchTime(n) {
  const hhmm = /\b(\d{1,2}):(\d{2})\b/.exec(n);
  if (hhmm) {
    const h = Number(hhmm[1]);
    const m = Number(hhmm[2]);
    if (h < 24 && m < 60) {
      return { value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, raw: hhmm[0] };
    }
  }
  const hh = /\bas? (\d{1,2})h(\d{2})?\b/.exec(n);
  if (hh) {
    const h = Number(hh[1]);
    const m = hh[2] ? Number(hh[2]) : 0;
    if (h < 24 && m < 60) {
      return { value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, raw: hh[0] };
    }
  }
  return null;
}



