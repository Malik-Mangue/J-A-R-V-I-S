import { getContainer } from '../../src/application/container.js';
import { formatIsoForDisplay } from '../../src/shared/dates/index.js';
import { TASK_STATUS } from '../../src/domain/shared/constants.js';
import { completeTaskAction } from '../actions/capture.js';

export const metadata = { title: 'Tarefas · Personal Second Brain' };
export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const container = await getContainer();
  const tasks = await container.repositories.tasks.listByUser(container.userId);

  const open = tasks.filter((task) => task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.CANCELLED);
  const done = tasks.filter((task) => task.status === TASK_STATUS.COMPLETED);

  return (
    <>
      <section className="card">
        <h2>Abertas ({open.length})</h2>
        {open.length === 0 ? (
          <p className="empty">Sem tarefas abertas. Captura algo novo para começares.</p>
        ) : (
          open.map((task) => (
            <div key={task.id} className="item">
              <div className="item-title">
                <div>{task.title}</div>
                <div className="item-meta">
                  {task.deadline ? formatIsoForDisplay(task.deadline) : (task.period?.label ?? 'sem data')} ·{' '}
                  {task.priority}
                </div>
              </div>
              <form action={completeTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <button type="submit" className="danger" aria-label={`Concluir ${task.title}`}>
                  ✓
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Concluídas ({done.length})</h2>
        {done.length === 0 ? (
          <p className="empty">Ainda não há tarefas concluídas.</p>
        ) : (
          done.map((task) => (
            <div key={task.id} className="item">
              <div className="item-title">
                <div style={{ textDecoration: 'line-through', opacity: 0.7 }}>{task.title}</div>
                <div className="item-meta">concluída</div>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}