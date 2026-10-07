/**
 * Event / audit-log repository (append-only).
 */
import { rowToEvent, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createEventRepository(db) {
  return {
    /** @param {import('../../../domain/shared/events.js').DomainEvent} event */
    async insert(event) {
      await db.query(
        `insert into events (id, user_id, type, entity_type, entity_id, occurred_at, payload)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [event.id, event.userId, event.type, event.entityType, event.entityId, event.occurredAt, toJson(event.payload)],
      );
      return event;
    },

    /** @param {string} entityType @param {string} entityId */
    async listByEntity(entityType, entityId) {
      const { rows } = await db.query(
        'select * from events where entity_type = $1 and entity_id = $2 order by occurred_at asc',
        [entityType, entityId],
      );
      return rows.map(rowToEvent);
    },

    /** @param {string} userId @param {number} [limit] */
    async listRecent(userId, limit = 50) {
      const { rows } = await db.query(
        'select * from events where user_id = $1 order by occurred_at desc limit $2',
        [userId, limit],
      );
      return rows.map(rowToEvent);
    },
  };
}
