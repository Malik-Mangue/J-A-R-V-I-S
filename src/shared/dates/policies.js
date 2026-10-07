/**
 * Temporal interpretation policies.
 *
 * These are ASSUMPTIONS, not business rules invented by the AI. They live in a
 * single place so they are explicit, documented and configurable - see
 * docs/IMPLEMENTATION-NOTES.md (section "Pressupostos explícitos").
 *
 * Rule 1 of docs/ARCHITECTURE.md #52: never invent a business rule. When an
 * expression is too vague to be resolved without a convention, the convention is
 * declared here instead of being hidden inside the parser.
 */

/**
 * "fim do mês" has no mathematically defined start day. We use the last 7 days
 * of the month, which is the common commercial meaning of "end of month".
 * Override with TEMPORAL_END_OF_MONTH_START_DAY (1-28).
 */
export const END_OF_MONTH_START_DAY = clampDay(Number(process.env.TEMPORAL_END_OF_MONTH_START_DAY ?? 25));

/**
 * A task may reference a period instead of a concrete date
 * (docs/ARCHITECTURE.md #3). Set TEMPORAL_REQUIRE_CONCRETE_DEADLINE=true to
 * require a concrete date and always ask for the day.
 */
export const REQUIRE_CONCRETE_DEADLINE =
  String(process.env.TEMPORAL_REQUIRE_CONCRETE_DEADLINE ?? 'false').toLowerCase() === 'true';

function clampDay(value) {
  if (!Number.isFinite(value)) return 25;
  return Math.min(28, Math.max(1, Math.round(value)));
}