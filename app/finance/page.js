import { getContainer } from '../../src/application/container.js';
import { toIsoDate, toLocalDateParts, startOfMonth, endOfMonth } from '../../src/shared/dates/index.js';
import { formatMinor } from '../../src/domain/finance/money.js';

export const metadata = { title: 'Finanças · Personal Second Brain' };
export const dynamic = 'force-dynamic';

/**
 * Finance overview. Amounts are integer minor units all the way from the
 * database to this component (docs/ARCHITECTURE.md #21).
 */
export default async function FinancePage() {
  const container = await getContainer();
  const today = toIsoDate(toLocalDateParts(container.clock(), container.timezone));
  const parts = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)), day: Number(today.slice(8, 10)) };
  const range = { from: toIsoDate(startOfMonth(parts)), to: toIsoDate(endOfMonth(parts)) };

  const [entries, summary, byCategory] = await Promise.all([
    container.repositories.finance.listByUser(container.userId, range),
    container.repositories.finance.summary(container.userId, range),
    container.repositories.finance.byCategory(container.userId, range),
  ]);

  const total = (type) =>
    summary.filter((row) => row.type === type).reduce((acc, row) => acc + row.totalMinor, 0);
  const currency = summary[0]?.currency ?? 'MZN';

  return (
    <>
      <section className="card">
        <h2>Este mês ({range.from} → {range.to})</h2>
        <div className="counters">
          <div className="counter">
            <div className="value">{formatMinor(total('INCOME'), currency)}</div>
            <div className="label">Receitas</div>
          </div>
          <div className="counter">
            <div className="value">{formatMinor(total('EXPENSE'), currency)}</div>
            <div className="label">Despesas</div>
          </div>
          <div className="counter">
            <div className="value">{formatMinor(total('INCOME') - total('EXPENSE'), currency)}</div>
            <div className="label">Saldo</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Despesas por categoria</h2>
        {byCategory.length === 0 ? (
          <p className="empty">Sem despesas registadas este mês.</p>
        ) : (
          byCategory.map((row) => (
            <div key={row.category} className="item">
              <div className="item-title">
                <div>{row.category}</div>
                <div className="item-meta">{row.entries} registo(s)</div>
              </div>
              <span className="badge">{formatMinor(row.totalMinor, currency)}</span>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Movimentos ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="empty">Sem movimentos neste período.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="item">
              <div className="item-title">
                <div>{entry.description ?? entry.category}</div>
                <div className="item-meta">
                  {entry.occurredOn} · {entry.category}
                </div>
              </div>
              <span className="badge" data-tone={entry.type === 'EXPENSE' ? 'danger' : 'success'}>
                {entry.type === 'EXPENSE' ? '−' : '+'}
                {formatMinor(entry.amountMinor, entry.currency)}
              </span>
            </div>
          ))
        )}
      </section>
    </>
  );
}