'use server';

/**
 * Server Actions.
 *
 * docs/ARCHITECTURE.md #29/#30: internal mutations use Server Actions and call
 * the application layer directly, instead of inventing an HTTP API for
 * everything. Route handlers are reserved for cases that genuinely need an
 * HTTP interface (e.g. the audio upload in /api/capture/audio).
 *
 * Every action returns a plain, serializable result; business rules never live
 * in these functions or in the components that call them.
 */
import { revalidatePath } from 'next/cache';
import { getContainer } from '../../src/application/container.js';
import { captureText } from '../../src/application/capture/captureText.js';
import { analyzeCapture } from '../../src/application/proposal/createProposal.js';
import { confirmProposal } from '../../src/application/proposal/confirmProposal.js';
import { cancelProposal } from '../../src/application/proposal/cancelProposal.js';
import { updateProposal } from '../../src/application/proposal/updateProposal.js';
import { completeTask } from '../../src/application/tasks/completeTask.js';
import { correctProposalByVoice } from '../../src/application/proposal/correctProposalByVoice.js';
import { updateInboxItem } from '../../src/application/inbox/updateInboxItem.js';
import { convertIdea } from '../../src/application/ideas/convertIdea.js';
import { generateSuggestions } from '../../src/application/suggestions/generateSuggestions.js';
import { setAutomationSettings } from '../../src/application/settings/automation.js';
import { parseTemporal } from '../../src/shared/dates/temporal.js';
import { isAppError } from '../../src/shared/errors/index.js';

function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/tasks');
  revalidatePath('/inbox');
  revalidatePath('/projects');
  revalidatePath('/ideas');
  revalidatePath('/settings');
  revalidatePath('/finance');
}

/**
 * Server Actions are called differently depending on how they are wired:
 * `useActionState` passes `(prevState, formData)` while a plain form action
 * passes only `FormData`. Accept both so the same action can be used from
 * a client hook or directly in `<form action={…}>`.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {FormData}
 */
function formDataOf(a, b) {
  if (b instanceof FormData) return b;
  if (a instanceof FormData) return a;
  return new FormData();
}

/**
 * Capture typed text, interpret it and build the preview.
 * @param {unknown} _prevState
 * @param {FormData} formData
 */
