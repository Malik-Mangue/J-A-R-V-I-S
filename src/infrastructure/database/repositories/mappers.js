/**
 * Row <-> domain mappers and value coercion helpers.
 *
 * Keeps SQL column naming (snake_case) out of the domain, and keeps the domain
 * shape out of the repositories. Both drivers (pg / PGlite) return slightly
 * different JavaScript types for `date`/`timestamptz`, so coercion happens here.
 */

/** @param {unknown} value */
export function toIsoDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

/** @param {unknown} value */
export function toIsoTimestamp(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** @param {unknown} value */
export function toJson(value) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/** @param {unknown} value @param {unknown} fallback */
export function fromJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

/** @param {import('../../../domain/tasks/task.js').Task} task */
export function toTaskRow(task) {
  return {
    id: task.id,
    user_id: task.userId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    period_kind: task.period?.kind ?? null,
    period_label: task.period?.label ?? null,
    period_start: task.period?.start ?? null,
    period_end: task.period?.end ?? null,
    project_id: task.projectId,
    context: task.context,
    dependencies: toJson(task.dependencies),
    notes: task.notes,
    source: task.source,
    provenance: toJson(task.provenance),
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
  };
}

/** @param {Record<string, any>} row */
export function rowToTask(row) {
  const period = row.period_end
    ? {
        kind: row.period_kind ?? 'CUSTOM',
        label: row.period_label ?? `${toIsoDate(row.period_start)} – ${toIsoDate(row.period_end)}`,
        start: toIsoDate(row.period_start),
        end: toIsoDate(row.period_end),
      }
    : null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    deadline: toIsoDate(row.deadline),
    period,
    projectId: row.project_id,
    context: row.context,
    dependencies: fromJson(row.dependencies, []),
    notes: row.notes,
    source: row.source,
    provenance: fromJson(row.provenance, null),
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
    completedAt: toIsoTimestamp(row.completed_at),
  };
}

/** @param {Record<string, any>} row */
export function rowToProject(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    objective: row.objective,
    description: row.description,
    status: row.status,
    progress: Number(row.progress),
    deadline: toIsoDate(row.deadline),
    nextAction: row.next_action,
    provenance: fromJson(row.provenance, null),
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
    lastActivityAt: toIsoTimestamp(row.last_activity_at),
  };
}

/** @param {Record<string, any>} row */
export function rowToIdea(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    context: row.context,
    projectId: row.project_id,
    status: row.status,
    source: row.source,
    provenance: fromJson(row.provenance, null),
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
    convertedToId: row.converted_to_id,
    convertedToType: row.converted_to_type,
  };
}

/** @param {Record<string, any>} row */
export function rowToCapture(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    source: row.source,
    text: row.text_content,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    hash: row.hash,
    metadata: fromJson(row.metadata, {}),
    createdAt: toIsoTimestamp(row.created_at),
  };
}

/** @param {Record<string, any>} row */
export function rowToTranscription(row) {
  return {
    id: row.id,
    captureId: row.capture_id,
    text: row.text_content,
    language: row.language,
    provider: row.provider,
    confidence: row.confidence === null ? null : Number(row.confidence),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    createdAt: toIsoTimestamp(row.created_at),
  };
}

/** @param {Record<string, any>} row */
export function rowToInterpretation(row) {
  return {
    id: row.id,
    userId: row.user_id,
    captureId: row.capture_id,
    transcriptionId: row.transcription_id,
    intent: row.intent,
    confidence: row.confidence === null ? 0 : Number(row.confidence),
    entities: fromJson(row.entities, {}),
    missingInformation: fromJson(row.missing_information, []),
    ambiguities: fromJson(row.ambiguities, []),
    uncertainties: fromJson(row.uncertainties, []),
    questions: fromJson(row.questions, []),
    createdAt: toIsoTimestamp(row.created_at),
  };
}

/** @param {Record<string, any>} row */
export function rowToProposal(row) {
  return {
    id: row.id,
    userId: row.user_id,
    captureId: row.capture_id,
    interpretationId: row.interpretation_id,
    intent: row.intent,
    payload: fromJson(row.payload, null),
    changes: fromJson(row.changes, []),
    warnings: fromJson(row.warnings, []),
    status: row.status,
    createdAt: toIsoTimestamp(row.created_at),
    resolvedAt: toIsoTimestamp(row.resolved_at),
    resultEntityId: row.result_entity_id,
    resultEntityType: row.result_entity_type,
    cancellationReason: row.cancellation_reason,
  };
}

/** @param {Record<string, any>} row */
export function rowToInboxItem(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    evidence: fromJson(row.evidence, []),
    priority: row.priority,
    status: row.status,
    relatedEntityId: row.related_entity_id,
    relatedEntityType: row.related_entity_type,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
    snoozedUntil: toIsoDate(row.snoozed_until),
  };
}

/** @param {Record<string, any>} row */
export function rowToFinanceEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    category: row.category,
    description: row.description,
    occurredOn: toIsoDate(row.occurred_on),
    source: row.source,
    provenance: fromJson(row.provenance, null),
    createdAt: toIsoTimestamp(row.created_at),
  };
}

/** @param {Record<string, any>} row */
export function rowToEvent(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    occurredAt: toIsoTimestamp(row.occurred_at),
    payload: fromJson(row.payload, {}),
  };
}


