/**
 * Use case: ConvertIdea
 *
 * docs/ARCHITECTURE.md #19 and rule 3: an idea becomes a task or a project ONLY
 * through an explicit user action. Nothing in the pipeline calls this.
 *
 * Converting to a task still obeys the task business rule (an adequate temporal
 * reference is required), so the application asks instead of guessing.
 */
import { NotFoundError } from '../../shared/errors/index.js';
import { toIsoDate, toLocalDateParts } from '../../shared/dates/index.js';
import { convertIdeaToProject, convertIdeaToTask } from '../../domain/ideas/idea.js';
import { createTask } from '../../domain/tasks/task.js';
import { createProject } from '../../domain/projects/project.js';
import { createEvent } from '../../domain/shared/events.js';
import { entityEvent } from '../../domain/shared/constants.js';
import { assertOwnership } from '../authorization/index.js';
import { withTransaction } from '../container.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ ideaId: string, target: 'TASK'|'PROJECT', deadline?: string|null, period?: object|null }} input
 */
export async function convertIdea(container, input) {
  const idea = await container.repositories.ideas.findById(input.ideaId);
  if (!idea) {
    throw new NotFoundError(`Ideia não encontrada: ${input.ideaId}`, { details: { ideaId: input.ideaId } });
  }
  assertOwnership(idea, container.userId, 'Ideia');

  const now = container.clock().toISOString();
  const currentDate = toIsoDate(toLocalDateParts(container.clock(), container.timezone));

  return withTransaction(container, async (repositories) => {
    if (input.target === 'PROJECT') {
      const project = createProject(
        { name: idea.title, description: idea.description, provenance: { ideaId: idea.id, source: 'idea_conversion' } },
        { userId: container.userId, createdAt: now },
      );
      await repositories.projects.insert(project);
      const converted = convertIdeaToProject(idea, { projectId: project.id, updatedAt: now });
      await repositories.ideas.update(converted);
      await repositories.events.insert(
        createEvent({
          type: entityEvent('IDEA', 'converted_to_project'),
          entityType: 'IDEA',
          entityId: idea.id,
          userId: container.userId,
          occurredAt: now,
          payload: { projectId: project.id },
        }),
      );
      return { idea: converted, entity: project, entityType: 'PROJECT' };
    }

    const task = createTask(
      {
        title: idea.title,
        description: idea.description,
        deadline: input.deadline ?? null,
        period: input.period ?? null,
        source: 'idea_conversion',
        provenance: { ideaId: idea.id, source: 'idea_conversion' },
      },
      { userId: container.userId, createdAt: now, referenceDate: currentDate },
    );
    await repositories.tasks.insert(task);
    const converted = convertIdeaToTask(idea, { taskId: task.id, updatedAt: now });
    await repositories.ideas.update(converted);
    await repositories.events.insert(
      createEvent({
        type: entityEvent('IDEA', 'converted_to_task'),
        entityType: 'IDEA',
        entityId: idea.id,
        userId: container.userId,
        occurredAt: now,
        payload: { taskId: task.id },
      }),
    );
    return { idea: converted, entity: task, entityType: 'TASK' };
  });
}