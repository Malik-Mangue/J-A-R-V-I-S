/**
 * Action & Decision Inbox repository.
 */
import { rowToInboxItem, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createInboxRepository(db) {
  return {
    /** @param {import('../../../domain/inbox/inboxItem.js').InboxItem} item */
    async insert(item) {
      await db.query(
        `insert into inbox_items
           (id, user_id, type, title, description, evidence, priority, status,
            related_entity_id, related_entity_type, created_at, updated_at, snoozed_until)
         values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13)`,
        [
          item.id, item.userId, item.type, item.title, item.description, toJson(item.evidence),
          item.priority, item.status, item.relatedEntityId, item.relatedEntityType,
          item.createdAt, item.updatedAt, item.snoozedUntil,
        ],
      );
      return item;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from inbox_items where id = $1', [id]);
      return rows[0] ? rowToInboxItem(rows[0]) : null;
    },

    /** @param {import('../../../domain/inbox/inboxItem.js').InboxItem} item */
    async update(item) {
      await db.query(
        `update inbox_items set status = $2, priority = $3, description = $4,
           updated_at = $5, snoozed_until = $6
         where id = $1`,
        [item.id, item.status, item.priority, item.description, item.updatedAt, item.snoozedUntil],
      );
      return item;
    },

    /** @param {string} userId @param {string[]} [statuses] */
    async listByUser(userId, statuses = ['OPEN', 'IN_PROGRESS']) {
      const params = [userId];
      let sql = 'select * from inbox_items where user_id = $1';
      if (statuses.length > 0) {
        const placeholders = statuses.map((_, index) => `$${index + 2}`);
        sql += ` and status in (${placeholders.join(', ')})`;
        params.push(...statuses);
      }
      sql += ` order by case priority when 'HIGH' then 0 when 'MEDIUM' then 1 else 2 end, created_at desc`;
      const { rows } = await db.query(sql, params);
      return rows.map(rowToInboxItem);
    },

    /** @param {string} userId @param {string} type @param {string} entityId */
    async existsForEntity(userId, type, entityId) {
      const { rows } = await db.query(
        `select 1 from inbox_items
          where user_id = $1 and type = $2 and related_entity_id = $3 and status in ('OPEN','IN_PROGRESS')
          limit 1`,
        [userId, type, entityId],
      );
      return rows.length > 0;
    },

    /**
     * Dedup for suggestions that have no single related entity (e.g. "3 tasks
     * overdue"): identified by their inbox type. Only active items count - once
     * the user has decided (resolved / dismissed) a new detection may be queued
     * again with fresh evidence.
     * @param {string} userId @param {string} type
     */
    async existsActiveForType(userId, type) {
      const { rows } = await db.query(
        `select 1 from inbox_items
          where user_id = $1 and type = $2 and status in ('OPEN','IN_PROGRESS','SNOOZED')
          limit 1`,
        [userId, type],
      );
      return rows.length > 0;
    },
  };
}
