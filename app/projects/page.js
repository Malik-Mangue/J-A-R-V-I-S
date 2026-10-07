import { getContainer } from '../../src/application/container.js';
import { formatIsoForDisplay, toIsoDate, toLocalDateParts } from '../../src/shared/dates/index.js';
import { isProjectStalled } from '../../src/domain/projects/project.js';

export const metadata = { title: 'Projetos · Personal Second Brain' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const container = await getContainer();
  const [projects, tasks] = await Promise.all([
    container.repositories.projects.listByUser(container.userId),
    container.repositories.tasks.listByUser(container.userId, { statuses: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }),
  ]);
  const today = toIsoDate(toLocalDateParts(container.clock(), container.timezone));

  return (
    <section className="card">
      <h2>Projetos ({projects.length})</h2>
      {projects.length === 0 ? (
        <p className="empty">Sem projetos. Uma ideia sobre um projeto pode ser capturada e depois confirmada.</p>
      ) : (
        projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id);
          return (
            <div key={project.id} className="item">
              <div className="item-title">
                <div>{project.name}</div>
                <div className="item-meta">
                  {project.status} · {project.progress}% · {projectTasks.length} tarefa(s)
                  {project.deadline ? ` · prazo ${formatIsoForDisplay(project.deadline)}` : ''}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className="badge" data-tone={isProjectStalled(project, today) ? 'warning' : 'success'}>
                    {isProjectStalled(project, today) ? 'sem atividade há 14+ dias' : 'ativo'}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}