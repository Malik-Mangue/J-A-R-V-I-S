/**
 * Unit tests: Task business rules (docs/README.md #6, docs/AI-CONTRACT.md #8).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignProject,
  completeTask,
  createTask,
  isOverdue,
  rescheduleTask,
  startTask,
} from '../../src/domain/tasks/task.js';

const TODAY = '2026-10-03';
const meta = { userId: 'user_test', referenceDate: TODAY, createdAt: '2026-10-03T10:00:00.000Z' };

test('a task requires an adequate temporal reference', () => {
  assert.throws(
    () => createTask({ title: 'Falar com o João' }, meta),
    (error) => error.details?.rule === 'MISSING_TEMPORAL_REFERENCE',
  );
});

test('a period is accepted as an adequate reference', () => {
  const task = createTask(
    { title: 'Terminar módulo de autenticação', period: { kind: 'NEXT_WEEK', label: 'próxima semana', start: '2026-10-05', end: '2026-10-11' } },
    meta,
  );
  assert.equal(task.deadline, null);
  assert.equal(task.period.kind, 'NEXT_WEEK');
});

test('a concrete deadline is accepted', () => {
  const task = createTask({ title: 'Terminar módulo de autenticação', deadline: '2026-10-09' }, meta);
  assert.equal(task.deadline, '2026-10-09');
});

test('a deadline in the past is rejected', () => {
  assert.throws(
    () => createTask({ title: 'Tarefa antiga', deadline: '2026-10-01' }, meta),
    (error) => error.details?.rule === 'DEADLINE_IN_PAST',
  );
});

test('an invalid date is rejected', () => {
  assert.throws(() => createTask({ title: 'X', deadline: '2026-02-31' }, meta));
});

test('an empty title is rejected', () => {
  assert.throws(() => createTask({ title: '   ', deadline: '2026-10-09' }, meta));
});

test('overdue is deterministic and ignores finished tasks', () => {
  // createTask rejects past deadlines, so the overdue case is reached by
  // advancing the reference date past a valid deadline.
  const task = createTask({ title: 'Tarefa', deadline: '2026-10-09' }, meta);
  assert.equal(isOverdue(task, '2026-10-10'), true);
  assert.equal(isOverdue(task, '2026-10-08'), false);
  assert.equal(isOverdue(completeTask(task), '2026-10-20'), false);
  assert.equal(isOverdue({ ...task, status: 'CANCELLED' }, '2026-10-20'), false);
});

test('overdue can also be caused by the end of the period', () => {
  const task = createTask(
    { title: 'Tarefa', period: { kind: 'NEXT_WEEK', label: 'próxima semana', start: '2026-10-05', end: '2026-10-11' } },
    meta,
  );
  assert.equal(isOverdue(task, '2026-10-09'), false);
  assert.equal(isOverdue(task, '2026-10-12'), true);
});

test('state transitions', () => {
  const task = createTask({ title: 'Tarefa', deadline: '2026-10-09' }, meta);
  const started = startTask(task);
  assert.equal(started.status, 'IN_PROGRESS');

  const done = completeTask(started, { completedAt: '2026-10-05T09:00:00.000Z' });
  assert.equal(done.status, 'COMPLETED');
  assert.equal(done.completedAt, '2026-10-05T09:00:00.000Z');

  assert.throws(() => completeTask(done), /já está completed/i);
});

test('rescheduling requires a temporal reference', () => {
  const task = createTask({ title: 'Tarefa', deadline: '2026-10-09' }, meta);
  assert.throws(() => rescheduleTask(task, { deadline: null }), /Reagendar/);
  assert.equal(rescheduleTask(task, { deadline: '2026-10-15' }).deadline, '2026-10-15');
});

test('project assignment can be changed or detached', () => {
  const task = createTask({ title: 'Tarefa', deadline: '2026-10-09' }, meta);
  assert.equal(assignProject(task, { projectId: 'project_1' }).projectId, 'project_1');
  assert.equal(assignProject(task, { projectId: null }).projectId, null);
});