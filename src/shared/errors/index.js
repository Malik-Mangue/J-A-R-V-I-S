/**
 * Application-wide error types.
 *
 * Errors carry a stable machine-readable `code` so that presentation layers can
 * react deterministically instead of matching on messages (see
 * docs/AGENT-INSTRUCTIONS.md: deterministic rules where possible).
 */

export class AppError extends Error {
  /**
   * @param {string} message human readable message (may be shown to the user)
   * @param {{ code?: string, details?: object, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? 'APP_ERROR';
    this.details = options.details ?? {};
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message, details: this.details };
  }
}

/** Input failed a validation rule (schema or business validation). */
export class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'VALIDATION_ERROR', ...options });
  }
}

/** A requested entity does not exist. */
export class NotFoundError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'NOT_FOUND', ...options });
  }
}

/** The operation conflicts with the current state of the system. */
export class ConflictError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'CONFLICT', ...options });
  }
}

/**
 * A required external capability (AI provider, transcription provider,
 * database, ...) is not configured. This is a configuration problem, not a
 * user error, and must never be hidden behind fabricated results.
 */
export class NotConfiguredError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'NOT_CONFIGURED', ...options });
  }
}

/** A business rule of the domain was violated. */
export class BusinessRuleError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'BUSINESS_RULE_VIOLATION', ...options });
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}
