/**
 * Idea repository.
 */
import { rowToIdea, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createIdeaRepository(db) {
  return {
    /** @param {import('../../../domain/ideas/idea.js').Idea} idea */
    async insert(idea) {
      await db.query(
        `insert into ideas
           (id, user_id, title, description, context, project_id, status, source,
            provenance, created_at, updated_at, converted_to_id, converted_to_type)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`,
        [
          idea.id, idea.userId, idea.title, idea.description, idea.context, idea.projectId,
          idea.status, idea.source, toJson(idea.provenance), idea.createdAt, idea.updatedAt,
          idea.convertedToId, idea.convertedToType,
        ],
      );
      return idea;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from ideas where id = $1', [id]);
      return rows[0] ? rowToIdea(rows[0]) : null;
    },

    /** @param {import('../../../domain/ideas/idea.js').Idea} idea */
    async update(idea) {
      await db.query(
        `update ideas set
           title = $2, description = $3, context = $4, project_id = $5, status = $6,
           provenance = $7::jsonb, updated_at = $8, converted_to_id = $9, converted_to_type = $10
         where id = $1`,
        [
          idea.id, idea.title, idea.description, idea.context, idea.projectId, idea.status,
          toJson(idea.provenance), idea.updatedAt, idea.convertedToId, idea.convertedToType,
        ],
      );
      return idea;
    },

    /** @param {string} userId */
    async listByUser(userId) {
      const { rows } = await db.query(
        'select * from ideas where user_id = $1 order by created_at desc',
        [userId],
      );
      return rows.map(rowToIdea);
    },
  };
}
