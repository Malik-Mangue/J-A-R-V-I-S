/**
 * Finance repository. Aggregations are computed with integer minor units in
 * SQL, never with floating point in JavaScript (docs/ARCHITECTURE.md #21).
 */
import { rowToFinanceEntry, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createFinanceRepository(db) {
  return {
    /** @param {import('../../../domain/finance/financeEntry.js').FinanceEntry} entry */
    async insert(entry) {
      await db.query(
        `insert into finance_entries
           (id, user_id, type, amount_minor, currency, category, description,
            occurred_on, source, provenance, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
        [
          entry.id, entry.userId, entry.type, entry.amountMinor, entry.currency,
          entry.category, entry.description, entry.occurredOn, entry.source,
          toJson(entry.provenance), entry.createdAt,
        ],
      );
      return entry;
    },

    /** @param {string} userId @param {{ from?: string, to?: string }} [range] */
    async listByUser(userId, range = {}) {
      const params = [userId];
      let sql = 'select * from finance_entries where user_id = $1';
      if (range.from) {
        params.push(range.from);
        sql += ` and occurred_on >= $${params.length}`;
      }
      if (range.to) {
        params.push(range.to);
        sql += ` and occurred_on <= $${params.length}`;
      }
      sql += ' order by occurred_on desc, created_at desc limit 200';
      const { rows } = await db.query(sql, params);
      return rows.map(rowToFinanceEntry);
    },

    /** @param {string} userId @param {{ from: string, to: string }} range */
    async summary(userId, range) {
      const { rows } = await db.query(
        `select type, currency, sum(amount_minor)::bigint as total, count(*)::int as entries
           from finance_entries
          where user_id = $1 and occurred_on between $2 and $3
          group by type, currency
          order by type`,
        [userId, range.from, range.to],
      );
      return rows.map((row) => ({
        type: row.type,
        currency: row.currency,
        totalMinor: Number(row.total),
        entries: row.entries,
      }));
    },

    /** @param {string} userId @param {{ from: string, to: string }} range */
    async byCategory(userId, range) {
      const { rows } = await db.query(
        `select category, sum(amount_minor)::bigint as total, count(*)::int as entries
           from finance_entries
          where user_id = $1 and type = 'EXPENSE' and occurred_on between $2 and $3
          group by category
          order by total desc`,
        [userId, range.from, range.to],
      );
      return rows.map((row) => ({
        category: row.category,
        totalMinor: Number(row.total),
        entries: row.entries,
      }));
    },
  };
}
