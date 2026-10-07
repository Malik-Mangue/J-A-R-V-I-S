/**
 * AI provider interface (port).
 *
 * The application talks to this abstraction only, so the model/provider can be
 * replaced without touching the domain (docs/ARCHITECTURE.md #31,
 * docs/MASTER-PROMPT.md #6).
 *
 * A provider MUST:
 *   - return a plain object following docs/OUTPUT-SCHEMAS.md (never free SQL or
 *     database commands - docs/AI-CONTRACT.md #4/#6);
 *   - never invent ids (docs/AI-CONTRACT.md #10);
 *   - ask a QUESTION when it cannot reliably interpret the input
 *     (docs/AI-CONTRACT.md #15).
 *
 * @typedef {object} AiInterpretationInput
 * @property {string} text                       transcript or typed text
 * @property {object} context                    controlled context (see docs/AI-CONTRACT.md #11)
 * @property {string} context.currentDate        ISO date
 * @property {string} context.timezone
 * @property {Array<{id:string,name:string,status?:string}>} context.relevantProjects
 * @property {Array<object>} [context.relevantTasks]
 * @property {string} [userId]
 *
 * @typedef {object} AiProvider
 * @property {string} name
 * @property {(input: AiInterpretationInput) => Promise<object>} interpret
 */

/**
 * Build a QUESTION response. Providers use this instead of guessing
 * (docs/AI-CONTRACT.md #15).
 * @param {string} reason
 * @param {string[]} questions
 * @param {Array<{id:string,name:string}>} [candidates]
 */
export function questionResponse(reason, questions, candidates = []) {
  return {
    type: 'QUESTION',
    reason,
    questions: questions.map((text, index) => ({ id: `q${index + 1}`, text })),
    ...(candidates.length > 0 ? { candidates } : {}),
  };
}
