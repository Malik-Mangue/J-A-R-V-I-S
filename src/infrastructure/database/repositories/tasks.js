/**
 * Task repository. All SQL for tasks lives here (never in React components,
 * docs/AGENT-INSTRUCTIONS.md).
 */
import { rowToTask, toTaskRow } from './mappers.js';

const COLUMNS = [
  'id', 'user_id', 'title', 'description', 'status', 'priority', 'deadline',
  'period_kind', 'period_label', 'period_start', 'period_end', 'project_id',
  'context', 'dependencies', 'notes', 'source', 'provenance',
  'created_at', 'updated_at', 'completed_at',
];

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createTaskRepository(db) {
  return {
    /** @param {import('../../../domain/tasks/task.js').Task} task */
    async insert(task) {
      const row = toTaskRow(task);
      const placeholders = COLUMNS.map((_, index) => {
        const key = COLUMNS[index];
        if (key === 'dependencies' || key === 'provenance') return `$${index + 1}::jsonb`;
        return `$${index + 1}`;
      });
      const values = COLUMNS.map((key) => row[key]);
      await db.query(
        `insert into tasks (${COLUMNS.join(', ')}) values (${placeholders.join(', ')})`,
        values,
      );
      return task;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from tasks where id = $1', [id]);
      return rows[0] ? rowToTask(rows[0]) : null;
    },

    /** @param {import('../../../domain/tasks/task.js').Task} task */
    async update(task) {
      const row = toTaskRow(task);
      await db.query(
        `update tasks set
           title = $2, description = $3, status = $4, priority = $5, deadline = $6,
           period_kind = $7, period_label = $8, period_start = $9, period_end = $10,
           project_id = $11, context = $12, dependencies = $13::jsonb, notes = $14,
           source = $15, provenance = $16::jsonb, updated_at = $17, completed_at = $18
         where id = $1`,
        [
          row.id, row.title, row.description, row.status, row.priority, row.deadline,
          row.period_kind, row.period_label, row.period_start, row.period_end,
          row.project_id, row.context, row.dependencies, row.notes,
          row.source, row.provenance, row.updated_at, row.completed_at,
        ],
      );
      return task;
    },

    /** @param {string} userId @param {{ statuses?: string[] }} [options] */
    async listByUser(userId, options = {}) {
      const statuses = options.statuses ?? null;
      const params = [userId];
      let sql = 'select * from tasks where user_id = $1';
      if (statuses && statuses.length > 0) {
        // Build an explicit IN list: works identically on pg and PGlite.
        const placeholders = statuses.map((_, index) => `$${index + 2}`);
        sql += ` and status in (${placeholders.join(', ')})`;
        params.push(...statuses);
      }
      sql += ' order by coalesce(deadline, period_end) asc nulls last, created_at desc';
      const { rows } = await db.query(sql, params);
      return rows.map(rowToTask);
    },

    /** Tasks whose deadline or period end is on/before a date and not finished. */
    /** @param {string} userId @param {string} isoDate */
    async listDueOnOrBefore(userId, isoDate) {
      const { rows } = await db.query(
        `select * from tasks
          where user_id = $1
            and status in ('PENDING','IN_PROGRESS','BLOCKED')
            and coalesce(deadline, period_end) is not null
            and coalesce(deadline, period_end) <= $2
          order by coalesce(deadline, period_end) asc`,
        [userId, isoDate],
      );
      return rows.map(rowToTask);
    },

    /** @param {string} userId @param {string} startIso @param {string} endIso */
    async listInRange(userId, startIso, endIso) {
      const { rows } = await db.query(
        `select * from tasks
          where user_id = $1
            and coalesce(deadline, period_end) between $2 and $3
          order by coalesce(deadline, period_end) asc`,
        [userId, startIso, endIso],
      );
      return rows.map(rowToTask);
    },

    /** @param {string} userId */
    async countByStatus(userId) {
      const { rows } = await db.query(
        'select status, count(*)::int as total from tasks where user_id = $1 group by status',
        [userId],
      );
      return rows.reduce((acc, row) => ({ ...acc, [row.status]: row.total }), {});
    },

    /** @param {string} userId @param {string} query */
    async searchByTitle(userId, query) {
      const { rows } = await db.query(
        `select * from tasks
          where user_id = $1 and title ilike '%' || $2 || '%'
          order by created_at desc limit 20`,
        [userId, query],
      );
      return rows.map(rowToTask);
    },
  };
}