export async function captureTextAction(_prevState, formData) {
  const text = String(formData.get('text') ?? '').trim();
  if (!text) {
    return { status: 'ERROR', message: 'Escreve ou grava algo antes de capturar.' };
  }

  try {
    const container = await getContainer();
    const { capture } = await captureText(container, { text });
    const analysis = await analyzeCapture(container, { captureId: capture.id });
    revalidatePath('/');
    return {
      status: analysis.status,
      captureId: capture.id,
      proposalId: analysis.proposal?.id ?? null,
      preview: analysis.preview,
      intent: analysis.interpretation.intent,
      questions: analysis.questions.map((question) => question.text),
      missingInformation: analysis.missingInformation,
      warnings: analysis.warnings,
      confidence: analysis.interpretation.confidence,
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

/** @param {unknown} _prevState @param {FormData} formData */
export async function confirmProposalAction(_prevState, formData) {
  const proposalId = String(formData.get('proposalId') ?? '');
  try {
    const container = await getContainer();
    const result = await confirmProposal(container, { proposalId, overrides: readOverrides(formData) });
    revalidateAll();
    return { status: 'CONFIRMED', entityType: result.entityType, entityId: result.proposal.resultEntityId };
  } catch (error) {
    return toErrorResult(error);
  }
}

/** @param {unknown} _prevState @param {FormData} formData */
export async function cancelProposalAction(_prevState, formData) {
  const proposalId = String(formData.get('proposalId') ?? '');
  try {
    const container = await getContainer();
    await cancelProposal(container, { proposalId, reason: 'rejeitado pelo utilizador' });
    revalidatePath('/');
    return { status: 'CANCELLED' };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Apply user edits to a pending proposal. Temporal fields accept free text and
 * are resolved by the deterministic rule engine, never by the model.
 * @param {unknown} _prevState @param {FormData} formData
 */
export async function updateProposalAction(_prevState, formData) {
  const proposalId = String(formData.get('proposalId') ?? '');
  try {
    const container = await getContainer();
    const stored = await container.repositories.proposals.findById(proposalId);
    if (!stored) {
      return { status: 'ERROR', message: 'Proposta não encontrada.' };
    }

    const { proposal: updated } = await updateProposal(container, {
      proposalId,
      payload: {
        ...(stored.payload ?? {}),
        ...readOverrides(formData),
        ...readTemporal(formData, container.timezone),
      },
    });
    revalidatePath('/');
    return { status: 'UPDATED', proposalId: updated.id, payload: updated.payload };
  } catch (error) {
    return toErrorResult(error);
  }
}

/** @param {unknown} _prevState @param {FormData} formData */
export async function completeTaskAction(_prevState, _formData) {
  const formData = formDataOf(_prevState, _formData);
  const taskId = String(formData.get('taskId') ?? '');
  try {
    const container = await getContainer();
    await completeTask(container, { taskId });
    revalidateAll();
    return { status: 'COMPLETED' };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Correct a pending proposal by voice (docs/README.md #10).
 * @param {unknown} _prevState @param {FormData} formData
 */
export async function correctProposalByVoiceAction(_prevState, formData) {
  try {
    const container = await getContainer();
    const result = await correctProposalByVoice(container, {
      proposalId: String(formData.get('proposalId') ?? ''),
      correction: String(formData.get('correction') ?? ''),
    });
    revalidateAll();
    return result;
  } catch (error) {
    return toErrorResult(error);
  }
}

/** @param {unknown} _prevState @param {FormData} formData */
export async function updateInboxItemAction(_prevState, _formData) {
  try {
    const formData = formDataOf(_prevState, _formData);
    const container = await getContainer();
    const { item } = await updateInboxItem(container, {
      itemId: String(formData.get('itemId') ?? ''),
      status: String(formData.get('status') ?? ''),
      snoozedUntil: String(formData.get('snoozedUntil') ?? '') || null,
    });
    revalidateAll();
    return { status: 'UPDATED', itemId: item.id, itemStatus: item.status };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Explicit conversion of an idea (never automatic - docs/ARCHITECTURE.md rule 3).
 * @param {unknown} _prevState @param {FormData} formData
 */
export async function convertIdeaAction(_prevState, _formData) {
  try {
    const formData = formDataOf(_prevState, _formData);
    const container = await getContainer();
    const target = String(formData.get('target') ?? 'TASK') === 'PROJECT' ? 'PROJECT' : 'TASK';
    const temporal = readTemporal(formData, container.timezone);
    const result = await convertIdea(container, {
      ideaId: String(formData.get('ideaId') ?? ''),
      target,
      deadline: temporal.deadline ?? null,
      period: temporal.period ?? null,
    });
    revalidateAll();
    return { status: 'CONVERTED', entityType: result.entityType, entityId: result.entity.id };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Materialise suggestions into the Inbox (docs/ARCHITECTURE.md #22).
 * Requires the SUGGESTIONS automation to be explicitly enabled.
 * @param {unknown} _prevState
 */
export async function generateSuggestionsAction(_prevState) {
  try {
    const container = await getContainer();
    const result = await generateSuggestions(container, { persist: true });
    revalidateAll();
    return {
      status: result.skipped ? 'SKIPPED' : 'OK',
      created: result.created.length,
      reason: result.reason ?? null,
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

/** @param {unknown} _prevState @param {FormData} formData */
export async function setAutomationAction(_prevState, _formData) {
  try {
    const formData = formDataOf(_prevState, _formData);
    const container = await getContainer();
    // A checked checkbox is the only one that appears in the payload, so the
    // form sends a hidden "off" for every category and the last value wins.
    const patch = {};
    const keys = new Set(formData.keys());
    for (const key of keys) {
      if (!key.startsWith('automation:')) continue;
      patch[key.slice('automation:'.length)] = formData.getAll(key).includes('on');
    }
    const settings = await setAutomationSettings(container, patch);
    revalidateAll();
    return { status: 'SAVED', settings };
  } catch (error) {
    return toErrorResult(error);
  }
}

function readOverrides(formData) {
  const overrides = {};
  for (const field of ['title', 'name', 'description']) {
    const value = String(formData.get(field) ?? '').trim();
    if (value) overrides[field] = value;
  }
  return overrides;
}

/**
 * Resolve a free-text temporal expression ("sexta", "próxima semana") with the
 * deterministic parser - the model is never trusted with date arithmetic.
 */
function readTemporal(formData, timezone) {
  const temporalText = String(formData.get('temporal') ?? '').trim();
  if (!temporalText) return {};
  const parsed = parseTemporal(temporalText, { timezone });
  return {
    ...(parsed.deadline ? { deadline: parsed.deadline } : {}),
    ...(parsed.period ? { period: parsed.period } : {}),
  };
}

function toErrorResult(error) {
  if (isAppError(error)) {
    return { status: 'ERROR', code: error.code, message: error.message, details: error.details };
  }
  return { status: 'ERROR', code: 'UNEXPECTED_ERROR', message: 'Ocorreu um erro inesperado.' };
}