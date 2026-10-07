/**
 * Use case: CompleteTask
 *
 * State transitions are domain rules; persistence is application work.
 */
import { NotFoundError } from '../../shared/errors/index.js';
import { completeTask as completeTaskEntity, startTask as startTaskEntity } from '../../domain/tasks/task.js';
import { createEvent } from '../../domain/shared/events.js';
import { assertOwnership } from '../authorization/index.js';

/**
 * @param {import('../container.js').Container} container
 * @param {{ taskId: string }} input
 */
export async function completeTask(container, input) {
  const task = await container.repositories.tasks.findById(input.taskId);
  if (!task) {
    throw new NotFoundError(`Tarefa não encontrada: ${input.taskId}`, { details: { taskId: input.taskId } });
  }

  assertOwnership(task, container.userId, 'Tarefa');

  const completed = completeTaskEntity(task, { completedAt: container.clock().toISOString() });
  await container.repositories.tasks.update(completed);
  await container.repositories.events.insert(
    createEvent({
      type: 'task.completed',
      entityType: 'TASK',
      entityId: completed.id,
      userId: container.userId,
      occurredAt: completed.completedAt,
      payload: { title: completed.title },
    }),
  );

  return { task: completed };
}

/**
 * @param {import('../container.js').Container} container
 * @param {{ taskId: string }} input
 */
export async function startTask(container, input) {
  const task = await container.repositories.tasks.findById(input.taskId);
  if (!task) {
    throw new NotFoundError(`Tarefa não encontrada: ${input.taskId}`, { details: { taskId: input.taskId } });
  }
  assertOwnership(task, container.userId, 'Tarefa');

  const started = startTaskEntity(task, { updatedAt: container.clock().toISOString() });
  await container.repositories.tasks.update(started);
  await container.repositories.events.insert(
    createEvent({
      type: 'task.started',
      entityType: 'TASK',
      entityId: started.id,
      userId: container.userId,
      occurredAt: started.updatedAt,
      payload: { title: started.title },
    }),
  );
  return { task: started };
}