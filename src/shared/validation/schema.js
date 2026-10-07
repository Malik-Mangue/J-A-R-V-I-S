/**
 * Minimal, dependency-free schema validator.
 *
 * The AI output is probabilistic input and must never be trusted directly
 * (docs/ARCHITECTURE.md #32, docs/OUTPUT-SCHEMAS.md #6). This validator is
 * intentionally small: it only supports what the AI response schemas need.
 *
 * Supported schema nodes:
 *   { type: 'string' | 'number' | 'boolean' | 'object' | 'array', ... }
 *   { type: 'string', enum: [...] }
 *   { type: 'number', min, max }
 *   { type: 'object', properties, required, additionalProperties }
 *   { type: 'array', items }
 *   { nullable: true }              -> field may be null
 *   { true } / { false }            -> literal acceptance
 *
 * @typedef {object} SchemaNode
 */
import { ValidationError } from '../errors/index.js';

/**
 * Validate a value against a schema. Returns the list of problems found
 * (empty when valid). Never throws on invalid data.
 *
 * @param {unknown} value
 * @param {SchemaNode} schema
 * @param {string} [path]
 * @returns {{ path: string, message: string }[]}
 */
export function collectSchemaErrors(value, schema, path = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  const isNull = value === null || value === undefined;

  if (isNull) {
    if (schema.nullable) return errors;
    errors.push({ path, message: `expected ${schema.type}, received null` });
    return errors;
  }

  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      errors.push({ path, message: `expected one of ${schema.enum.join(', ')}, received ${JSON.stringify(value)}` });
      return errors;
    }
  }

  switch (schema.type) {
    case undefined:
      break;
    case 'string':
      if (typeof value !== 'string') errors.push({ path, message: `expected string, received ${typeof value}` });
      else if (schema.minLength && value.length < schema.minLength) {
        errors.push({ path, message: `expected string with at least ${schema.minLength} characters` });
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push({ path, message: `expected number, received ${typeof value}` });
      } else {
        if (schema.min !== undefined && value < schema.min) errors.push({ path, message: `expected number >= ${schema.min}` });
        if (schema.max !== undefined && value > schema.max) errors.push({ path, message: `expected number <= ${schema.max}` });
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push({ path, message: `expected boolean, received ${typeof value}` });
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push({ path, message: `expected array, received ${typeof value}` });
      } else if (schema.items) {
        value.forEach((item, index) => {
          errors.push(...collectSchemaErrors(item, schema.items, `${path}[${index}]`));
        });
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({ path, message: `expected object, received ${Array.isArray(value) ? 'array' : typeof value}` });
      } else {
        const properties = schema.properties ?? {};
        for (const key of schema.required ?? []) {
          if (value[key] === undefined || value[key] === null) {
            errors.push({ path: `${path}.${key}`, message: 'required field is missing' });
          }
        }
        for (const [key, childSchema] of Object.entries(properties)) {
          if (value[key] !== undefined) {
            errors.push(...collectSchemaErrors(value[key], childSchema, `${path}.${key}`));
          }
        }
        if (schema.additionalProperties === false) {
          for (const key of Object.keys(value)) {
            if (!(key in properties)) {
              errors.push({ path: `${path}.${key}`, message: 'unexpected property' });
            }
          }
        }
      }
      break;
    default:
      errors.push({ path, message: `unknown schema type: ${schema.type}` });
  }

  return errors;
}

/**
 * Validate and throw a ValidationError when the value does not conform.
 * @param {unknown} value
 * @param {SchemaNode} schema
 * @param {string} [label]
 * @returns {unknown} the value, when valid
 */
export function assertSchema(value, schema, label = 'value') {
  const errors = collectSchemaErrors(value, schema);
  if (errors.length > 0) {
    throw new ValidationError(`Invalid ${label}: ${errors.map((e) => `${e.path} ${e.message}`).join('; ')}`, {
      details: { errors },
    });
  }
  return value;
}
