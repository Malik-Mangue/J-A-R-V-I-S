import Link from 'next/link';
import { getContainer } from '../src/application/container.js';
import { getDashboard } from '../src/application/dashboard/getDashboard.js';
import { formatIsoForDisplay } from '../src/shared/dates/index.js';
import { formatMinor } from '../src/domain/finance/money.js';
import { describeProposal } from '../src/application/proposal/preview.js';
import { completeTaskAction } from './actions/capture.js';

/**
 * Homepage = command centre (docs/ARCHITECTURE.md #16).
 *
 * All composition happens in the Dashboard Service; this component only renders
 * the resulting view model.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const container = await getContainer();
  const dashboard = await getDashboard(container);
  const financeCurrency = dashboard.finance.summary[0]?.currency ?? container.defaultCurrency ?? 'MZN';

  return (
    <>
      <section className="card">
        <div className="counters">
          <div className="counter">
            <div className="value">{dashboard.counts.openTasks}</div>
            <div className="label">Abertas</div>
          </div>
          <div className="counter">
            <div className="value">{dashboard.counts.overdueTasks}</div>
            <div className="label">Em atraso</div>
          </div>
          <div className="counter">
            <div className="value">{dashboard.counts.activeProjects}</div>
            <div className="label">Projetos</div>
          </div>
          <div className="counter">
            <div className="value">{dashboard.counts.openInboxItems}</div>
            <div className="label">Inbox</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Precisa de atenção</h2>
        {dashboard.todayView.overdue.length === 0 && dashboard.todayView.tasks.length === 0 ? (
          <p className="empty">Nada em atraso nem para hoje. Bom trabalho.</p>
        ) : (
          dashboard.todayView.overdue.map((task) => <TaskRow key={task.id} task={task} overdue />)
        )}
        {dashboard.todayView.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </section>

      <section className="card">
        <h2>Esta semana</h2>
        <p className="item-meta">
          {formatIsoForDisplay(dashboard.week.start)} — {formatIsoForDisplay(dashboard.week.end)}
        </p>
        {dashboard.weekView.tasks.length === 0 ? (
          <p className="empty">Sem tarefas planeadas para esta semana.</p>
        ) : (
          dashboard.weekView.tasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </section>

      <section className="card">
        <h2>Finanças deste mês</h2>
        <div className="counters">
          <div className="counter">
            <div className="value">{formatMinor(totalMinor(dashboard.finance.summary, 'INCOME'), financeCurrency)}</div>
            <div className="label">Receitas</div>
          </div>
          <div className="counter">
            <div className="value">{formatMinor(totalMinor(dashboard.finance.summary, 'EXPENSE'), financeCurrency)}</div>
            <div className="label">Despesas</div>
          </div>
          <div className="counter">
            <div className="value">
              {formatMinor(
                totalMinor(dashboard.finance.summary, 'INCOME') - totalMinor(dashboard.finance.summary, 'EXPENSE'),
                financeCurrency,
              )}
            </div>
            <div className="label">Saldo</div>
          </div>
        </div>
        <p className="item-meta">
          <Link href="/finance">Ver movimentos</Link>
        </p>
      </section>

      <section className="card">
        <h2>Sugestões</h2>
        {dashboard.suggestions.length === 0 ? (
          <p className="empty">Sem observações por agora.</p>
        ) : (
          dashboard.suggestions.map((suggestion) => (
            <div key={suggestion.id} className="item">
              <div className="item-title">
                <span className="badge" data-tone={suggestion.priority === 'HIGH' ? 'danger' : 'warning'}>
                  {suggestion.category}
                </span>
                <div style={{ marginTop: 4 }}>{suggestion.title}</div>
                <div className="item-meta">{suggestion.observation}</div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Por confirmar</h2>
        {dashboard.pendingProposals.length === 0 ? (
          <p className="empty">Não há propostas pendentes.</p>
        ) : (
          dashboard.pendingProposals.map((proposal) => {
            const summary = describeProposal(proposal.intent, proposal.payload);
            return (
              <div key={proposal.id} className="item">
                <div className="item-title">
                  <span className="badge">{summary.entity}</span>
                  <div style={{ marginTop: 4 }}>
                    {summary.fields.map((field) => field.value).join(' · ') || 'Sem detalhe'}
                  </div>
                </div>
                <Link className="badge" href={`/capture?proposal=${proposal.id}`}>
                  rever
                </Link>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

function TaskRow({ task, overdue = false }) {
  const when = task.deadline ?? task.period?.label ?? null;
  return (
    <div className="item">
      <div className="item-title">
        <div>{task.title}</div>
        <div className="item-meta">
          {when ? formatWhen(when) : 'sem data'}
          {overdue ? ' · em atraso' : ''}
        </div>
      </div>
      <form action={completeTaskAction}>
        <input type="hidden" name="taskId" value={task.id} />
        <button type="submit" className="danger" aria-label={`Concluir ${task.title}`}>
          ✓
        </button>
      </form>
    </div>
  );
}

function formatWhen(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatIsoForDisplay(value) : value;
}

/** Sum of a summary row type (rows are integer minor units, never floats). */
function totalMinor(summary, type) {
  return summary.filter((row) => row.type === type).reduce((acc, row) => acc + row.totalMinor, 0);
}