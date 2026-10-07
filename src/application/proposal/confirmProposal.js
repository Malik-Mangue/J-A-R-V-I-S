/**
 * Use case: ConfirmProposal
 *
 * This is the ONLY place where an AI interpretation becomes real domain data.
 *
 * Flow (docs/AI-CONTRACT.md #3):
 *   proposal -> user authorization -> domain command -> database transaction.
 *
 * The AI never writes to the database: it produced the proposal, the user
 * authorized it, and the application - not the model - decides what happens.
 */
import { BusinessRuleError, NotFoundError } from '../../shared/errors/index.js';
import { toIsoDate, toLocalDateParts } from '../../shared/dates/index.js';
import { confirmProposal as confirmProposalEntity } from '../../domain/proposal/proposal.js';
import { createTask } from '../../domain/tasks/task.js';
import { createIdea } from '../../domain/ideas/idea.js';
import { createProject } from '../../domain/projects/project.js';
import { createFinanceEntry } from '../../domain/finance/financeEntry.js';
import { createEvent } from '../../domain/shared/events.js';
import { INTENTS, entityEvent } from '../../domain/shared/constants.js';
import { assertOwnership, resolveExecutionPolicy, automationCategoryForIntent } from '../authorization/index.js';
import { withTransaction } from '../container.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ proposalId: string, overrides?: object }} input
 */
export async function confirmProposal(container, input) {
  const stored = await container.repositories.proposals.findById(input.proposalId);
  if (!stored) {
    throw new NotFoundError(`Proposta não encontrada: ${input.proposalId}`, {
      details: { proposalId: input.proposalId },
    });
  }
  // Authorization: the acting user must own the proposal.
  assertOwnership(stored, container.userId, 'Proposta');

  // Authorization: the automation policy decides whether a confirmation is
  // required (docs/AI-CONTRACT.md #14). Business rules still apply either way.
  const automation = await container.repositories.settings.getAutomation(container.userId);
  const policy = resolveExecutionPolicy({
    category: automationCategoryForIntent(stored.intent),
    automation,
  });
  if (policy.automated) {
    // Automated commits are only allowed for proposals that are already
    // complete; the capture pipeline never bypasses the "ask when unsure" rule.
    if (!stored.payload || Object.values(stored.payload).some((value) => value === null || value === '')) {
      throw new BusinessRuleError(
        'A automação está ativa para esta categoria, mas a proposta tem campos por preencher.',
        { details: { rule: 'AUTOMATION_REQUIRES_COMPLETE_PROPOSAL', intent: stored.intent } },
      );
    }
  }

  const payload = { ...(stored.payload ?? {}), ...(input.overrides ?? {}) };
  const currentDate = toIsoDate(toLocalDateParts(container.clock(), container.timezone));
  const transcription = await container.repositories.transcriptions.findByCaptureId(stored.captureId);

  return withTransaction(container, async (repositories) => {
    const provenance = {
      captureId: stored.captureId,
      transcriptionId: transcription?.id ?? null,
      interpretationId: stored.interpretationId,
      proposalId: stored.id,
      source: 'capture',
    };

    const result = await executeCommand(repositories, {
      container,
      proposal: stored,
      payload,
      provenance,
      currentDate,
    });

    const confirmed = confirmProposalEntity(stored, {
      confirmedAt: container.clock().toISOString(),
      resultEntityId: result.id,
      resultEntityType: result.entityType,
    });
    await repositories.proposals.update(confirmed);

    await repositories.events.insert(
      createEvent({
        type: 'proposal.confirmed',
        entityType: 'PROPOSAL',
        entityId: confirmed.id,
        userId: container.userId,
        occurredAt: confirmed.resolvedAt,
        payload: { intent: confirmed.intent, resultEntityId: result.id, resultEntityType: result.entityType },
      }),
    );
    await repositories.events.insert(
      createEvent({
        type: entityEvent(result.entityType, 'created'),
        entityType: result.entityType,
        entityId: result.id,
        userId: container.userId,
        occurredAt: confirmed.resolvedAt,
        payload: { proposalId: confirmed.id, captureId: stored.captureId },
      }),
    );

    return { proposal: confirmed, entity: result.value, entityType: result.entityType };
  });
}

/**
 * Execute the domain command described by the proposal.
 * @returns {Promise<{ id: string, entityType: string, value: object }>}
 */
async function executeCommand(repositories, input) {
  const { container, proposal, payload, provenance, currentDate } = input;

  switch (proposal.intent) {
    case INTENTS.CREATE_TASK: {
      await assertProjectExists(repositories, payload.projectId);
      const task = createTask(
        {
          title: payload.title,
          description: payload.description,
          deadline: payload.deadline,
          period: payload.period,
          priority: payload.priority,
          projectId: payload.projectId,
          context: payload.time ? `Hora indicada: ${payload.time}` : null,
          source: 'capture',
          provenance,
        },
        { userId: container.userId, createdAt: container.clock().toISOString(), referenceDate: currentDate },
      );
      await repositories.tasks.insert(task);
      return { id: task.id, entityType: 'TASK', value: task };
    }

    case INTENTS.CREATE_IDEA: {
      await assertProjectExists(repositories, payload.projectId);
      const idea = createIdea(
        {
          title: payload.title,
          description: payload.description,
          projectId: payload.projectId,
          source: 'capture',
          provenance,
        },
        { userId: container.userId, createdAt: container.clock().toISOString() },
      );
      await repositories.ideas.insert(idea);
      return { id: idea.id, entityType: 'IDEA', value: idea };
    }

    case INTENTS.CREATE_PROJECT: {
      const project = createProject(
        {
          name: payload.name,
          objective: payload.objective,
          description: payload.description,
          deadline: payload.deadline,
          provenance,
        },
        { userId: container.userId, createdAt: container.clock().toISOString() },
      );
      await repositories.projects.insert(project);
      return { id: project.id, entityType: 'PROJECT', value: project };
    }

    case INTENTS.CREATE_EXPENSE:
    case INTENTS.CREATE_INCOME: {
      const entry = createFinanceEntry(
        {
          type: payload.type,
          amountMinor: payload.amountMinor,
          currency: payload.currency,
          category: payload.category,
          description: payload.description,
          occurredOn: payload.occurredOn ?? currentDate,
          source: 'capture',
          provenance,
        },
        { userId: container.userId, createdAt: container.clock().toISOString(), referenceDate: currentDate, defaultCurrency: container.defaultCurrency },
      );
      await repositories.finance.insert(entry);
      return { id: entry.id, entityType: 'FINANCE_ENTRY', value: entry };
    }

    case INTENTS.CAPTURE_NOTE: {
      // A note is the capture itself: the text was already persisted at capture
      // time, so no synthetic record is fabricated here.
      const capture = await repositories.captures.findById(proposal.captureId);
      return { id: capture.id, entityType: 'NOTE', value: capture };
    }

    default:
      throw new BusinessRuleError(`A intenção ${proposal.intent} ainda não pode ser executada.`, {
        details: { intent: proposal.intent, rule: 'UNSUPPORTED_INTENT' },
      });
  }
}

/** Referential integrity is validated by the application, not assumed. */
async function assertProjectExists(repositories, projectId) {
  if (!projectId) return;
  const project = await repositories.projects.findById(projectId);
  if (!project) {
    throw new BusinessRuleError('O projeto indicado não existe.', {
      details: { field: 'projectId', value: projectId, rule: 'PROJECT_NOT_FOUND' },
    });
  }
}