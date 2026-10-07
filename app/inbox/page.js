import { getContainer } from '../../src/application/container.js';
import { INBOX_STATUS } from '../../src/domain/shared/constants.js';
import InboxItemActions from '../../components/inbox/InboxItemActions.js';
import AnalyzeButton from '../../components/inbox/AnalyzeButton.js';

export const metadata = { title: 'Inbox · Personal Second Brain' };
export const dynamic = 'force-dynamic';

/**
 * Action & Decision Inbox.
 *
 * The Inbox is NOT a task list: it holds things that require attention or a
 * decision (docs/SYSTEM-PROMPT.md). Every item carries its evidence. Filtering
 * by status is explicit: the default view shows only what still needs a
 * decision.
 */
const VIEWS = [
  { status: INBOX_STATUS.OPEN, label: 'Abertos' },
  { status: INBOX_STATUS.SNOOZED, label: 'Adiados' },
  { status: INBOX_STATUS.RESOLVED, label: 'Tratados' },
  { status: INBOX_STATUS.DISMISSED, label: 'Dispensados' },
  { status: 'ALL', label: 'Todos' },
];

export default async function InboxPage({ searchParams }) {
  const params = await searchParams;
  const requested = String(params?.status ?? INBOX_STATUS.OPEN).toUpperCase();
  const status = VIEWS.some((view) => view.status === requested) ? requested : INBOX_STATUS.OPEN;

  const container = await getContainer();
  const statuses = status === 'ALL' ? VIEWS.slice(0, -1).map((view) => view.status) : [status];
  const items = await container.repositories.inbox.listByUser(container.userId, statuses);

  return (
    <>
      <section className="card">
        <div className="row" style={{ alignItems: 'center' }}>
          <h2 style={{ flex: 1 }}>Inbox ({items.length})</h2>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {VIEWS.map((view) => (
            <a
              key={view.status}
              className="badge"
              href={`/inbox?status=${view.status}`}
              aria-current={status === view.status ? 'page' : undefined}
              style={status === view.status ? { textDecoration: 'underline' } : undefined}
            >
              {view.label}
            </a>
          ))}
        </div>
        <AnalyzeButton />
        <p className="item-meta">
          A análise automática está desligada por omissão. Para a activar, define a automação “Sugestões” em
          Definições.
        </p>

        {items.length === 0 ? (
          <p className="empty">Nada nesta vista.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="item">
              <div className="item-title">
                <span className="badge" data-tone={item.priority === 'HIGH' ? 'danger' : undefined}>
                  {item.type}
                </span>
                <div style={{ marginTop: 4 }}>{item.title}</div>
                {item.description ? <div className="item-meta">{item.description}</div> : null}
                {item.evidence?.length > 0 && (
                  <div className="item-meta">
                    Evidência: {item.evidence.map((evidence) => `${evidence.type}:${evidence.id}`).join(', ')}
                  </div>
                )}

                <InboxItemActions item={item} />
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}